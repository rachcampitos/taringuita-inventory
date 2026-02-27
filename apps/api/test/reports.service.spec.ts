import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReportsService } from '../src/reports/reports.service';
import { PrismaService } from '../src/prisma/prisma.service';

const mockPrisma = {
  user: { findUnique: jest.fn() },
  station: { findUnique: jest.fn(), findMany: jest.fn() },
  inventoryCount: { findMany: jest.fn() },
  productionLog: { findMany: jest.fn() },
  weeklyConsumption: { findMany: jest.fn() },
  orderRequest: { count: jest.fn(), findFirst: jest.fn() },
  product: { findUnique: jest.fn() },
};

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    const setupDashboardMocks = (opts?: {
      stations?: any[];
      counts?: any[];
      productions?: any[];
    }) => {
      const stations = opts?.stations ?? [
        { id: 'st1', name: 'Montaje', _count: { stationProducts: 10 } },
        { id: 'st2', name: 'Frio', _count: { stationProducts: 8 } },
        { id: 'st3', name: 'Saltado', _count: { stationProducts: 5 } },
      ];
      const counts = opts?.counts ?? [
        { stationId: 'st1', productId: 'p1' },
        { stationId: 'st1', productId: 'p2' },
        { stationId: 'st2', productId: 'p3' },
      ];
      const productions = opts?.productions ?? [];

      mockPrisma.user.findUnique.mockResolvedValue({ organizationId: 'org1' });
      mockPrisma.station.findMany.mockResolvedValue(stations);
      mockPrisma.inventoryCount.findMany
        .mockResolvedValueOnce(counts)   // todayCounts
        .mockResolvedValueOnce([]);      // low stock alerts
      mockPrisma.productionLog.findMany.mockResolvedValue(productions);
      mockPrisma.weeklyConsumption.findMany
        .mockResolvedValueOnce([])       // thisWeek
        .mockResolvedValueOnce([]);      // lastWeek
      mockPrisma.orderRequest.count
        .mockResolvedValueOnce(2)        // pendingOrders
        .mockResolvedValueOnce(5);       // totalOrdersThisMonth
      mockPrisma.orderRequest.findFirst.mockResolvedValue({
        createdAt: new Date('2026-02-25'),
      });
    };

    it('deberia retornar estructura completa del dashboard', async () => {
      setupDashboardMocks();

      const result = await service.getDashboard('user1');

      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('todayStatus');
      expect(result).toHaveProperty('inventorySummary');
      expect(result).toHaveProperty('productionSummary');
      expect(result).toHaveProperty('lowStockAlerts');
      expect(result).toHaveProperty('costSummary');
      expect(result).toHaveProperty('ordersSummary');
    });

    it('deberia calcular todayStatus correcto (2 de 3 reportadas)', async () => {
      setupDashboardMocks();

      const result = await service.getDashboard('user1');

      expect(result.todayStatus.totalStations).toBe(3);
      expect(result.todayStatus.reportedStations).toBe(2);
      expect(result.todayStatus.pendingStations).toBe(1);
    });

    it('deberia marcar isComplete correctamente', async () => {
      setupDashboardMocks({
        stations: [
          { id: 'st1', name: 'Montaje', _count: { stationProducts: 2 } },
        ],
        counts: [
          { stationId: 'st1', productId: 'p1' },
          { stationId: 'st1', productId: 'p2' },
        ],
      });

      const result = await service.getDashboard('user1');

      expect(result.inventorySummary[0].isComplete).toBe(true);
    });

    it('deberia calcular costTrend porcentaje', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ organizationId: 'org1' });
      mockPrisma.station.findMany.mockResolvedValue([
        { id: 'st1', name: 'Montaje', _count: { stationProducts: 5 } },
      ]);
      mockPrisma.inventoryCount.findMany
        .mockResolvedValueOnce([])   // todayCounts
        .mockResolvedValueOnce([]);  // low stock
      mockPrisma.productionLog.findMany.mockResolvedValue([]);
      mockPrisma.weeklyConsumption.findMany
        .mockResolvedValueOnce([
          { consumption: 10, product: { unitCost: 100 } },  // thisWeek: 1000
        ])
        .mockResolvedValueOnce([
          { consumption: 8, product: { unitCost: 100 } },   // lastWeek: 800
        ]);
      mockPrisma.orderRequest.count.mockResolvedValue(0);
      mockPrisma.orderRequest.findFirst.mockResolvedValue(null);

      const result = await service.getDashboard('user1');

      expect(result.costSummary.totalCostThisWeek).toBe(1000);
      expect(result.costSummary.totalCostLastWeek).toBe(800);
      expect(result.costSummary.costTrend).toBe(25); // (1000-800)/800 * 100 = 25
    });

    it('deberia filtrar por locationId', async () => {
      setupDashboardMocks();

      await service.getDashboard('user1', 'loc1');

      // station.findMany should be called with locationId filter
      expect(mockPrisma.station.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { locationId: 'loc1' },
        }),
      );
    });

    it('deberia lanzar NotFoundException si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getDashboard('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getConsumption', () => {
    it('deberia calcular consumo = prev + production - current', async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: 'st1', name: 'Montaje' });
      mockPrisma.inventoryCount.findMany.mockResolvedValue([
        {
          productId: 'p1',
          date: new Date('2026-02-24'),
          quantity: 100n,
          product: { id: 'p1', code: 'LECHE-001', name: 'Leche', wastagePercent: 5 },
        },
        {
          productId: 'p1',
          date: new Date('2026-02-25'),
          quantity: 80n,
          product: { id: 'p1', code: 'LECHE-001', name: 'Leche', wastagePercent: 5 },
        },
      ]);
      mockPrisma.productionLog.findMany.mockResolvedValue([
        {
          productId: 'p1',
          date: new Date('2026-02-25'),
          quantityProduced: 20n,
        },
      ]);

      const result = await service.getConsumption('st1', '2026-02-25', '2026-02-25');

      // consumption = 100 + 20 - 80 = 40
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].consumption).toBe(40);
      expect(result.rows[0].previousCount).toBe(100);
      expect(result.rows[0].production).toBe(20);
      expect(result.rows[0].currentCount).toBe(80);
    });

    it('deberia lanzar NotFoundException si la estacion no existe', async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);

      await expect(
        service.getConsumption('nonexistent', '2026-02-01', '2026-02-28'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deberia usar 0 cuando no hay conteo previo', async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: 'st1', name: 'Montaje' });
      mockPrisma.inventoryCount.findMany.mockResolvedValue([
        {
          productId: 'p1',
          date: new Date('2026-02-25'),
          quantity: 50n,
          product: { id: 'p1', code: 'LECHE-001', name: 'Leche', wastagePercent: 0 },
        },
      ]);
      mockPrisma.productionLog.findMany.mockResolvedValue([]);

      const result = await service.getConsumption('st1', '2026-02-25', '2026-02-25');

      // consumption = 0 + 0 - 50 = -50
      expect(result.rows[0].previousCount).toBe(0);
      expect(result.rows[0].consumption).toBe(-50);
    });
  });

  describe('getTrends', () => {
    it('deberia agrupar por fecha con breakdown por estacion', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        code: 'LECHE-001',
        name: 'Leche',
      });
      mockPrisma.inventoryCount.findMany.mockResolvedValue([
        {
          date: new Date('2026-02-24'),
          quantity: 10n,
          station: { id: 'st1', name: 'Montaje' },
        },
        {
          date: new Date('2026-02-24'),
          quantity: 5n,
          station: { id: 'st2', name: 'Frio' },
        },
        {
          date: new Date('2026-02-25'),
          quantity: 8n,
          station: { id: 'st1', name: 'Montaje' },
        },
      ]);

      const result = await service.getTrends('p1', '2026-02-24', '2026-02-25');

      expect(result.productName).toBe('Leche');
      expect(result.trend).toHaveLength(2);
      expect(result.trend[0].totalQuantity).toBe(15); // 10 + 5
      expect(result.trend[1].totalQuantity).toBe(8);
    });

    it('deberia lanzar NotFoundException si el producto no existe', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.getTrends('nonexistent', '2026-02-01', '2026-02-28'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCostSummary', () => {
    it('deberia calcular totalCost correctamente', async () => {
      mockPrisma.weeklyConsumption.findMany.mockResolvedValue([
        {
          consumption: 10,
          weekStart: new Date('2026-02-17'),
          productId: 'p1',
          product: { unitCost: 100, category: { name: 'Lacteos' } },
        },
        {
          consumption: 5,
          weekStart: new Date('2026-02-17'),
          productId: 'p2',
          product: { unitCost: 200, category: { name: 'Carnes' } },
        },
      ]);

      const result = await service.getCostSummary('2026-02-17', '2026-02-23');

      // totalCost = (10*100) + (5*200) = 1000 + 1000 = 2000
      expect(result.totalCost).toBe(2000);
    });

    it('deberia ordenar byCategory por costo desc y contar productIds', async () => {
      mockPrisma.weeklyConsumption.findMany.mockResolvedValue([
        {
          consumption: 10,
          weekStart: new Date('2026-02-17'),
          productId: 'p1',
          product: { unitCost: 100, category: { name: 'Lacteos' } },
        },
        {
          consumption: 5,
          weekStart: new Date('2026-02-17'),
          productId: 'p2',
          product: { unitCost: 200, category: { name: 'Carnes' } },
        },
        {
          consumption: 3,
          weekStart: new Date('2026-02-17'),
          productId: 'p3',
          product: { unitCost: 200, category: { name: 'Carnes' } },
        },
      ]);

      const result = await service.getCostSummary('2026-02-17', '2026-02-23');

      // Carnes: (5*200)+(3*200) = 1600, Lacteos: 10*100 = 1000
      expect(result.byCategory[0].categoryName).toBe('Carnes');
      expect(result.byCategory[0].totalCost).toBe(1600);
      expect(result.byCategory[0].productCount).toBe(2); // p2 and p3
      expect(result.byCategory[1].categoryName).toBe('Lacteos');
      expect(result.byCategory[1].productCount).toBe(1); // p1
    });
  });
});
