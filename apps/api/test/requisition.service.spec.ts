import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InventoryService } from '../src/inventory/inventory.service';
import { PrismaService } from '../src/prisma/prisma.service';

const mockPrisma = {
  user: { findUnique: jest.fn() },
  station: { findUnique: jest.fn(), findFirst: jest.fn() },
  requisition: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  inventoryCount: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
};

describe('InventoryService - Requisitions', () => {
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

  const baseDto = {
    stationId: 'st-saltado',
    date: '2026-03-06',
    items: [
      { productId: 'prod-arroz', quantity: 5.0 },
      { productId: 'prod-aceite', quantity: 2.0 },
    ],
  };

  const mockRequisitionResult = {
    id: 'req1',
    date: new Date('2026-03-06'),
    notes: null,
    createdAt: new Date(),
    station: { id: 'st-saltado', name: 'saltado' },
    user: { id: 'user1', name: 'Raymundo' },
    items: [
      {
        id: 'ri1',
        quantity: 5.0,
        product: {
          id: 'prod-arroz',
          code: 'ARR-001',
          name: 'Arroz grano largo',
          unitOfMeasure: 'KG',
          category: { id: 'cat1', name: 'Abarrotes' },
        },
      },
      {
        id: 'ri2',
        quantity: 2.0,
        product: {
          id: 'prod-aceite',
          code: 'ACE-001',
          name: 'Aceite vegetal',
          unitOfMeasure: 'LT',
          category: { id: 'cat1', name: 'Abarrotes' },
        },
      },
    ],
  };

  describe('createRequisition', () => {
    it('deberia permitir a ADMIN crear requisicion para cualquier estacion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        stations: [],
      });
      mockPrisma.station.findUnique.mockResolvedValue({ id: 'st-saltado' });
      mockPrisma.station.findFirst.mockResolvedValue({ id: 'st-alm', name: 'almacenamiento' });
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        return cb({
          requisition: {
            create: jest.fn().mockResolvedValue(mockRequisitionResult),
          },
          inventoryCount: {
            findUnique: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await service.createRequisition(baseDto, 'user1');

      expect(result.id).toBe('req1');
      expect(result.items).toHaveLength(2);
      expect(result.station.name).toBe('saltado');
    });

    it('deberia permitir a SOUS_CHEF con acceso a la estacion crear requisicion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'SOUS_CHEF',
        stations: [{ stationId: 'st-saltado' }],
      });
      mockPrisma.station.findFirst.mockResolvedValue({ id: 'st-alm', name: 'almacenamiento' });
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        return cb({
          requisition: {
            create: jest.fn().mockResolvedValue(mockRequisitionResult),
          },
          inventoryCount: {
            findUnique: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await service.createRequisition(baseDto, 'user1');

      expect(result.id).toBe('req1');
    });

    it('deberia rechazar usuario sin acceso a la estacion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'SOUS_CHEF',
        stations: [],
      });

      await expect(service.createRequisition(baseDto, 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deberia decrementar almacenamiento si existe InventoryCount', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        stations: [],
      });
      mockPrisma.station.findUnique.mockResolvedValue({ id: 'st-saltado' });
      mockPrisma.station.findFirst.mockResolvedValue({ id: 'st-alm', name: 'almacenamiento' });

      const mockUpdate = jest.fn().mockResolvedValue({});
      const mockFindUnique = jest.fn()
        .mockResolvedValueOnce({ id: 'count-alm-arroz', quantity: 20 })  // almacenamiento arroz
        .mockResolvedValueOnce(null)  // station arroz (no existe)
        .mockResolvedValueOnce({ id: 'count-alm-aceite', quantity: 10 }) // almacenamiento aceite
        .mockResolvedValueOnce(null); // station aceite (no existe)

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        return cb({
          requisition: {
            create: jest.fn().mockResolvedValue(mockRequisitionResult),
          },
          inventoryCount: {
            findUnique: mockFindUnique,
            update: mockUpdate,
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      await service.createRequisition(baseDto, 'user1');

      expect(mockUpdate).toHaveBeenCalledTimes(2);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'count-alm-arroz' },
          data: expect.objectContaining({
            quantity: { decrement: 5.0 },
          }),
        }),
      );
    });

    it('deberia incrementar o crear InventoryCount en estacion destino', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        stations: [],
      });
      mockPrisma.station.findUnique.mockResolvedValue({ id: 'st-saltado' });
      mockPrisma.station.findFirst.mockResolvedValue({ id: 'st-alm', name: 'almacenamiento' });

      const mockUpdate = jest.fn().mockResolvedValue({});
      const mockCreate = jest.fn().mockResolvedValue({});
      const mockFindUnique = jest.fn()
        .mockResolvedValueOnce(null) // almacenamiento arroz (no existe)
        .mockResolvedValueOnce({ id: 'count-st-arroz', quantity: 3 }) // station arroz (existe -> increment)
        .mockResolvedValueOnce(null) // almacenamiento aceite (no existe)
        .mockResolvedValueOnce(null); // station aceite (no existe -> create)

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        return cb({
          requisition: {
            create: jest.fn().mockResolvedValue(mockRequisitionResult),
          },
          inventoryCount: {
            findUnique: mockFindUnique,
            update: mockUpdate,
            create: mockCreate,
          },
        });
      });

      await service.createRequisition(baseDto, 'user1');

      // Station arroz should be incremented
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'count-st-arroz' },
          data: expect.objectContaining({
            quantity: { increment: 5.0 },
          }),
        }),
      );
      // Station aceite should be created
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stationId: 'st-saltado',
            productId: 'prod-aceite',
            quantity: 2.0,
          }),
        }),
      );
    });

    it('no deberia decrementar almacenamiento si no tiene count hoy', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        stations: [],
      });
      mockPrisma.station.findUnique.mockResolvedValue({ id: 'st-saltado' });
      mockPrisma.station.findFirst.mockResolvedValue({ id: 'st-alm', name: 'almacenamiento' });

      const mockUpdate = jest.fn().mockResolvedValue({});
      const mockCreate = jest.fn().mockResolvedValue({});
      // All findUnique return null (no existing counts anywhere)
      const mockFindUnique = jest.fn().mockResolvedValue(null);

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        return cb({
          requisition: {
            create: jest.fn().mockResolvedValue(mockRequisitionResult),
          },
          inventoryCount: {
            findUnique: mockFindUnique,
            update: mockUpdate,
            create: mockCreate,
          },
        });
      });

      await service.createRequisition(baseDto, 'user1');

      // Update should not be called for almacenamiento (no existing count)
      // Only create should be called for destination station
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStationRequisitions', () => {
    it('deberia retornar lista de requisiciones del dia, default hoy', async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: 'st-saltado', name: 'saltado' });
      mockPrisma.requisition.findMany.mockResolvedValue([mockRequisitionResult]);

      const result = await service.getStationRequisitions('st-saltado', '2026-03-06');

      expect(result.stationId).toBe('st-saltado');
      expect(result.stationName).toBe('saltado');
      expect(result.total).toBe(1);
      expect(result.requisitions).toHaveLength(1);
      expect(result.requisitions[0].items[0].quantity).toBe(5);
    });

    it('deberia lanzar 404 si estacion no existe', async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);

      await expect(
        service.getStationRequisitions('nonexistent', '2026-03-06'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRequisitionById', () => {
    it('deberia retornar detalle con items', async () => {
      mockPrisma.requisition.findUnique.mockResolvedValue(mockRequisitionResult);

      const result = await service.getRequisitionById('req1');

      expect(result.id).toBe('req1');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].product.name).toBe('Arroz grano largo');
      expect(result.items[0].quantity).toBe(5);
    });

    it('deberia lanzar 404 para id inexistente', async () => {
      mockPrisma.requisition.findUnique.mockResolvedValue(null);

      await expect(service.getRequisitionById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
