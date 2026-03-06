import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProductionService } from '../src/production/production.service';
import { PrismaService } from '../src/prisma/prisma.service';

const mockPrisma = {
  user: { findUnique: jest.fn() },
  station: { findFirst: jest.fn(), findUnique: jest.fn() },
  productionTransformation: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  inventoryCount: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
  productionLog: { upsert: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn(),
};

describe('ProductionService - Transformations', () => {
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

  const baseDto = {
    inputProductId: 'prod-pulpo',
    inputQuantity: 5.0,
    date: '2026-03-05',
    outputs: [
      { outputProductId: 'prod-pulpo-140', quantity: 2.1 },
      { outputProductId: 'prod-pulpo-170', quantity: 2.04 },
    ],
  };

  const mockTransformationResult = {
    id: 'tr1',
    inputQuantity: 5n,
    mermaQuantity: 0.86,
    mermaPercent: 17.2,
    date: new Date('2026-03-05'),
    notes: null,
    createdAt: new Date(),
    inputProduct: { id: 'prod-pulpo', code: 'PUL-001', name: 'Pulpo entero', unitOfMeasure: 'KG' },
    recipe: null,
    user: { id: 'user1', name: 'Raymundo' },
    outputs: [
      {
        id: 'out1',
        quantity: 2.1,
        outputProduct: { id: 'prod-pulpo-140', code: 'PUL-140', name: 'Pulpo 140gr', unitOfMeasure: 'UN' },
      },
      {
        id: 'out2',
        quantity: 2.04,
        outputProduct: { id: 'prod-pulpo-170', code: 'PUL-170', name: 'Pulpo parrilla 170gr', unitOfMeasure: 'UN' },
      },
    ],
  };

  describe('createTransformation', () => {
    it('deberia permitir a ADMIN crear una transformacion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        stations: [],
      });
      mockPrisma.station.findFirst.mockResolvedValue({ id: 'st-alm', name: 'almacenamiento' });
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        return cb({
          productionTransformation: {
            create: jest.fn().mockResolvedValue(mockTransformationResult),
          },
          inventoryCount: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await service.createTransformation(baseDto, 'user1');

      expect(result.id).toBe('tr1');
      expect(result.mermaQuantity).toBe(0.86);
      expect(result.outputs).toHaveLength(2);
    });

    it('deberia rechazar usuario sin acceso a estacion "produccion"', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'SOUS_CHEF',
        stations: [
          { station: { name: 'frio' } },
        ],
      });

      await expect(service.createTransformation(baseDto, 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deberia rechazar si sum(outputs) > inputQuantity', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        stations: [],
      });
      mockPrisma.station.findFirst.mockResolvedValue({ id: 'st-alm', name: 'almacenamiento' });

      const badDto = {
        ...baseDto,
        inputQuantity: 3.0,
        outputs: [
          { outputProductId: 'p1', quantity: 2.0 },
          { outputProductId: 'p2', quantity: 2.0 },
        ],
      };

      await expect(service.createTransformation(badDto, 'user1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deberia crear inventory counts en almacenamiento', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        stations: [],
      });
      mockPrisma.station.findFirst.mockResolvedValue({ id: 'st-alm', name: 'almacenamiento' });

      const mockCreate = jest.fn().mockResolvedValue({});
      const mockFindUnique = jest.fn().mockResolvedValue(null);

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        return cb({
          productionTransformation: {
            create: jest.fn().mockResolvedValue(mockTransformationResult),
          },
          inventoryCount: {
            findUnique: mockFindUnique,
            create: mockCreate,
          },
        });
      });

      await service.createTransformation(baseDto, 'user1');

      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('deberia incrementar inventory count existente en almacenamiento', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        stations: [],
      });
      mockPrisma.station.findFirst.mockResolvedValue({ id: 'st-alm', name: 'almacenamiento' });

      const mockUpdate = jest.fn().mockResolvedValue({});
      const mockFindUnique = jest.fn().mockResolvedValue({ id: 'existing-count', quantity: 5 });

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        return cb({
          productionTransformation: {
            create: jest.fn().mockResolvedValue(mockTransformationResult),
          },
          inventoryCount: {
            findUnique: mockFindUnique,
            update: mockUpdate,
            create: jest.fn(),
          },
        });
      });

      await service.createTransformation(baseDto, 'user1');

      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });

    it('deberia aceptar recipeId opcional', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        stations: [],
      });
      mockPrisma.station.findFirst.mockResolvedValue({ id: 'st-alm', name: 'almacenamiento' });

      const dtoWithRecipe = { ...baseDto, recipeId: 'recipe-1' };
      const resultWithRecipe = {
        ...mockTransformationResult,
        recipe: { id: 'recipe-1', name: 'Pulpo prep' },
      };

      mockPrisma.$transaction.mockImplementation(async (cb) => {
        return cb({
          productionTransformation: {
            create: jest.fn().mockResolvedValue(resultWithRecipe),
          },
          inventoryCount: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await service.createTransformation(dtoWithRecipe, 'user1');

      expect(result.recipe).toEqual({ id: 'recipe-1', name: 'Pulpo prep' });
    });
  });

  describe('getTransformations', () => {
    it('deberia retornar lista del dia', async () => {
      mockPrisma.productionTransformation.findMany.mockResolvedValue([
        mockTransformationResult,
      ]);

      const result = await service.getTransformations('2026-03-05');

      expect(result.date).toBe('2026-03-05');
      expect(result.total).toBe(1);
      expect(result.transformations).toHaveLength(1);
    });

    it('deberia retornar array vacio sin transformaciones', async () => {
      mockPrisma.productionTransformation.findMany.mockResolvedValue([]);

      const result = await service.getTransformations('2026-03-05');

      expect(result.total).toBe(0);
      expect(result.transformations).toEqual([]);
    });
  });

  describe('getTransformationById', () => {
    it('deberia retornar detalle de transformacion', async () => {
      mockPrisma.productionTransformation.findUnique.mockResolvedValue(
        mockTransformationResult,
      );

      const result = await service.getTransformationById('tr1');

      expect(result.id).toBe('tr1');
      expect(result.inputProduct.name).toBe('Pulpo entero');
      expect(result.outputs).toHaveLength(2);
    });

    it('deberia lanzar NotFoundException para id inexistente', async () => {
      mockPrisma.productionTransformation.findUnique.mockResolvedValue(null);

      await expect(service.getTransformationById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTransformationSummary', () => {
    it('deberia agregar merma correctamente', async () => {
      mockPrisma.productionTransformation.findMany.mockResolvedValue([
        {
          inputQuantity: 5n,
          mermaQuantity: 0.86,
          mermaPercent: 17.2,
          inputProduct: { id: 'p1', code: 'PUL-001', name: 'Pulpo entero' },
          outputs: [{ quantity: 2.1 }, { quantity: 2.04 }],
        },
        {
          inputQuantity: 3n,
          mermaQuantity: 0.5,
          mermaPercent: 16.67,
          inputProduct: { id: 'p1', code: 'PUL-001', name: 'Pulpo entero' },
          outputs: [{ quantity: 1.5 }, { quantity: 1.0 }],
        },
      ]);

      const result = await service.getTransformationSummary('2026-03-05');

      expect(result.totalTransformations).toBe(2);
      expect(result.totalInputKg).toBe(8);
      expect(result.totalMermaKg).toBe(1.36);
      expect(result.avgMermaPercent).toBe(17);
      expect(result.byProduct).toHaveLength(1);
      expect(result.byProduct[0].count).toBe(2);
    });
  });
});
