import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductionLogDto } from './dto/create-production-log.dto';
import { BulkProductionLogDto } from './dto/bulk-production-log.dto';

// ---------------------------------------------------------------------------
// Helper – parse date string to a Date at midnight UTC.
// Prisma @db.Date fields store date-only values; passing a full ISO timestamp
// would include the time part and break date-equality comparisons.
// ---------------------------------------------------------------------------
function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// ---------------------------------------------------------------------------
// Helper – return today as YYYY-MM-DD in UTC
// ---------------------------------------------------------------------------
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
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

    const log = await this.prisma.productionLog.create({
      data: {
        stationId: dto.stationId,
        productId: dto.productId,
        quantityProduced: dto.quantityProduced,
        date: parseDateOnly(dto.date),
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
        this.prisma.productionLog.create({
          data: {
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
    const targetDate = dateStr ?? todayUtc();
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
    const targetDate = dateStr ?? todayUtc();
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
}
