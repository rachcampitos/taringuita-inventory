import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { InventoryService } from '../src/inventory/inventory.service';
import { PrismaService } from '../src/prisma/prisma.service';

const mockPrisma = {
  station: {
    findUnique: jest.fn(),
  },
  stationProduct: {
    findMany: jest.fn(),
  },
  inventoryCount: {
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    jest.clearAllMocks();
  });

  describe('submitCount', () => {
    const dto = {
      stationId: 'st1',
      productId: 'p1',
      date: '2026-02-26',
      quantity: 10,
    };

    it('deberia permitir a ADMIN enviar conteos a cualquier estacion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        stations: [],
      });
      mockPrisma.station.findUnique.mockResolvedValue({ id: 'st1' });
      mockPrisma.inventoryCount.upsert.mockResolvedValue({
        id: 'count1',
        stationId: 'st1',
        productId: 'p1',
        quantity: 10,
        date: new Date('2026-02-26'),
        notes: null,
        userId: 'user1',
        createdAt: new Date(),
      });

      const result = await service.submitCount(dto, 'user1');

      expect(result.id).toBe('count1');
      expect(result.quantity).toBe(10);
    });

    it('deberia rechazar SOUS_CHEF sin acceso a la estacion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'SOUS_CHEF',
        stations: [],
      });

      await expect(service.submitCount(dto, 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deberia permitir SOUS_CHEF con acceso a la estacion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'SOUS_CHEF',
        stations: [{ stationId: 'st1' }],
      });
      mockPrisma.inventoryCount.upsert.mockResolvedValue({
        id: 'count1',
        stationId: 'st1',
        productId: 'p1',
        quantity: 10,
        date: new Date('2026-02-26'),
        notes: null,
        userId: 'user1',
        createdAt: new Date(),
      });

      const result = await service.submitCount(dto, 'user1');

      expect(result.id).toBe('count1');
    });
  });

  describe('submitBulkCount', () => {
    const dto = {
      stationId: 'st1',
      date: '2026-02-26',
      items: [
        { productId: 'p1', quantity: 5 },
        { productId: 'p2', quantity: 10 },
      ],
    };

    it('deberia crear multiples conteos en una transaccion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        stations: [],
      });
      mockPrisma.station.findUnique.mockResolvedValue({ id: 'st1' });
      mockPrisma.$transaction.mockResolvedValue([
        { id: 'c1', productId: 'p1', quantity: 5, notes: null },
        { id: 'c2', productId: 'p2', quantity: 10, notes: null },
      ]);

      const result = await service.submitBulkCount(dto, 'user1');

      expect(result.saved).toBe(2);
      expect(result.stationId).toBe('st1');
    });
  });

  describe('getStationCounts', () => {
    it('deberia lanzar NotFoundException si la estacion no existe', async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);

      await expect(service.getStationCounts('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deberia retornar productos agrupados por categoria con conteos', async () => {
      mockPrisma.station.findUnique.mockResolvedValue({
        id: 'st1',
        name: 'Montaje',
      });
      mockPrisma.stationProduct.findMany.mockResolvedValue([
        {
          sortOrder: 1,
          product: {
            id: 'p1',
            code: 'LECHE-001',
            name: 'Leche',
            unitOfMeasure: 'LT',
            category: { id: 'cat1', name: 'Lacteos' },
          },
        },
      ]);
      mockPrisma.inventoryCount.findMany.mockResolvedValue([
        {
          productId: 'p1',
          quantity: 5,
          notes: null,
          userId: 'u1',
          user: { id: 'u1', name: 'Chef' },
        },
      ]);

      const result = await service.getStationCounts('st1', '2026-02-26');

      expect(result.stationName).toBe('Montaje');
      expect(result.totalProducts).toBe(1);
      expect(result.countedProducts).toBe(1);
      expect(result.isComplete).toBe(true);
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].products[0].countedQuantity).toBe(5);
    });

    it('deberia retornar countedQuantity null para productos no contados', async () => {
      mockPrisma.station.findUnique.mockResolvedValue({
        id: 'st1',
        name: 'Frio',
      });
      mockPrisma.stationProduct.findMany.mockResolvedValue([
        {
          sortOrder: 1,
          product: {
            id: 'p1',
            code: 'LECHE-001',
            name: 'Leche',
            unitOfMeasure: 'LT',
            category: { id: 'cat1', name: 'Lacteos' },
          },
        },
      ]);
      mockPrisma.inventoryCount.findMany.mockResolvedValue([]);

      const result = await service.getStationCounts('st1');

      expect(result.isComplete).toBe(false);
      expect(result.countedProducts).toBe(0);
      expect(result.categories[0].products[0].countedQuantity).toBeNull();
    });
  });
});
