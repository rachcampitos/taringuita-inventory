import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsService } from '../src/products/products.service';
import { PrismaService } from '../src/prisma/prisma.service';

const mockPrisma = {
  product: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
  },
  productCategory: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  station: { findUnique: jest.fn() },
  stationProduct: { findMany: jest.fn() },
  productPriceHistory: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deberia crear un producto nuevo', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.productCategory.findUnique.mockResolvedValue({ id: 'cat1' });
      mockPrisma.product.create.mockResolvedValue({
        id: 'p1',
        code: 'LECHE-001',
        name: 'Leche',
      });

      const result = await service.create({
        code: 'LECHE-001',
        name: 'Leche',
        categoryId: 'cat1',
        unitOfMeasure: 'LT',
        unitOfOrder: 'CAJAS',
      });

      expect(result.id).toBe('p1');
    });

    it('deberia lanzar ConflictException si el codigo ya existe', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({
          code: 'LECHE-001',
          name: 'Leche',
          categoryId: 'cat1',
          unitOfMeasure: 'LT',
          unitOfOrder: 'CAJAS',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('deberia lanzar NotFoundException si la categoria no existe', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.productCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          code: 'X-001',
          name: 'X',
          categoryId: 'bad',
          unitOfMeasure: 'UN',
          unitOfOrder: 'UN',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('deberia retornar productos paginados', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        50,
        [{ id: 'p1' }, { id: 'p2' }],
      ]);

      const result = await service.findAll({ page: 1, limit: 2 });

      expect(result.meta.total).toBe(50);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.lastPage).toBe(25);
      expect(result.data).toHaveLength(2);
    });

    it('deberia filtrar por busqueda', async () => {
      mockPrisma.$transaction.mockResolvedValue([1, [{ id: 'p1', name: 'Leche' }]]);

      const result = await service.findAll({ search: 'leche' });

      expect(result.data).toHaveLength(1);
    });

    it('deberia filtrar por categoryId', async () => {
      mockPrisma.$transaction.mockResolvedValue([0, []]);

      await service.findAll({ categoryId: 'cat1' });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deberia retornar un producto existente', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        code: 'LECHE-001',
        name: 'Leche',
      });

      const result = await service.findOne('p1');

      expect(result.id).toBe('p1');
    });

    it('deberia lanzar NotFoundException si no existe', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByStation', () => {
    it('deberia retornar productos de la estacion', async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: 'st1', name: 'Montaje' });
      mockPrisma.stationProduct.findMany.mockResolvedValue([
        { sortOrder: 1, product: { id: 'p1', name: 'Leche' } },
      ]);

      const result = await service.findByStation('st1');

      expect(result.stationName).toBe('Montaje');
      expect(result.products).toHaveLength(1);
    });

    it('deberia lanzar NotFoundException si la estacion no existe', async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);

      await expect(service.findByStation('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('deberia actualizar un producto', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.product.update.mockResolvedValue({
        id: 'p1',
        name: 'Leche Entera',
      });

      const result = await service.update('p1', { name: 'Leche Entera' });

      expect(result.name).toBe('Leche Entera');
    });

    it('deberia lanzar ConflictException si el codigo ya existe en otro producto', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p2' }); // conflict

      await expect(
        service.update('p1', { code: 'EXISTING-CODE' }),
      ).rejects.toThrow(ConflictException);
    });

    it('deberia verificar que la categoria existe al cambiarla', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.productCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.update('p1', { categoryId: 'bad-cat' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deberia soft-delete (isActive=false)', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.product.update.mockResolvedValue({
        id: 'p1',
        isActive: false,
      });

      const result = await service.remove('p1');

      expect(result.isActive).toBe(false);
      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: false },
        }),
      );
    });
  });

  describe('updatePrice', () => {
    it('deberia actualizar precio y crear historial', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.$transaction.mockResolvedValue([
        { id: 'p1', unitCost: 2500 },
        { id: 'ph1' },
      ]);

      const result = await service.updatePrice('p1', 2500, 'Aumento proveedor');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('deberia lanzar NotFoundException si producto no existe', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.updatePrice('bad', 100)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPriceHistory', () => {
    it('deberia retornar historial de precios', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.productPriceHistory.findMany.mockResolvedValue([
        { id: 'ph1', unitCost: 2500, effectiveFrom: new Date() },
        { id: 'ph2', unitCost: 2000, effectiveFrom: new Date() },
      ]);

      const result = await service.getPriceHistory('p1');

      expect(result).toHaveLength(2);
    });
  });

  describe('bulkImport', () => {
    it('deberia importar productos nuevos y saltar duplicados', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ code: 'EXISTING' }]);
      mockPrisma.productCategory.findMany.mockResolvedValue([{ id: 'cat1' }]);
      mockPrisma.product.createMany.mockResolvedValue({ count: 1 });

      const result = await service.bulkImport({
        products: [
          { code: 'EXISTING', name: 'Existing', categoryId: 'cat1', unitOfMeasure: 'UN', unitOfOrder: 'UN' },
          { code: 'NEW-001', name: 'New Product', categoryId: 'cat1', unitOfMeasure: 'KG', unitOfOrder: 'KG' },
        ],
      });

      expect(result.total).toBe(2);
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.skippedCodes).toContain('EXISTING');
    });

    it('deberia lanzar NotFoundException si alguna categoria no existe', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.productCategory.findMany.mockResolvedValue([]); // none found

      await expect(
        service.bulkImport({
          products: [
            { code: 'NEW-001', name: 'New', categoryId: 'bad-cat', unitOfMeasure: 'UN', unitOfOrder: 'UN' },
          ],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCategoryNames', () => {
    it('deberia retornar nombres de categorias', async () => {
      mockPrisma.productCategory.findMany.mockResolvedValue([
        { name: 'Carnes' },
        { name: 'Lacteos' },
      ]);

      const result = await service.getCategoryNames();

      expect(result).toEqual(['Carnes', 'Lacteos']);
    });
  });
});
