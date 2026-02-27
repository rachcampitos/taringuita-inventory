import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RecipesService } from '../src/recipes/recipes.service';
import { PrismaService } from '../src/prisma/prisma.service';

const mockPrisma = {
  recipe: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  recipeIngredient: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  recipeCostSnapshot: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('RecipesService', () => {
  let service: RecipesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deberia crear una receta sin ingredientes', async () => {
      const dto = {
        name: 'Salsa Roja',
        outputProductId: 'p1',
        outputQuantity: 5,
      };

      const mockRecipe = {
        id: 'r1',
        name: 'Salsa Roja',
        outputProductId: 'p1',
        outputProduct: { id: 'p1', code: 'SALSA-001', name: 'Salsa Roja', unitOfMeasure: 'LT' },
        outputQuantity: 5,
        instructions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ingredients: [],
      };

      mockPrisma.recipe.create.mockResolvedValue(mockRecipe);

      const result = await service.create(dto);

      expect(result.name).toBe('Salsa Roja');
      expect(mockPrisma.recipe.create).toHaveBeenCalledTimes(1);
    });

    it('deberia crear una receta con ingredientes', async () => {
      const dto = {
        name: 'Salsa Roja',
        outputProductId: 'p1',
        outputQuantity: 5,
        ingredients: [
          { productId: 'p2', quantity: 2 },
          { productId: 'p3', quantity: 0.5 },
        ],
      };

      mockPrisma.recipe.create.mockResolvedValue({
        id: 'r1',
        name: 'Salsa Roja',
        ingredients: [
          { id: 'i1', productId: 'p2', quantity: 2 },
          { id: 'i2', productId: 'p3', quantity: 0.5 },
        ],
      });

      const result = await service.create(dto);

      expect(result.ingredients).toHaveLength(2);
    });
  });

  describe('findAll', () => {
    it('deberia retornar recetas paginadas', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        2,
        [
          { id: 'r1', name: 'Salsa Roja', _count: { ingredients: 3 } },
          { id: 'r2', name: 'Masa Pizza', _count: { ingredients: 5 } },
        ],
      ]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('deberia filtrar por busqueda', async () => {
      mockPrisma.$transaction.mockResolvedValue([1, [{ id: 'r1', name: 'Salsa Roja' }]]);

      const result = await service.findAll({ search: 'salsa' });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('deberia lanzar NotFoundException si la receta no existe', async () => {
      mockPrisma.recipe.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deberia retornar la receta con ingredientes', async () => {
      mockPrisma.recipe.findUnique.mockResolvedValue({
        id: 'r1',
        name: 'Salsa',
        ingredients: [
          { id: 'i1', product: { name: 'Tomate' }, quantity: 2 },
        ],
      });

      const result = await service.findOne('r1');

      expect(result.name).toBe('Salsa');
      expect(result.ingredients).toHaveLength(1);
    });
  });

  describe('calculateCost', () => {
    it('deberia calcular el costo total y por unidad', async () => {
      mockPrisma.recipe.findUnique.mockResolvedValue({
        id: 'r1',
        name: 'Salsa Roja',
        outputQuantity: 5,
        ingredients: [
          {
            id: 'i1',
            quantity: 2,
            product: { id: 'p1', code: 'TOM-001', name: 'Tomate', unitOfMeasure: 'KG', unitCost: 1500 },
          },
          {
            id: 'i2',
            quantity: 0.5,
            product: { id: 'p2', code: 'ACE-001', name: 'Aceite', unitOfMeasure: 'LT', unitCost: 3000 },
          },
        ],
      });

      const result = await service.calculateCost('r1');

      expect(result.totalCost).toBe(2 * 1500 + 0.5 * 3000); // 4500
      expect(result.costPerUnit).toBe(4500 / 5); // 900
      expect(result.breakdown).toHaveLength(2);
    });

    it('deberia manejar ingredientes sin costo', async () => {
      mockPrisma.recipe.findUnique.mockResolvedValue({
        id: 'r1',
        name: 'Test',
        outputQuantity: 1,
        ingredients: [
          {
            id: 'i1',
            quantity: 1,
            product: { id: 'p1', code: 'X', name: 'X', unitOfMeasure: 'UN', unitCost: null },
          },
        ],
      });

      const result = await service.calculateCost('r1');

      expect(result.totalCost).toBe(0);
      expect(result.breakdown[0].unitCost).toBe(0);
    });

    it('deberia lanzar NotFoundException si la receta no existe', async () => {
      mockPrisma.recipe.findUnique.mockResolvedValue(null);

      await expect(service.calculateCost('bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addIngredient', () => {
    it('deberia agregar un ingrediente a una receta existente', async () => {
      mockPrisma.recipe.findUnique.mockResolvedValue({ id: 'r1' });
      mockPrisma.recipeIngredient.create.mockResolvedValue({
        id: 'i1',
        productId: 'p1',
        product: { id: 'p1', code: 'X', name: 'Tomate', unitOfMeasure: 'KG', unitCost: 1000 },
        quantity: 2,
      });

      const result = await service.addIngredient('r1', {
        productId: 'p1',
        quantity: 2,
      });

      expect(result.id).toBe('i1');
      expect(result.quantity).toBe(2);
    });
  });

  describe('removeIngredient', () => {
    it('deberia eliminar un ingrediente existente', async () => {
      mockPrisma.recipe.findUnique.mockResolvedValue({ id: 'r1' });
      mockPrisma.recipeIngredient.findFirst.mockResolvedValue({
        id: 'i1',
        recipeId: 'r1',
      });
      mockPrisma.recipeIngredient.delete.mockResolvedValue({ id: 'i1' });

      const result = await service.removeIngredient('r1', 'i1');

      expect(result.id).toBe('i1');
    });

    it('deberia lanzar NotFoundException si el ingrediente no existe', async () => {
      mockPrisma.recipe.findUnique.mockResolvedValue({ id: 'r1' });
      mockPrisma.recipeIngredient.findFirst.mockResolvedValue(null);

      await expect(service.removeIngredient('r1', 'bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
