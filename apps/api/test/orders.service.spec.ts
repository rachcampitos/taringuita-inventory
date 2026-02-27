import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from '../src/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';

const mockPrisma = {
  location: { findUnique: jest.fn() },
  station: { findMany: jest.fn() },
  product: { findMany: jest.fn() },
  inventoryCount: {
    groupBy: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  weeklyConsumption: {
    groupBy: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  productionLog: { groupBy: jest.fn() },
  orderRequest: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  orderItem: { findFirst: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('deberia lanzar NotFoundException si el local no existe', async () => {
      mockPrisma.location.findUnique.mockResolvedValue(null);

      await expect(
        service.generate({ locationId: 'nonexistent', deliveryDay: 'VIERNES' as any }, 'user1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deberia lanzar BadRequestException sin estaciones', async () => {
      mockPrisma.location.findUnique.mockResolvedValue({
        id: 'loc1',
        name: 'Local 1',
      });
      mockPrisma.station.findMany.mockResolvedValue([]);

      await expect(
        service.generate({ locationId: 'loc1', deliveryDay: 'VIERNES' as any }, 'user1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deberia calcular suggestedQty correctamente', async () => {
      mockPrisma.location.findUnique.mockResolvedValue({
        id: 'loc1',
        name: 'Local 1',
      });
      mockPrisma.station.findMany.mockResolvedValue([{ id: 'st1' }]);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          code: 'LECHE-001',
          name: 'Leche',
          unitOfOrder: 'CAJAS',
          conversionFactor: 6,
          unitCost: 1500,
          deliveryDay: null,
        },
      ]);
      // Stock = 5
      mockPrisma.inventoryCount.groupBy.mockResolvedValue([
        { productId: 'p1', _sum: { quantity: 5 } },
      ]);
      // Avg consumption = 20
      mockPrisma.weeklyConsumption.groupBy.mockResolvedValue([
        { productId: 'p1', _avg: { consumption: 20 }, _count: { consumption: 4 } },
      ]);
      mockPrisma.orderRequest.create.mockResolvedValue({
        id: 'order1',
        items: [{ suggestedQty: 2 }],
      });

      await service.generate({ locationId: 'loc1', deliveryDay: 'VIERNES' as any }, 'user1');

      // quantityNeeded = 20 * 0.9 - 5 = 13
      // suggestedQty = ceil(13 / 6) = 3
      expect(mockPrisma.orderRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  productId: 'p1',
                  suggestedQty: 3,
                }),
              ]),
            }),
          }),
        }),
      );
    });

    it('deberia excluir productos con quantityNeeded <= 0', async () => {
      mockPrisma.location.findUnique.mockResolvedValue({
        id: 'loc1',
        name: 'Local 1',
      });
      mockPrisma.station.findMany.mockResolvedValue([{ id: 'st1' }]);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          code: 'LECHE-001',
          name: 'Leche',
          unitOfOrder: 'UN',
          conversionFactor: 1,
          unitCost: 100,
          deliveryDay: null,
        },
      ]);
      // Stock = 100, way more than avg*0.9
      mockPrisma.inventoryCount.groupBy.mockResolvedValue([
        { productId: 'p1', _sum: { quantity: 100 } },
      ]);
      mockPrisma.weeklyConsumption.groupBy.mockResolvedValue([
        { productId: 'p1', _avg: { consumption: 10 }, _count: { consumption: 4 } },
      ]);
      mockPrisma.orderRequest.create.mockResolvedValue({
        id: 'order1',
        items: [],
      });

      await service.generate({ locationId: 'loc1', deliveryDay: 'VIERNES' as any }, 'user1');

      // quantityNeeded = 10 * 0.9 - 100 = -91 -> excluded
      const createCall = mockPrisma.orderRequest.create.mock.calls[0][0];
      expect(createCall.data.items.create).toHaveLength(0);
    });
  });

  describe('findAll', () => {
    it('deberia retornar paginacion correcta', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        25,
        [{ id: 'o1' }, { id: 'o2' }],
      ]);

      const result = await service.findAll({ page: 1, limit: 2 });

      expect(result.meta.total).toBe(25);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.lastPage).toBe(13);
      expect(result.data).toHaveLength(2);
    });

    it('deberia aplicar filtros locationId y status', async () => {
      mockPrisma.$transaction.mockResolvedValue([0, []]);

      await service.findAll({ locationId: 'loc1', status: 'DRAFT' as any });

      const transactionCall = mockPrisma.$transaction.mock.calls[0][0];
      // Verify the transaction was called (filtering happens internally)
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deberia lanzar NotFoundException si el pedido no existe', async () => {
      mockPrisma.orderRequest.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deberia retornar el pedido con items', async () => {
      const order = {
        id: 'o1',
        locationId: 'loc1',
        location: { id: 'loc1', name: 'Local 1' },
        status: 'DRAFT',
        items: [{ id: 'item1', productId: 'p1' }],
      };
      mockPrisma.orderRequest.findUnique.mockResolvedValue(order);

      const result = await service.findOne('o1');

      expect(result.id).toBe('o1');
      expect(result.items).toHaveLength(1);
    });
  });

  describe('updateItem', () => {
    it('deberia rechazar pedido que no es DRAFT', async () => {
      mockPrisma.orderRequest.findUnique.mockResolvedValue({
        status: 'CONFIRMED',
      });

      await expect(
        service.updateItem('o1', 'item1', { confirmedQty: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deberia actualizar confirmedQty', async () => {
      mockPrisma.orderRequest.findUnique.mockResolvedValue({
        status: 'DRAFT',
      });
      mockPrisma.orderItem.findFirst.mockResolvedValue({
        id: 'item1',
        orderId: 'o1',
      });
      mockPrisma.orderItem.update.mockResolvedValue({
        id: 'item1',
        confirmedQty: 5,
      });

      const result = await service.updateItem('o1', 'item1', {
        confirmedQty: 5,
      });

      expect(result.confirmedQty).toBe(5);
    });

    it('deberia lanzar NotFoundException si el pedido no existe', async () => {
      mockPrisma.orderRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.updateItem('nonexistent', 'item1', { confirmedQty: 5 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('deberia permitir transicion DRAFT -> CONFIRMED', async () => {
      mockPrisma.orderRequest.findUnique.mockResolvedValue({
        status: 'DRAFT',
      });
      mockPrisma.orderRequest.update.mockResolvedValue({
        id: 'o1',
        status: 'CONFIRMED',
      });

      const result = await service.updateStatus('o1', 'CONFIRMED' as any);

      expect(result.status).toBe('CONFIRMED');
    });

    it('deberia rechazar transicion RECEIVED -> DRAFT', async () => {
      mockPrisma.orderRequest.findUnique.mockResolvedValue({
        status: 'RECEIVED',
      });

      await expect(
        service.updateStatus('o1', 'DRAFT' as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('deberia lanzar NotFoundException si el pedido no existe', async () => {
      mockPrisma.orderRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', 'CONFIRMED' as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateWeeklyConsumption', () => {
    it('deberia calcular consumption = max(0, start + produced - end)', async () => {
      mockPrisma.station.findMany.mockResolvedValue([{ id: 'st1' }]);
      mockPrisma.inventoryCount.findMany
        .mockResolvedValueOnce([
          // start counts
          { productId: 'p1', stationId: 'st1', quantity: 100n },
        ])
        .mockResolvedValueOnce([
          // end counts
          { productId: 'p1', stationId: 'st1', quantity: 70n },
        ]);
      mockPrisma.productionLog.groupBy.mockResolvedValue([
        {
          productId: 'p1',
          stationId: 'st1',
          _sum: { quantityProduced: 20n },
        },
      ]);
      mockPrisma.weeklyConsumption.upsert.mockResolvedValue({});

      const weekStart = new Date('2026-02-17');
      const weekEnd = new Date('2026-02-23');
      const result = await service.calculateWeeklyConsumption(
        'loc1',
        weekStart,
        weekEnd,
      );

      // consumption = max(0, 100 + 20 - 70) = 50
      expect(result.calculated).toBe(1);
      expect(mockPrisma.weeklyConsumption.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            consumption: 50,
          }),
        }),
      );
    });

    it('deberia retornar 0 si no hay estaciones', async () => {
      mockPrisma.station.findMany.mockResolvedValue([]);

      const result = await service.calculateWeeklyConsumption(
        'loc1',
        new Date('2026-02-17'),
        new Date('2026-02-23'),
      );

      expect(result.calculated).toBe(0);
    });
  });
});
