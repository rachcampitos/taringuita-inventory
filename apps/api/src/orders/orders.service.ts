import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryDay, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateOrderDto } from './dto/generate-order.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';

const ORDER_SELECT = {
  id: true,
  locationId: true,
  location: { select: { id: true, name: true } },
  requestDate: true,
  deliveryDay: true,
  status: true,
  generatedById: true,
  generatedBy: { select: { id: true, name: true } },
  notes: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { items: true } },
} as const;

const ORDER_DETAIL_SELECT = {
  ...ORDER_SELECT,
  items: {
    select: {
      id: true,
      productId: true,
      product: {
        select: {
          id: true,
          code: true,
          name: true,
          category: { select: { id: true, name: true } },
          unitOfMeasure: true,
          unitOfOrder: true,
        },
      },
      currentStock: true,
      weeklyAvgConsumption: true,
      suggestedQty: true,
      confirmedQty: true,
      unitOfOrder: true,
      conversionFactor: true,
      unitCost: true,
    },
    orderBy: { product: { category: { name: 'asc' as const } } },
  },
} as const;

// Valid status transitions
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.SENT, OrderStatus.CANCELLED],
  SENT: [OrderStatus.RECEIVED],
  RECEIVED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // Generate order automatically
  // ------------------------------------------------------------------

  async generate(dto: GenerateOrderDto, userId: string) {
    // Validate location exists
    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
      select: { id: true, name: true },
    });
    if (!location) {
      throw new NotFoundException(
        `Local con id "${dto.locationId}" no encontrado`,
      );
    }

    // Get all stations for this location
    const stations = await this.prisma.station.findMany({
      where: { locationId: dto.locationId },
      select: { id: true },
    });
    const stationIds = stations.map((s) => s.id);

    if (stationIds.length === 0) {
      throw new BadRequestException(
        'El local no tiene estaciones configuradas',
      );
    }

    // Get all active products, optionally filtered by deliveryDay
    const productWhere: Prisma.ProductWhereInput = {
      isActive: true,
    };
    if (dto.deliveryDay) {
      productWhere.OR = [
        { deliveryDay: dto.deliveryDay },
        { deliveryDay: null },
      ];
    }

    const products = await this.prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        code: true,
        name: true,
        unitOfOrder: true,
        conversionFactor: true,
        unitCost: true,
        deliveryDay: true,
      },
    });

    // Get today's date for the request
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step 1: Get latest inventory counts per product (summed across stations)
    const latestCounts = await this.prisma.inventoryCount.groupBy({
      by: ['productId'],
      where: {
        stationId: { in: stationIds },
        date: today,
      },
      _sum: { quantity: true },
    });
    const stockMap = new Map(
      latestCounts.map((c) => [c.productId, Number(c._sum.quantity ?? 0)]),
    );

    // If no counts for today, try the most recent date
    if (stockMap.size === 0) {
      const recentCount = await this.prisma.inventoryCount.findFirst({
        where: { stationId: { in: stationIds } },
        orderBy: { date: 'desc' },
        select: { date: true },
      });

      if (recentCount) {
        const recentCounts = await this.prisma.inventoryCount.groupBy({
          by: ['productId'],
          where: {
            stationId: { in: stationIds },
            date: recentCount.date,
          },
          _sum: { quantity: true },
        });
        for (const c of recentCounts) {
          stockMap.set(c.productId, Number(c._sum.quantity ?? 0));
        }
      }
    }

    // Step 2: Get weekly consumption averages (last 4 weeks)
    const fourWeeksAgo = new Date(today);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const consumptions = await this.prisma.weeklyConsumption.groupBy({
      by: ['productId'],
      where: {
        stationId: { in: stationIds },
        weekStart: { gte: fourWeeksAgo },
      },
      _avg: { consumption: true },
      _count: { consumption: true },
    });
    const consumptionMap = new Map(
      consumptions.map((c) => [
        c.productId,
        Number(c._avg.consumption ?? 0),
      ]),
    );

    // Step 3: Calculate order items
    const orderItems: {
      productId: string;
      currentStock: number;
      weeklyAvgConsumption: number;
      suggestedQty: number;
      unitOfOrder: string;
      conversionFactor: number;
      unitCost: number | null;
    }[] = [];

    for (const product of products) {
      const currentStock = stockMap.get(product.id) ?? 0;
      const avgConsumption = consumptionMap.get(product.id) ?? 0;
      const convFactor = Number(product.conversionFactor);

      // Formula: (avgConsumption * 0.9) - currentStock
      const quantityNeeded = avgConsumption * 0.9 - currentStock;

      if (quantityNeeded <= 0) continue;

      // Convert to order units: ceil(quantityNeeded / conversionFactor)
      const suggestedQty = Math.ceil(quantityNeeded / convFactor);

      orderItems.push({
        productId: product.id,
        currentStock,
        weeklyAvgConsumption: avgConsumption,
        suggestedQty,
        unitOfOrder: product.unitOfOrder,
        conversionFactor: convFactor,
        unitCost: product.unitCost ? Number(product.unitCost) : null,
      });
    }

    // Step 4: Create order with items
    const order = await this.prisma.orderRequest.create({
      data: {
        locationId: dto.locationId,
        requestDate: today,
        deliveryDay: dto.deliveryDay,
        status: OrderStatus.DRAFT,
        generatedById: userId,
        notes: dto.notes ?? null,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            currentStock: item.currentStock,
            weeklyAvgConsumption: item.weeklyAvgConsumption,
            suggestedQty: item.suggestedQty,
            unitOfOrder: item.unitOfOrder as any,
            conversionFactor: item.conversionFactor,
            unitCost: item.unitCost,
          })),
        },
      },
      select: ORDER_DETAIL_SELECT,
    });

    return order;
  }

  // ------------------------------------------------------------------
  // List orders
  // ------------------------------------------------------------------

  async findAll(query: {
    locationId?: string;
    status?: OrderStatus;
    page?: number;
    limit?: number;
  }) {
    const { locationId, status, page = 1, limit = 20 } = query;
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const where: Prisma.OrderRequestWhereInput = {};
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.orderRequest.count({ where }),
      this.prisma.orderRequest.findMany({
        where,
        select: ORDER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit: take,
        lastPage: Math.ceil(total / take),
      },
    };
  }

  // ------------------------------------------------------------------
  // Get single order with items
  // ------------------------------------------------------------------

  async findOne(id: string) {
    const order = await this.prisma.orderRequest.findUnique({
      where: { id },
      select: ORDER_DETAIL_SELECT,
    });

    if (!order) {
      throw new NotFoundException(`Pedido con id "${id}" no encontrado`);
    }

    return order;
  }

  // ------------------------------------------------------------------
  // Update order item (confirmed qty)
  // ------------------------------------------------------------------

  async updateItem(orderId: string, itemId: string, dto: UpdateOrderItemDto) {
    const order = await this.prisma.orderRequest.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    if (!order) {
      throw new NotFoundException(`Pedido con id "${orderId}" no encontrado`);
    }

    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden editar items de pedidos en estado DRAFT',
      );
    }

    const item = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId },
    });

    if (!item) {
      throw new NotFoundException(`Item con id "${itemId}" no encontrado`);
    }

    return this.prisma.orderItem.update({
      where: { id: itemId },
      data: { confirmedQty: dto.confirmedQty },
      select: {
        id: true,
        productId: true,
        product: { select: { code: true, name: true } },
        currentStock: true,
        weeklyAvgConsumption: true,
        suggestedQty: true,
        confirmedQty: true,
        unitOfOrder: true,
        conversionFactor: true,
        unitCost: true,
      },
    });
  }

  // ------------------------------------------------------------------
  // Update order status
  // ------------------------------------------------------------------

  async updateStatus(id: string, newStatus: OrderStatus) {
    const order = await this.prisma.orderRequest.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!order) {
      throw new NotFoundException(`Pedido con id "${id}" no encontrado`);
    }

    const allowed = STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `No se puede cambiar de ${order.status} a ${newStatus}`,
      );
    }

    return this.prisma.orderRequest.update({
      where: { id },
      data: { status: newStatus },
      select: ORDER_SELECT,
    });
  }

  // ------------------------------------------------------------------
  // Export order for bodeguero
  // ------------------------------------------------------------------

  async exportOrder(id: string) {
    const order = await this.findOne(id);

    // Group items by category
    const grouped: Record<
      string,
      {
        category: string;
        items: typeof order.items;
        subtotal: number;
      }
    > = {};

    for (const item of order.items) {
      const catName = item.product.category.name;
      if (!grouped[catName]) {
        grouped[catName] = { category: catName, items: [], subtotal: 0 };
      }
      grouped[catName].items.push(item);
      const qty = Number(item.confirmedQty ?? item.suggestedQty);
      const cost = item.unitCost ? Number(item.unitCost) : 0;
      grouped[catName].subtotal += qty * cost;
    }

    const totalEstimated = Object.values(grouped).reduce(
      (sum, g) => sum + g.subtotal,
      0,
    );

    return {
      order: {
        id: order.id,
        location: order.location,
        requestDate: order.requestDate,
        deliveryDay: order.deliveryDay,
        status: order.status,
        notes: order.notes,
      },
      categories: Object.values(grouped),
      totalItems: order.items.length,
      totalEstimated,
    };
  }

  // ------------------------------------------------------------------
  // Weekly consumption calculation
  // ------------------------------------------------------------------

  async calculateWeeklyConsumption(
    locationId: string,
    weekStart: Date,
    weekEnd: Date,
  ) {
    const stations = await this.prisma.station.findMany({
      where: { locationId },
      select: { id: true },
    });
    const stationIds = stations.map((s) => s.id);

    if (stationIds.length === 0) return { calculated: 0 };

    // Get inventory counts at start and end of week
    const startCounts = await this.prisma.inventoryCount.findMany({
      where: {
        stationId: { in: stationIds },
        date: weekStart,
      },
      select: { productId: true, stationId: true, quantity: true },
    });

    const endCounts = await this.prisma.inventoryCount.findMany({
      where: {
        stationId: { in: stationIds },
        date: weekEnd,
      },
      select: { productId: true, stationId: true, quantity: true },
    });

    // Get production during the week
    const productionLogs = await this.prisma.productionLog.groupBy({
      by: ['productId', 'stationId'],
      where: {
        stationId: { in: stationIds },
        date: { gte: weekStart, lte: weekEnd },
      },
      _sum: { quantityProduced: true },
    });

    // Build maps
    const startMap = new Map(
      startCounts.map((c) => [
        `${c.productId}-${c.stationId}`,
        Number(c.quantity),
      ]),
    );
    const endMap = new Map(
      endCounts.map((c) => [
        `${c.productId}-${c.stationId}`,
        Number(c.quantity),
      ]),
    );
    const prodMap = new Map(
      productionLogs.map((p) => [
        `${p.productId}-${p.stationId}`,
        Number(p._sum.quantityProduced ?? 0),
      ]),
    );

    // Calculate consumption: startInventory + production - endInventory
    const allKeys = new Set([...startMap.keys(), ...endMap.keys()]);
    let calculated = 0;

    const upserts: {
      productId: string;
      stationId: string;
      consumption: number;
    }[] = [];

    for (const key of allKeys) {
      const [productId, stationId] = key.split('-');
      const start = startMap.get(key) ?? 0;
      const end = endMap.get(key) ?? 0;
      const produced = prodMap.get(key) ?? 0;
      const consumption = Math.max(0, start + produced - end);

      if (consumption > 0) {
        upserts.push({ productId, stationId, consumption });
      }
    }

    // Batch upsert weekly consumption records
    for (const u of upserts) {
      await this.prisma.weeklyConsumption.upsert({
        where: {
          productId_stationId_weekStart: {
            productId: u.productId,
            stationId: u.stationId,
            weekStart,
          },
        },
        update: { consumption: u.consumption, weekEnd },
        create: {
          productId: u.productId,
          stationId: u.stationId,
          weekStart,
          weekEnd,
          consumption: u.consumption,
        },
      });
      calculated++;
    }

    return { calculated };
  }

  // ------------------------------------------------------------------
  // Get weekly consumption history for a product
  // ------------------------------------------------------------------

  async getWeeklyConsumption(
    productId: string,
    locationId?: string,
    weeks = 8,
  ) {
    const where: Prisma.WeeklyConsumptionWhereInput = { productId };

    if (locationId) {
      const stations = await this.prisma.station.findMany({
        where: { locationId },
        select: { id: true },
      });
      where.stationId = { in: stations.map((s) => s.id) };
    }

    const data = await this.prisma.weeklyConsumption.findMany({
      where,
      orderBy: { weekStart: 'desc' },
      take: weeks,
      select: {
        weekStart: true,
        weekEnd: true,
        consumption: true,
        station: { select: { id: true, name: true } },
      },
    });

    return data;
  }
}
