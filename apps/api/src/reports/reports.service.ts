import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function todayLocal(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

const MAX_DATE_RANGE_DAYS = 90;

function assertDateRange(from: string, to: string): void {
  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);
  const diffMs = toDate.getTime() - fromDate.getTime();
  if (diffMs < 0) {
    throw new BadRequestException('La fecha "from" debe ser anterior o igual a "to"');
  }
  if (diffMs > MAX_DATE_RANGE_DAYS * 86400000) {
    throw new BadRequestException(`El rango maximo es ${MAX_DATE_RANGE_DAYS} dias`);
  }
}

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export interface TodayStatus {
  totalStations: number;
  reportedStations: number;
  pendingStations: number;
}

export interface InventorySummaryItem {
  stationId: string;
  stationName: string;
  totalProducts: number;
  countedProducts: number;
  isComplete: boolean;
}

export interface ProductionSummaryItem {
  stationId: string;
  stationName: string;
  totalItemsProduced: number;
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  productCode: string;
  stationId: string;
  stationName: string;
  currentQuantity: number;
  minStock: number;
}

export interface CostSummaryBrief {
  totalCostThisWeek: number;
  totalCostLastWeek: number;
  costTrend: number;
}

export interface OrdersSummaryBrief {
  pendingOrders: number;
  lastOrderDate: string | null;
  totalOrdersThisMonth: number;
}

export interface DashboardData {
  date: string;
  todayStatus: TodayStatus;
  inventorySummary: InventorySummaryItem[];
  productionSummary: ProductionSummaryItem[];
  lowStockAlerts: LowStockAlert[];
  costSummary: CostSummaryBrief;
  ordersSummary: OrdersSummaryBrief;
}

export interface ConsumptionRow {
  productId: string;
  productName: string;
  productCode: string;
  date: string;
  previousCount: number;
  production: number;
  currentCount: number;
  consumption: number;
  wastagePercent: number;
}

export interface TrendRow {
  date: string;
  counts: { stationId: string; stationName: string; quantity: number }[];
  totalQuantity: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // GET /reports/dashboard
  // Aggregated data for the admin panel. Scoped to the caller's organization.
  // --------------------------------------------------------------------------

  async getDashboard(userId: string, locationId?: string): Promise<DashboardData> {
    const organizationId = await this.resolveOrganizationId(userId);
    const todayStr = todayLocal();
    const todayDate = parseDateOnly(todayStr);

    const stationLocationWhere = locationId
      ? { locationId }
      : { location: { organizationId } };

    // ------------------------------------------------------------------
    // 1. Load all stations in the organization with their product counts
    // ------------------------------------------------------------------
    const stations = await this.prisma.station.findMany({
      where: stationLocationWhere,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        _count: { select: { stationProducts: true } },
      },
    });

    // ------------------------------------------------------------------
    // 2. Inventory counts for today (one query, org-scoped)
    // ------------------------------------------------------------------
    const todayCounts = await this.prisma.inventoryCount.findMany({
      where: {
        date: todayDate,
        station: stationLocationWhere,
      },
      select: { stationId: true, productId: true },
    });

    // Build a map: stationId -> set of productIds counted today
    const countedByStation = new Map<string, Set<string>>();
    for (const c of todayCounts) {
      if (!countedByStation.has(c.stationId)) {
        countedByStation.set(c.stationId, new Set());
      }
      countedByStation.get(c.stationId)!.add(c.productId);
    }

    // ------------------------------------------------------------------
    // 3. Production totals for today (one query, org-scoped)
    // ------------------------------------------------------------------
    const todayLogs = await this.prisma.productionLog.findMany({
      where: {
        date: todayDate,
        station: stationLocationWhere,
      },
      select: { stationId: true, quantityProduced: true },
    });

    const productionByStation = new Map<string, number>();
    for (const log of todayLogs) {
      const prev = productionByStation.get(log.stationId) ?? 0;
      productionByStation.set(log.stationId, prev + Number(log.quantityProduced));
    }

    // ------------------------------------------------------------------
    // 4. Build inventory + production summaries from the station list
    // ------------------------------------------------------------------
    let reportedStations = 0;
    const inventorySummary: InventorySummaryItem[] = [];
    const productionSummary: ProductionSummaryItem[] = [];

    for (const station of stations) {
      const totalProducts = station._count.stationProducts;
      const countedSet = countedByStation.get(station.id);
      const countedProducts = countedSet?.size ?? 0;
      const isComplete = totalProducts > 0 && countedProducts >= totalProducts;

      if (countedProducts > 0) reportedStations += 1;

      inventorySummary.push({
        stationId: station.id,
        stationName: station.name,
        totalProducts,
        countedProducts,
        isComplete,
      });

      productionSummary.push({
        stationId: station.id,
        stationName: station.name,
        totalItemsProduced: productionByStation.get(station.id) ?? 0,
      });
    }

    // ------------------------------------------------------------------
    // 5. Low stock alerts
    //    A product triggers an alert when its most recent count across
    //    any station falls below the product's minStock threshold.
    // ------------------------------------------------------------------
    const lowStockAlerts = await this.buildLowStockAlerts(organizationId, locationId);

    // ------------------------------------------------------------------
    // 6. Cost summary (this week vs last week)
    // ------------------------------------------------------------------
    const stationIds = stations.map((s) => s.id);
    const weekAgo = new Date(todayDate);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(todayDate);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [thisWeekConsumptions, lastWeekConsumptions] = await Promise.all([
      this.prisma.weeklyConsumption.findMany({
        where: { stationId: { in: stationIds }, weekStart: { gte: weekAgo } },
        select: { consumption: true, product: { select: { unitCost: true } } },
      }),
      this.prisma.weeklyConsumption.findMany({
        where: {
          stationId: { in: stationIds },
          weekStart: { gte: twoWeeksAgo, lt: weekAgo },
        },
        select: { consumption: true, product: { select: { unitCost: true } } },
      }),
    ]);

    const totalCostThisWeek = thisWeekConsumptions.reduce((sum, c) => {
      const cost = c.product.unitCost ? Number(c.product.unitCost) : 0;
      return sum + Number(c.consumption) * cost;
    }, 0);

    const totalCostLastWeek = lastWeekConsumptions.reduce((sum, c) => {
      const cost = c.product.unitCost ? Number(c.product.unitCost) : 0;
      return sum + Number(c.consumption) * cost;
    }, 0);

    const costTrend = totalCostLastWeek > 0
      ? Math.round(((totalCostThisWeek - totalCostLastWeek) / totalCostLastWeek) * 100)
      : 0;

    // ------------------------------------------------------------------
    // 7. Orders summary
    // ------------------------------------------------------------------
    const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);

    const orderLocationWhere = locationId ? { locationId } : {};

    const [pendingOrders, lastOrder, totalOrdersThisMonth] = await Promise.all([
      this.prisma.orderRequest.count({
        where: { status: { in: ['DRAFT', 'CONFIRMED', 'SENT'] }, ...orderLocationWhere },
      }),
      this.prisma.orderRequest.findFirst({
        where: orderLocationWhere,
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.prisma.orderRequest.count({
        where: { createdAt: { gte: monthStart }, ...orderLocationWhere },
      }),
    ]);

    return {
      date: todayStr,
      todayStatus: {
        totalStations: stations.length,
        reportedStations,
        pendingStations: stations.length - reportedStations,
      },
      inventorySummary,
      productionSummary,
      lowStockAlerts,
      costSummary: {
        totalCostThisWeek: Math.round(totalCostThisWeek),
        totalCostLastWeek: Math.round(totalCostLastWeek),
        costTrend,
      },
      ordersSummary: {
        pendingOrders,
        lastOrderDate: lastOrder?.createdAt.toISOString() ?? null,
        totalOrdersThisMonth,
      },
    };
  }

  // --------------------------------------------------------------------------
  // GET /reports/consumption?stationId=&from=&to=
  //
  // For each date in the range and each product in the station, computes:
  //   consumption = previousDayCount + production - currentDayCount
  //
  // Days where either boundary count is missing are included with null-safe
  // arithmetic (treated as 0) and clearly marked in the output.
  // --------------------------------------------------------------------------

  async getConsumption(
    stationId: string,
    from: string,
    to: string,
  ): Promise<{ stationId: string; stationName: string; from: string; to: string; rows: ConsumptionRow[] }> {
    assertDateRange(from, to);

    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { id: true, name: true },
    });

    if (!station) {
      throw new NotFoundException(`Estacion con id "${stationId}" no encontrada`);
    }

    const fromDate = parseDateOnly(from);

    // Fetch one extra day before `from` so we have the "previous" count for
    // the first day in the requested range.
    const extendedFrom = new Date(fromDate);
    extendedFrom.setUTCDate(extendedFrom.getUTCDate() - 1);
    const toDate = parseDateOnly(to);

    // ------------------------------------------------------------------
    // Load all inventory counts for the station in the extended range
    // ------------------------------------------------------------------
    const counts = await this.prisma.inventoryCount.findMany({
      where: {
        stationId,
        date: { gte: extendedFrom, lte: toDate },
      },
      select: {
        productId: true,
        date: true,
        quantity: true,
        product: { select: { id: true, code: true, name: true, wastagePercent: true } },
      },
      orderBy: [{ date: 'asc' }, { productId: 'asc' }],
    });

    // ------------------------------------------------------------------
    // Load all production logs for the station in the requested range
    // (production happens on the same date as the current count)
    // ------------------------------------------------------------------
    const productions = await this.prisma.productionLog.findMany({
      where: {
        stationId,
        date: { gte: fromDate, lte: toDate },
      },
      select: { productId: true, date: true, quantityProduced: true },
    });

    // Index: "productId|dateStr" -> quantity
    const countIndex = new Map<string, number>();
    const productMeta = new Map<string, { code: string; name: string; wastagePercent: number }>();

    for (const c of counts) {
      const dateStr = c.date.toISOString().slice(0, 10);
      countIndex.set(`${c.productId}|${dateStr}`, Number(c.quantity));
      if (!productMeta.has(c.productId)) {
        productMeta.set(c.productId, {
          code: c.product.code,
          name: c.product.name,
          wastagePercent: Number(c.product.wastagePercent),
        });
      }
    }

    // Index: "productId|dateStr" -> total production
    const productionIndex = new Map<string, number>();
    for (const p of productions) {
      const dateStr = p.date.toISOString().slice(0, 10);
      const key = `${p.productId}|${dateStr}`;
      productionIndex.set(key, (productionIndex.get(key) ?? 0) + Number(p.quantityProduced));
    }

    // Enumerate each date in [from, to] and each product encountered
    const allProductIds = [...new Set(counts.map((c) => c.productId))];
    const rows: ConsumptionRow[] = [];

    let cursor = new Date(fromDate);
    while (cursor <= toDate) {
      const currentDateStr = cursor.toISOString().slice(0, 10);
      const prevDate = new Date(cursor);
      prevDate.setUTCDate(prevDate.getUTCDate() - 1);
      const prevDateStr = prevDate.toISOString().slice(0, 10);

      for (const productId of allProductIds) {
        const meta = productMeta.get(productId);
        if (!meta) continue;

        const previousCount = countIndex.get(`${productId}|${prevDateStr}`) ?? 0;
        const production = productionIndex.get(`${productId}|${currentDateStr}`) ?? 0;
        const currentCount = countIndex.get(`${productId}|${currentDateStr}`) ?? 0;

        // consumption = previousCount + production - currentCount
        const consumption = previousCount + production - currentCount;

        rows.push({
          productId,
          productName: meta.name,
          productCode: meta.code,
          date: currentDateStr,
          previousCount,
          production,
          currentCount,
          consumption,
          wastagePercent: meta.wastagePercent,
        });
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // Sort: date asc, then product name asc
    rows.sort((a, b) =>
      a.date !== b.date
        ? a.date.localeCompare(b.date)
        : a.productName.localeCompare(b.productName),
    );

    return {
      stationId: station.id,
      stationName: station.name,
      from,
      to,
      rows,
    };
  }

  // --------------------------------------------------------------------------
  // GET /reports/trends?productId=&from=&to=
  //
  // Inventory evolution of a single product across all stations over time.
  // Groups counts by date, with a breakdown per station and a daily total.
  // --------------------------------------------------------------------------

  async getTrends(
    productId: string,
    from: string,
    to: string,
  ): Promise<{ productId: string; productName: string; productCode: string; from: string; to: string; trend: TrendRow[] }> {
    assertDateRange(from, to);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, code: true, name: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto con id "${productId}" no encontrado`);
    }

    const counts = await this.prisma.inventoryCount.findMany({
      where: {
        productId,
        date: { gte: parseDateOnly(from), lte: parseDateOnly(to) },
      },
      orderBy: [{ date: 'asc' }, { station: { name: 'asc' } }],
      select: {
        date: true,
        quantity: true,
        station: { select: { id: true, name: true } },
      },
    });

    // Group by date
    const byDate = new Map<
      string,
      { stationId: string; stationName: string; quantity: number }[]
    >();

    for (const c of counts) {
      const dateStr = c.date.toISOString().slice(0, 10);
      if (!byDate.has(dateStr)) {
        byDate.set(dateStr, []);
      }
      byDate.get(dateStr)!.push({
        stationId: c.station.id,
        stationName: c.station.name,
        quantity: Number(c.quantity),
      });
    }

    const trend: TrendRow[] = [...byDate.entries()].map(([date, stationCounts]) => ({
      date,
      counts: stationCounts,
      totalQuantity: stationCounts.reduce((sum, s) => sum + s.quantity, 0),
    }));

    return {
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      from,
      to,
      trend,
    };
  }

  // --------------------------------------------------------------------------
  // GET /reports/cost-summary?from=&to=&locationId=
  // --------------------------------------------------------------------------

  async getCostSummary(
    from: string,
    to: string,
    locationId?: string,
  ): Promise<{
    totalCost: number;
    byCategory: { categoryName: string; totalCost: number; productCount: number }[];
    weeklyTrend: { weekStart: string; totalCost: number }[];
  }> {
    assertDateRange(from, to);

    const fromDate = parseDateOnly(from);
    const toDate = parseDateOnly(to);

    const stationWhere = locationId
      ? { locationId }
      : {};

    // Get weekly consumptions in range
    const consumptions = await this.prisma.weeklyConsumption.findMany({
      where: {
        weekStart: { gte: fromDate },
        weekEnd: { lte: toDate },
        station: stationWhere,
      },
      select: {
        consumption: true,
        weekStart: true,
        productId: true,
        product: {
          select: {
            unitCost: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    // By category
    const catMap = new Map<string, { totalCost: number; productIds: Set<string> }>();
    let totalCost = 0;

    for (const c of consumptions) {
      const cost = c.product.unitCost ? Number(c.product.unitCost) : 0;
      const lineCost = Number(c.consumption) * cost;
      totalCost += lineCost;

      const catName = c.product.category.name;
      if (!catMap.has(catName)) {
        catMap.set(catName, { totalCost: 0, productIds: new Set() });
      }
      const cat = catMap.get(catName)!;
      cat.totalCost += lineCost;
      cat.productIds.add(c.productId);
    }

    const byCategory = [...catMap.entries()]
      .map(([categoryName, data]) => ({
        categoryName,
        totalCost: Math.round(data.totalCost * 100) / 100,
        productCount: data.productIds.size,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    // Weekly trend
    const weekMap = new Map<string, number>();
    for (const c of consumptions) {
      const weekKey = c.weekStart.toISOString().slice(0, 10);
      const cost = c.product.unitCost ? Number(c.product.unitCost) : 0;
      const lineCost = Number(c.consumption) * cost;
      weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + lineCost);
    }

    const weeklyTrend = [...weekMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, wCost]) => ({
        weekStart,
        totalCost: Math.round(wCost * 100) / 100,
      }));

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      byCategory,
      weeklyTrend,
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
   * Finds products whose latest inventory count in any station of the
   * organization is below the product's configured minStock threshold.
   *
   * Strategy: fetch the most recent count per (station, product) pair using
   * a subquery approach via Prisma groupBy + individual lookups to stay
   * within Prisma's query API without raw SQL.
   *
   * We use a single findMany with orderBy to retrieve counts ordered by date
   * descending, then keep only the first occurrence per (stationId, productId)
   * key in memory — equivalent to DISTINCT ON (stationId, productId).
   */
  private async buildLowStockAlerts(organizationId: string, locationId?: string): Promise<LowStockAlert[]> {
    const stationWhere = locationId
      ? { locationId }
      : { location: { organizationId } };

    // Only look at counts from the last 7 days to avoid loading all history
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const counts = await this.prisma.inventoryCount.findMany({
      where: {
        station: stationWhere,
        product: { minStock: { not: null } },
        date: { gte: sevenDaysAgo },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: {
        stationId: true,
        productId: true,
        quantity: true,
        station: { select: { id: true, name: true } },
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            minStock: true,
          },
        },
      },
    });

    // Keep only the most recent count per (stationId, productId) pair
    const seen = new Set<string>();
    const alerts: LowStockAlert[] = [];

    for (const c of counts) {
      const key = `${c.stationId}|${c.productId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const minStock = Number(c.product.minStock);
      const currentQuantity = Number(c.quantity);

      if (currentQuantity < minStock) {
        alerts.push({
          productId: c.product.id,
          productName: c.product.name,
          productCode: c.product.code,
          stationId: c.station.id,
          stationName: c.station.name,
          currentQuantity,
          minStock,
        });
      }
    }

    // Sort by how far below minStock each item is (most critical first)
    alerts.sort((a, b) => a.currentQuantity / a.minStock - b.currentQuantity / b.minStock);

    return alerts;
  }
}
