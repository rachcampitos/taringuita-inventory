import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BulkImportProductDto, BulkImportResultDto } from './dto/bulk-import-product.dto';

// Fields consistently selected for every product response
const PRODUCT_SELECT = {
  id: true,
  code: true,
  name: true,
  categoryId: true,
  category: { select: { id: true, name: true } },
  unitOfMeasure: true,
  unitOfOrder: true,
  conversionFactor: true,
  minStock: true,
  maxStock: true,
  wastagePercent: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface FindAllProductsQuery {
  categoryId?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // Create
  // ------------------------------------------------------------------

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un producto con el codigo "${dto.code}"`,
      );
    }

    await this.assertCategoryExists(dto.categoryId);

    return this.prisma.product.create({
      data: {
        code: dto.code,
        name: dto.name,
        categoryId: dto.categoryId,
        unitOfMeasure: dto.unitOfMeasure,
        unitOfOrder: dto.unitOfOrder,
        conversionFactor: dto.conversionFactor ?? 1,
        minStock: dto.minStock ?? null,
        maxStock: dto.maxStock ?? null,
        wastagePercent: dto.wastagePercent ?? 0,
        isActive: dto.isActive ?? true,
      },
      select: PRODUCT_SELECT,
    });
  }

  // ------------------------------------------------------------------
  // Read – list with filters and pagination
  // ------------------------------------------------------------------

  async findAll(query: FindAllProductsQuery) {
    const {
      categoryId,
      search,
      isActive,
      page = 1,
      limit = 20,
    } = query;

    const take = Math.min(limit, 100); // hard cap
    const skip = (page - 1) * take;

    const where: Prisma.ProductWhereInput = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        select: PRODUCT_SELECT,
        orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
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
  // Read – single product
  // ------------------------------------------------------------------

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: PRODUCT_SELECT,
    });

    if (!product) {
      throw new NotFoundException(`Producto con id "${id}" no encontrado`);
    }

    return product;
  }

  // ------------------------------------------------------------------
  // Read – products assigned to a station (via StationProduct join table)
  // ------------------------------------------------------------------

  async findByStation(stationId: string) {
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { id: true, name: true },
    });

    if (!station) {
      throw new NotFoundException(`Estacion con id "${stationId}" no encontrada`);
    }

    const rows = await this.prisma.stationProduct.findMany({
      where: { stationId },
      orderBy: { sortOrder: 'asc' },
      select: {
        sortOrder: true,
        product: { select: PRODUCT_SELECT },
      },
    });

    return {
      stationId: station.id,
      stationName: station.name,
      products: rows.map((r) => ({ ...r.product, sortOrder: r.sortOrder })),
    };
  }

  // ------------------------------------------------------------------
  // Update
  // ------------------------------------------------------------------

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id); // throws NotFoundException if missing

    if (dto.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }

    if (dto.code) {
      const conflict = await this.prisma.product.findFirst({
        where: { code: dto.code, NOT: { id } },
      });

      if (conflict) {
        throw new ConflictException(
          `Ya existe otro producto con el codigo "${dto.code}"`,
        );
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
      select: PRODUCT_SELECT,
    });
  }

  // ------------------------------------------------------------------
  // Remove (soft delete)
  // ------------------------------------------------------------------

  async remove(id: string) {
    await this.findOne(id); // throws NotFoundException if missing

    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
      select: PRODUCT_SELECT,
    });
  }

  // ------------------------------------------------------------------
  // Bulk import
  // ------------------------------------------------------------------

  async bulkImport(dto: BulkImportProductDto): Promise<BulkImportResultDto> {
    const skippedCodes: string[] = [];
    let created = 0;

    // Load existing codes in one query to avoid N+1
    const incomingCodes = dto.products.map((p) => p.code);
    const existingProducts = await this.prisma.product.findMany({
      where: { code: { in: incomingCodes } },
      select: { code: true },
    });
    const existingCodes = new Set(existingProducts.map((p) => p.code));

    // Partition into new and duplicates
    const toCreate = dto.products.filter((p) => {
      if (existingCodes.has(p.code)) {
        skippedCodes.push(p.code);
        return false;
      }
      return true;
    });

    if (toCreate.length > 0) {
      // Validate all referenced categories exist before inserting
      const categoryIds = [...new Set(toCreate.map((p) => p.categoryId))];
      const foundCategories = await this.prisma.productCategory.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true },
      });

      if (foundCategories.length !== categoryIds.length) {
        const foundIds = new Set(foundCategories.map((c) => c.id));
        const missingIds = categoryIds.filter((cid) => !foundIds.has(cid));
        throw new NotFoundException(
          `Categorias no encontradas: ${missingIds.join(', ')}`,
        );
      }

      await this.prisma.product.createMany({
        data: toCreate.map((p) => ({
          code: p.code,
          name: p.name,
          categoryId: p.categoryId,
          unitOfMeasure: p.unitOfMeasure,
          unitOfOrder: p.unitOfOrder,
          conversionFactor: p.conversionFactor ?? 1,
          minStock: p.minStock ?? null,
          maxStock: p.maxStock ?? null,
          wastagePercent: p.wastagePercent ?? 0,
          isActive: p.isActive ?? true,
        })),
        skipDuplicates: true,
      });

      created = toCreate.length;
    }

    return {
      total: dto.products.length,
      created,
      skipped: skippedCodes.length,
      skippedCodes,
    };
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.productCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException(
        `Categoria con id "${categoryId}" no encontrada`,
      );
    }
  }
}
