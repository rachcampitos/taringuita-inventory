import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryCountDto } from './dto/create-inventory-count.dto';
import { BulkInventoryCountDto } from './dto/bulk-inventory-count.dto';

// ---------------------------------------------------------------------------
// Helper – parse date string to a Date at midnight UTC.
// Prisma @db.Date fields store date-only values; passing a full ISO timestamp
// would include the time part and break the unique constraint comparisons.
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
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Submit a single inventory count (upsert on stationId + productId + date)
  // --------------------------------------------------------------------------

  async submitCount(dto: CreateInventoryCountDto, userId: string) {
    await this.assertUserCanSubmitToStation(userId, dto.stationId);

    const date = parseDateOnly(dto.date);

    return this.prisma.inventoryCount.upsert({
      where: {
        stationId_productId_date: {
          stationId: dto.stationId,
          productId: dto.productId,
          date,
        },
      },
      create: {
        stationId: dto.stationId,
        productId: dto.productId,
        quantity: dto.quantity,
        date,
        notes: dto.notes,
        userId,
      },
      update: {
        quantity: dto.quantity,
        notes: dto.notes,
        userId,
      },
      select: {
        id: true,
        stationId: true,
        productId: true,
        quantity: true,
        date: true,
        notes: true,
        userId: true,
        createdAt: true,
      },
    });
  }

  // --------------------------------------------------------------------------
  // Bulk submit – all products for a station in a single transaction
  // --------------------------------------------------------------------------

  async submitBulkCount(dto: BulkInventoryCountDto, userId: string) {
    await this.assertUserCanSubmitToStation(userId, dto.stationId);

    const date = parseDateOnly(dto.date);

    const results = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.inventoryCount.upsert({
          where: {
            stationId_productId_date: {
              stationId: dto.stationId,
              productId: item.productId,
              date,
            },
          },
          create: {
            stationId: dto.stationId,
            productId: item.productId,
            quantity: item.quantity,
            date,
            notes: item.notes,
            userId,
          },
          update: {
            quantity: item.quantity,
            notes: item.notes,
            userId,
          },
          select: {
            id: true,
            productId: true,
            quantity: true,
            notes: true,
          },
        }),
      ),
    );

    return {
      stationId: dto.stationId,
      date: dto.date,
      saved: results.length,
      items: results,
    };
  }

  // --------------------------------------------------------------------------
  // GET /inventory/station/:stationId?date=YYYY-MM-DD
  // Returns all station products grouped by category, with counted quantity
  // (null if the product has not been counted yet for that date).
  // --------------------------------------------------------------------------

  async getStationCounts(stationId: string, dateStr?: string) {
    const targetDate = dateStr ?? todayLocal();
    const date = parseDateOnly(targetDate);

    // Verify station exists
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { id: true, name: true },
    });

    if (!station) {
      throw new NotFoundException(`Estacion con id "${stationId}" no encontrada`);
    }

    // Load all products assigned to this station with category info
    const stationProducts = await this.prisma.stationProduct.findMany({
      where: { stationId },
      orderBy: [{ product: { category: { sortOrder: 'asc' } } }, { sortOrder: 'asc' }],
      select: {
        sortOrder: true,
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            unitOfMeasure: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Load existing counts for the given date in a single query
    const counts = await this.prisma.inventoryCount.findMany({
      where: { stationId, date },
      select: {
        productId: true,
        quantity: true,
        notes: true,
        userId: true,
        user: { select: { id: true, name: true } },
      },
    });

    const countMap = new Map(counts.map((c) => [c.productId, c]));

    // Group products by category
    const categoriesMap = new Map<
      string,
      {
        category: { id: string; name: string };
        products: {
          id: string;
          code: string;
          name: string;
          unitOfMeasure: string;
          sortOrder: number;
          countedQuantity: number | null;
          notes: string | null;
          countedBy: { id: string; name: string } | null;
        }[];
      }
    >();

    for (const sp of stationProducts) {
      const { product, sortOrder } = sp;
      const catId = product.category.id;

      if (!categoriesMap.has(catId)) {
        categoriesMap.set(catId, { category: product.category, products: [] });
      }

      const count = countMap.get(product.id);

      categoriesMap.get(catId)!.products.push({
        id: product.id,
        code: product.code,
        name: product.name,
        unitOfMeasure: product.unitOfMeasure,
        sortOrder,
        countedQuantity: count ? Number(count.quantity) : null,
        notes: count?.notes ?? null,
        countedBy: count?.user ?? null,
      });
    }

    const totalProducts = stationProducts.length;
    const countedProducts = countMap.size;

    return {
      stationId: station.id,
      stationName: station.name,
      date: targetDate,
      totalProducts,
      countedProducts,
      isComplete: countedProducts === totalProducts && totalProducts > 0,
      categories: [...categoriesMap.values()],
    };
  }

  // --------------------------------------------------------------------------
  // GET /inventory/station/:stationId/history?from=&to=
  // --------------------------------------------------------------------------

  async getStationHistory(stationId: string, from: string, to: string) {
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { id: true, name: true },
    });

    if (!station) {
      throw new NotFoundException(`Estacion con id "${stationId}" no encontrada`);
    }

    const counts = await this.prisma.inventoryCount.findMany({
      where: {
        stationId,
        date: { gte: parseDateOnly(from), lte: parseDateOnly(to) },
      },
      orderBy: [{ date: 'desc' }, { product: { category: { sortOrder: 'asc' } } }],
      select: {
        id: true,
        date: true,
        quantity: true,
        notes: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            unitOfMeasure: true,
            category: { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, name: true } },
      },
    });

    // Serialize Decimal to number
    return {
      stationId: station.id,
      stationName: station.name,
      from,
      to,
      total: counts.length,
      counts: counts.map((c) => ({
        ...c,
        quantity: Number(c.quantity),
      })),
    };
  }

  // --------------------------------------------------------------------------
  // GET /inventory/status?date=YYYY-MM-DD
  // Admin dashboard: which stations reported and which are still pending
  // --------------------------------------------------------------------------

  async getDailyStatus(userId: string, dateStr?: string) {
    const targetDate = dateStr ?? todayLocal();
    const date = parseDateOnly(targetDate);
    const organizationId = await this.resolveOrganizationId(userId);

    // Load all stations in the organization with their product counts
    const stations = await this.prisma.station.findMany({
      where: { location: { organizationId } },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        _count: { select: { stationProducts: true } },
      },
    });

    // Load all counts for the target date in the organization (one query)
    const counts = await this.prisma.inventoryCount.findMany({
      where: {
        date,
        station: { location: { organizationId } },
      },
      select: {
        stationId: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group counts by station
    const countsByStation = new Map<
      string,
      { countedProducts: number; lastCountAt: Date; reportedBy: { id: string; name: string } }
    >();

    for (const c of counts) {
      if (!countsByStation.has(c.stationId)) {
        countsByStation.set(c.stationId, {
          countedProducts: 0,
          lastCountAt: c.createdAt,
          reportedBy: c.user,
        });
      }
      countsByStation.get(c.stationId)!.countedProducts += 1;
    }

    const reported: {
      stationId: string;
      stationName: string;
      countedProducts: number;
      totalProducts: number;
      isComplete: boolean;
      lastCountAt: Date;
      reportedBy: { id: string; name: string };
    }[] = [];

    const pending: {
      stationId: string;
      stationName: string;
      totalProducts: number;
    }[] = [];

    for (const station of stations) {
      const totalProducts = station._count.stationProducts;
      const stationCount = countsByStation.get(station.id);

      if (stationCount) {
        reported.push({
          stationId: station.id,
          stationName: station.name,
          countedProducts: stationCount.countedProducts,
          totalProducts,
          isComplete: stationCount.countedProducts >= totalProducts,
          lastCountAt: stationCount.lastCountAt,
          reportedBy: stationCount.reportedBy,
        });
      } else {
        pending.push({
          stationId: station.id,
          stationName: station.name,
          totalProducts,
        });
      }
    }

    return {
      date: targetDate,
      reportedCount: reported.length,
      pendingCount: pending.length,
      reported,
      pending,
    };
  }

  // --------------------------------------------------------------------------
  // GET /inventory/product/:productId/history?from=&to=
  // History of a single product across all stations
  // --------------------------------------------------------------------------

  async getProductHistory(productId: string, from: string, to: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        code: true,
        name: true,
        unitOfMeasure: true,
        category: { select: { id: true, name: true } },
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con id "${productId}" no encontrado`);
    }

    const counts = await this.prisma.inventoryCount.findMany({
      where: {
        productId,
        date: { gte: parseDateOnly(from), lte: parseDateOnly(to) },
      },
      orderBy: [{ date: 'desc' }, { station: { name: 'asc' } }],
      select: {
        id: true,
        date: true,
        quantity: true,
        notes: true,
        createdAt: true,
        station: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });

    return {
      product,
      from,
      to,
      total: counts.length,
      counts: counts.map((c) => ({
        ...c,
        quantity: Number(c.quantity),
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
      // Verify the station exists at all
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
        `No tienes permiso para registrar conteos en la estacion "${stationId}"`,
      );
    }
  }
}
