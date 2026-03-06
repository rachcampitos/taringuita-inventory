import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductionLogDto } from './dto/create-production-log.dto';
import { BulkProductionLogDto } from './dto/bulk-production-log.dto';
import { CreateTransformationDto } from './dto/create-transformation.dto';

// ---------------------------------------------------------------------------
// Helper – parse date string to a Date at midnight UTC.
// Prisma @db.Date fields store date-only values; passing a full ISO timestamp
// would include the time part and break date-equality comparisons.
// ---------------------------------------------------------------------------
function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// ---------------------------------------------------------------------------
// Helper – return today as YYYY-MM-DD in Chile timezone (UTC-3/4)
// ---------------------------------------------------------------------------
function todayLocal(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // POST /production/log
  // Submit a single production log entry
  // --------------------------------------------------------------------------

  async logProduction(dto: CreateProductionLogDto, userId: string) {
    await this.assertUserCanSubmitToStation(userId, dto.stationId);

    const date = parseDateOnly(dto.date);

    const log = await this.prisma.productionLog.upsert({
      where: {
        stationId_productId_date: {
          stationId: dto.stationId,
          productId: dto.productId,
          date,
        },
      },
      update: {
        quantityProduced: dto.quantityProduced,
        notes: dto.notes,
        userId,
      },
      create: {
        stationId: dto.stationId,
        productId: dto.productId,
        quantityProduced: dto.quantityProduced,
        date,
        notes: dto.notes,
        userId,
      },
      select: {
        id: true,
        stationId: true,
        productId: true,
        quantityProduced: true,
        date: true,
        notes: true,
        userId: true,
        createdAt: true,
      },
    });

    return { ...log, quantityProduced: Number(log.quantityProduced) };
  }

  // --------------------------------------------------------------------------
  // POST /production/log/bulk
  // Submit multiple production log entries in a single transaction
  // --------------------------------------------------------------------------

  async logBulkProduction(dto: BulkProductionLogDto, userId: string) {
    await this.assertUserCanSubmitToStation(userId, dto.stationId);

    const date = parseDateOnly(dto.date);

    const logs = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.productionLog.upsert({
          where: {
            stationId_productId_date: {
              stationId: dto.stationId,
              productId: item.productId,
              date,
            },
          },
          update: {
            quantityProduced: item.quantityProduced,
            notes: item.notes,
            userId,
          },
          create: {
            stationId: dto.stationId,
            productId: item.productId,
            quantityProduced: item.quantityProduced,
            date,
            notes: item.notes,
            userId,
          },
          select: {
            id: true,
            productId: true,
            quantityProduced: true,
            notes: true,
          },
        }),
      ),
    );

    return {
      stationId: dto.stationId,
      date: dto.date,
      saved: logs.length,
      items: logs.map((l) => ({ ...l, quantityProduced: Number(l.quantityProduced) })),
    };
  }

  // --------------------------------------------------------------------------
  // GET /production/station/:stationId?date=YYYY-MM-DD
  // Production logs for a station on a given date (defaults to today).
  // Includes product info (name, code, category).
  // --------------------------------------------------------------------------

  async getStationLogs(stationId: string, dateStr?: string) {
    const targetDate = dateStr ?? todayLocal();
    const date = parseDateOnly(targetDate);

    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { id: true, name: true },
    });

    if (!station) {
      throw new NotFoundException(`Estacion con id "${stationId}" no encontrada`);
    }

    const logs = await this.prisma.productionLog.findMany({
      where: { stationId, date },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        quantityProduced: true,
        notes: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            category: { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, name: true } },
      },
    });

    return {
      stationId: station.id,
      stationName: station.name,
      date: targetDate,
      total: logs.length,
      logs: logs.map((l) => ({ ...l, quantityProduced: Number(l.quantityProduced) })),
    };
  }

  // --------------------------------------------------------------------------
  // GET /production/station/:stationId/history?from=&to=
  // Production history for a station over a date range
  // --------------------------------------------------------------------------

  async getStationHistory(stationId: string, from: string, to: string) {
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { id: true, name: true },
    });

    if (!station) {
      throw new NotFoundException(`Estacion con id "${stationId}" no encontrada`);
    }

    const logs = await this.prisma.productionLog.findMany({
      where: {
        stationId,
        date: { gte: parseDateOnly(from), lte: parseDateOnly(to) },
      },
      orderBy: [{ date: 'desc' }, { product: { name: 'asc' } }],
      select: {
        id: true,
        date: true,
        quantityProduced: true,
        notes: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            category: { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, name: true } },
      },
    });

    return {
      stationId: station.id,
      stationName: station.name,
      from,
      to,
      total: logs.length,
      logs: logs.map((l) => ({ ...l, quantityProduced: Number(l.quantityProduced) })),
    };
  }

  // --------------------------------------------------------------------------
  // GET /production/summary?date=YYYY-MM-DD
  // Admin: total production by station for the day.
  // Returns [{ station, items: [{ product, quantityProduced }], totalItems }]
  // --------------------------------------------------------------------------

  async getDailySummary(userId: string, dateStr?: string) {
    const targetDate = dateStr ?? todayLocal();
    const date = parseDateOnly(targetDate);
    const organizationId = await this.resolveOrganizationId(userId);

    const logs = await this.prisma.productionLog.findMany({
      where: {
        date,
        station: { location: { organizationId } },
      },
      orderBy: [{ station: { name: 'asc' } }, { product: { name: 'asc' } }],
      select: {
        quantityProduced: true,
        station: { select: { id: true, name: true } },
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Group by station
    const stationMap = new Map<
      string,
      {
        station: { id: string; name: string };
        items: { product: { id: string; code: string; name: string; category: { id: string; name: string } }; quantityProduced: number }[];
      }
    >();

    for (const log of logs) {
      const stationId = log.station.id;

      if (!stationMap.has(stationId)) {
        stationMap.set(stationId, { station: log.station, items: [] });
      }

      stationMap.get(stationId)!.items.push({
        product: log.product,
        quantityProduced: Number(log.quantityProduced),
      });
    }

    const summary = [...stationMap.values()].map((entry) => ({
      station: entry.station,
      items: entry.items,
      totalItems: entry.items.length,
    }));

    return {
      date: targetDate,
      totalStations: summary.length,
      summary,
    };
  }

  // --------------------------------------------------------------------------
  // POST /production/transformation
  // Register a production transformation (raw input -> portioned outputs)
  // --------------------------------------------------------------------------

  async createTransformation(dto: CreateTransformationDto, userId: string) {
    await this.assertUserCanTransform(userId);

    const outputSum = dto.outputs.reduce((sum, o) => sum + o.quantity, 0);

    if (outputSum > dto.inputQuantity) {
      throw new BadRequestException(
        `La suma de salidas (${outputSum}) no puede superar la cantidad de entrada (${dto.inputQuantity})`,
      );
    }

    const mermaQuantity = Number((dto.inputQuantity - outputSum).toFixed(2));
    const mermaPercent = Number(((mermaQuantity / dto.inputQuantity) * 100).toFixed(2));
    const date = parseDateOnly(dto.date);

    const almacenamiento = await this.findAlmacenamientoStation();

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const transformation = await tx.productionTransformation.create({
        data: {
          inputProductId: dto.inputProductId,
          inputQuantity: dto.inputQuantity,
          mermaQuantity,
          mermaPercent,
          date,
          notes: dto.notes,
          recipeId: dto.recipeId,
          userId,
          outputs: {
            create: dto.outputs.map((o) => ({
              outputProductId: o.outputProductId,
              quantity: o.quantity,
            })),
          },
        },
        select: TRANSFORMATION_DETAIL_SELECT,
      });

      for (const output of dto.outputs) {
        const existing = await tx.inventoryCount.findUnique({
          where: {
            stationId_productId_date: {
              stationId: almacenamiento.id,
              productId: output.outputProductId,
              date,
            },
          },
        });

        if (existing) {
          await tx.inventoryCount.update({
            where: { id: existing.id },
            data: {
              quantity: { increment: output.quantity },
              userId,
            },
          });
        } else {
          await tx.inventoryCount.create({
            data: {
              stationId: almacenamiento.id,
              productId: output.outputProductId,
              quantity: output.quantity,
              date,
              userId,
            },
          });
        }
      }

      return transformation;
    });

    return this.serializeTransformation(result);
  }

  // --------------------------------------------------------------------------
  // GET /production/transformations?date=YYYY-MM-DD
  // List transformations for a date (defaults to today)
  // --------------------------------------------------------------------------

  async getTransformations(dateStr?: string) {
    const targetDate = dateStr ?? todayLocal();
    const date = parseDateOnly(targetDate);

    const transformations = await this.prisma.productionTransformation.findMany({
      where: { date },
      orderBy: { createdAt: 'desc' },
      select: TRANSFORMATION_DETAIL_SELECT,
    });

    return {
      date: targetDate,
      total: transformations.length,
      transformations: transformations.map((t) => this.serializeTransformation(t)),
    };
  }

  // --------------------------------------------------------------------------
  // GET /production/transformation/:id
  // Get a single transformation by ID
  // --------------------------------------------------------------------------

  async getTransformationById(id: string) {
    const transformation = await this.prisma.productionTransformation.findUnique({
      where: { id },
      select: TRANSFORMATION_DETAIL_SELECT,
    });

    if (!transformation) {
      throw new NotFoundException(`Transformacion con id "${id}" no encontrada`);
    }

    return this.serializeTransformation(transformation);
  }

  // --------------------------------------------------------------------------
  // GET /production/transformation/summary?date=YYYY-MM-DD
  // Summary of transformations for a date
  // --------------------------------------------------------------------------

  async getTransformationSummary(dateStr?: string) {
    const targetDate = dateStr ?? todayLocal();
    const date = parseDateOnly(targetDate);

    const transformations = await this.prisma.productionTransformation.findMany({
      where: { date },
      select: {
        inputQuantity: true,
        mermaQuantity: true,
        mermaPercent: true,
        inputProduct: { select: { id: true, code: true, name: true } },
        outputs: { select: { quantity: true } },
      },
    });

    let totalInputKg = 0;
    let totalOutputKg = 0;
    let totalMermaKg = 0;

    const byProductMap = new Map<string, {
      product: { id: string; code: string; name: string };
      totalInput: number;
      totalOutput: number;
      totalMerma: number;
      count: number;
    }>();

    for (const t of transformations) {
      const input = Number(t.inputQuantity);
      const merma = Number(t.mermaQuantity);
      const output = t.outputs.reduce((s, o) => s + Number(o.quantity), 0);

      totalInputKg += input;
      totalOutputKg += output;
      totalMermaKg += merma;

      const pid = t.inputProduct.id;
      if (!byProductMap.has(pid)) {
        byProductMap.set(pid, {
          product: t.inputProduct,
          totalInput: 0,
          totalOutput: 0,
          totalMerma: 0,
          count: 0,
        });
      }

      const entry = byProductMap.get(pid)!;
      entry.totalInput += input;
      entry.totalOutput += output;
      entry.totalMerma += merma;
      entry.count += 1;
    }

    const avgMermaPercent = totalInputKg > 0
      ? Number(((totalMermaKg / totalInputKg) * 100).toFixed(2))
      : 0;

    return {
      date: targetDate,
      totalTransformations: transformations.length,
      totalInputKg: Number(totalInputKg.toFixed(2)),
      totalOutputKg: Number(totalOutputKg.toFixed(2)),
      totalMermaKg: Number(totalMermaKg.toFixed(2)),
      avgMermaPercent,
      byProduct: [...byProductMap.values()].map((e) => ({
        product: e.product,
        totalInput: Number(e.totalInput.toFixed(2)),
        totalOutput: Number(e.totalOutput.toFixed(2)),
        totalMerma: Number(e.totalMerma.toFixed(2)),
        avgMermaPercent: e.totalInput > 0
          ? Number(((e.totalMerma / e.totalInput) * 100).toFixed(2))
          : 0,
        count: e.count,
      })),
    };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private async resolveOrganizationId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id "${userId}" no encontrado`);
    }

    return user.organizationId;
  }

  /**
   * ADMIN can submit to any station.
   * HEAD_CHEF and SOUS_CHEF can only submit to stations they are assigned to.
   */
  private async assertUserCanSubmitToStation(
    userId: string,
    stationId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        stations: { where: { stationId }, select: { stationId: true } },
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id "${userId}" no encontrado`);
    }

    if (user.role === Role.ADMIN) {
      const station = await this.prisma.station.findUnique({
        where: { id: stationId },
        select: { id: true },
      });

      if (!station) {
        throw new NotFoundException(`Estacion con id "${stationId}" no encontrada`);
      }

      return;
    }

    if (user.stations.length === 0) {
      throw new ForbiddenException(
        `No tienes permiso para registrar produccion en la estacion "${stationId}"`,
      );
    }
  }

  /**
   * ADMIN can always transform.
   * Other roles must be assigned to the "produccion" station.
   */
  private async assertUserCanTransform(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        stations: {
          select: { station: { select: { name: true } } },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id "${userId}" no encontrado`);
    }

    if (user.role === Role.ADMIN) return;

    const hasProduccion = user.stations.some(
      (us) => us.station.name.toLowerCase() === 'produccion',
    );

    if (!hasProduccion) {
      throw new ForbiddenException(
        'No tienes permiso para registrar transformaciones. Requiere acceso a la estacion "produccion".',
      );
    }
  }

  private async findAlmacenamientoStation() {
    const station = await this.prisma.station.findFirst({
      where: { name: { equals: 'almacenamiento', mode: 'insensitive' } },
      select: { id: true, name: true },
    });

    if (!station) {
      throw new NotFoundException(
        'No se encontro la estacion "almacenamiento". Debe existir para registrar transformaciones.',
      );
    }

    return station;
  }

  private serializeTransformation(t: {
    id: string;
    inputQuantity: unknown;
    mermaQuantity: unknown;
    mermaPercent: unknown;
    date: unknown;
    notes: string | null;
    createdAt: unknown;
    inputProduct: { id: string; code: string; name: string; unitOfMeasure: string };
    recipe: { id: string; name: string } | null;
    user: { id: string; name: string };
    outputs: { id: string; quantity: unknown; outputProduct: { id: string; code: string; name: string; unitOfMeasure: string } }[];
  }) {
    return {
      ...t,
      inputQuantity: Number(t.inputQuantity),
      mermaQuantity: Number(t.mermaQuantity),
      mermaPercent: Number(t.mermaPercent),
      outputs: t.outputs.map((o) => ({
        ...o,
        quantity: Number(o.quantity),
      })),
    };
  }
}

// ---------------------------------------------------------------------------
// Select constants
// ---------------------------------------------------------------------------
const TRANSFORMATION_DETAIL_SELECT = {
  id: true,
  inputQuantity: true,
  mermaQuantity: true,
  mermaPercent: true,
  date: true,
  notes: true,
  createdAt: true,
  inputProduct: { select: { id: true, code: true, name: true, unitOfMeasure: true } },
  recipe: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
  outputs: {
    select: {
      id: true,
      quantity: true,
      outputProduct: { select: { id: true, code: true, name: true, unitOfMeasure: true } },
    },
  },
};
