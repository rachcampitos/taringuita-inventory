import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProductionService } from '../src/production/production.service';
import { PrismaService } from '../src/prisma/prisma.service';

const mockPrisma = {
  user: { findUnique: jest.fn() },
  station: { findUnique: jest.fn() },
  productionLog: { upsert: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn(),
};

describe('ProductionService', () => {
  let service: ProductionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductionService>(ProductionService);
    jest.clearAllMocks();
  });

  describe('logProduction', () => {
    const dto = {
      stationId: 'st1',
      productId: 'p1',
      date: '2026-02-26',
      quantityProduced: 10,
    };

    it('deberia permitir a ADMIN registrar en cualquier estacion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        stations: [],
      });
      mockPrisma.station.findUnique.mockResolvedValue({ id: 'st1' });
      mockPrisma.productionLog.upsert.mockResolvedValue({
        id: 'log1',
        stationId: 'st1',
        productId: 'p1',
        quantityProduced: 10n,
        date: new Date('2026-02-26'),
        notes: null,
        userId: 'user1',
        createdAt: new Date(),
      });

      const result = await service.logProduction(dto, 'user1');

      expect(result.id).toBe('log1');
      expect(result.quantityProduced).toBe(10);
    });

    it('deberia rechazar SOUS_CHEF sin acceso a la estacion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'SOUS_CHEF',
        stations: [],
      });

      await expect(service.logProduction(dto, 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deberia permitir HEAD_CHEF con acceso a la estacion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'HEAD_CHEF',
        stations: [{ stationId: 'st1' }],
      });
      mockPrisma.productionLog.upsert.mockResolvedValue({
        id: 'log1',
        stationId: 'st1',
        productId: 'p1',
        quantityProduced: 10n,
        date: new Date('2026-02-26'),
        notes: null,
        userId: 'user1',
        createdAt: new Date(),
      });

      const result = await service.logProduction(dto, 'user1');

      expect(result.id).toBe('log1');
      expect(result.quantityProduced).toBe(10);
    });

    it('deberia lanzar NotFoundException si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.logProduction(dto, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('logBulkProduction', () => {
    const dto = {
      stationId: 'st1',
      date: '2026-02-26',
      items: [
        { productId: 'p1', quantityProduced: 5 },
        { productId: 'p2', quantityProduced: 10 },
      ],
    };

    it('deberia crear multiples logs en una transaccion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        stations: [],
      });
      mockPrisma.station.findUnique.mockResolvedValue({ id: 'st1' });
      mockPrisma.$transaction.mockResolvedValue([
        { id: 'l1', productId: 'p1', quantityProduced: 5n, notes: null },
        { id: 'l2', productId: 'p2', quantityProduced: 10n, notes: null },
      ]);

      const result = await service.logBulkProduction(dto, 'user1');

      expect(result.saved).toBe(2);
      expect(result.stationId).toBe('st1');
    });

    it('deberia rechazar sin permiso', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'SOUS_CHEF',
        stations: [],
      });

      await expect(service.logBulkProduction(dto, 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getStationLogs', () => {
    it('deberia lanzar NotFoundException si la estacion no existe', async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);

      await expect(service.getStationLogs('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deberia retornar logs del dia', async () => {
      mockPrisma.station.findUnique.mockResolvedValue({
        id: 'st1',
        name: 'Montaje',
      });
      mockPrisma.productionLog.findMany.mockResolvedValue([
        {
          id: 'log1',
          quantityProduced: 5n,
          notes: null,
          createdAt: new Date(),
          product: { id: 'p1', code: 'LECHE-001', name: 'Leche', category: { id: 'cat1', name: 'Lacteos' } },
          user: { id: 'u1', name: 'Chef' },
        },
      ]);

      const result = await service.getStationLogs('st1', '2026-02-26');

      expect(result.stationName).toBe('Montaje');
      expect(result.total).toBe(1);
      expect(result.logs[0].quantityProduced).toBe(5);
    });

    it('deberia usar fecha de hoy por defecto', async () => {
      mockPrisma.station.findUnique.mockResolvedValue({
        id: 'st1',
        name: 'Frio',
      });
      mockPrisma.productionLog.findMany.mockResolvedValue([]);

      const result = await service.getStationLogs('st1');

      expect(result.date).toBe(new Date().toISOString().slice(0, 10));
    });
  });

  describe('getStationHistory', () => {
    it('deberia lanzar NotFoundException si la estacion no existe', async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);

      await expect(
        service.getStationHistory('nonexistent', '2026-02-01', '2026-02-28'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deberia retornar logs en rango de fechas', async () => {
      mockPrisma.station.findUnique.mockResolvedValue({
        id: 'st1',
        name: 'Saltado',
      });
      mockPrisma.productionLog.findMany.mockResolvedValue([
        {
          id: 'log1',
          date: new Date('2026-02-15'),
          quantityProduced: 8n,
          notes: null,
          createdAt: new Date(),
          product: { id: 'p1', code: 'RES-001', name: 'Res', category: { id: 'cat1', name: 'Carnes' } },
          user: { id: 'u1', name: 'Chef' },
        },
      ]);

      const result = await service.getStationHistory('st1', '2026-02-01', '2026-02-28');

      expect(result.stationName).toBe('Saltado');
      expect(result.from).toBe('2026-02-01');
      expect(result.to).toBe('2026-02-28');
      expect(result.total).toBe(1);
      expect(result.logs[0].quantityProduced).toBe(8);
    });
  });

  describe('getDailySummary', () => {
    it('deberia agrupar produccion por estacion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        organizationId: 'org1',
      });
      mockPrisma.productionLog.findMany.mockResolvedValue([
        {
          quantityProduced: 10n,
          station: { id: 'st1', name: 'Montaje' },
          product: { id: 'p1', code: 'LECHE-001', name: 'Leche', category: { id: 'cat1', name: 'Lacteos' } },
        },
        {
          quantityProduced: 5n,
          station: { id: 'st1', name: 'Montaje' },
          product: { id: 'p2', code: 'QUESO-001', name: 'Queso', category: { id: 'cat1', name: 'Lacteos' } },
        },
        {
          quantityProduced: 3n,
          station: { id: 'st2', name: 'Frio' },
          product: { id: 'p3', code: 'SALM-001', name: 'Salmon', category: { id: 'cat2', name: 'Pescados' } },
        },
      ]);

      const result = await service.getDailySummary('user1');

      expect(result.totalStations).toBe(2);
      expect(result.summary).toHaveLength(2);
      const montaje = result.summary.find((s) => s.station.name === 'Montaje');
      expect(montaje?.totalItems).toBe(2);
    });

    it('deberia lanzar NotFoundException si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getDailySummary('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
