import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

// Fields selected for list responses (includes product count)
const CATEGORY_LIST_SELECT = {
  id: true,
  name: true,
  description: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { products: true } },
} as const;

// Fields selected for detail response (includes full products)
const CATEGORY_DETAIL_SELECT = {
  id: true,
  name: true,
  description: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  products: {
    select: {
      id: true,
      code: true,
      name: true,
      unitOfMeasure: true,
      isActive: true,
    },
    orderBy: { name: 'asc' as const },
  },
} as const;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // Create
  // ------------------------------------------------------------------

  async create(dto: CreateCategoryDto) {
    await this.assertNameAvailable(dto.name);

    return this.prisma.productCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
      },
      select: CATEGORY_LIST_SELECT,
    });
  }

  // ------------------------------------------------------------------
  // Read – list ordered by sortOrder then name
  // ------------------------------------------------------------------

  async findAll() {
    return this.prisma.productCategory.findMany({
      select: CATEGORY_LIST_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  // ------------------------------------------------------------------
  // Read – single category with its products
  // ------------------------------------------------------------------

  async findOne(id: string) {
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
      select: CATEGORY_DETAIL_SELECT,
    });

    if (!category) {
      throw new NotFoundException(`Categoria con id "${id}" no encontrada`);
    }

    return category;
  }

  // ------------------------------------------------------------------
  // Update
  // ------------------------------------------------------------------

  async update(id: string, dto: UpdateCategoryDto) {
    await this.assertExists(id);

    if (dto.name) {
      await this.assertNameAvailable(dto.name, id);
    }

    return this.prisma.productCategory.update({
      where: { id },
      data: dto,
      select: CATEGORY_LIST_SELECT,
    });
  }

  // ------------------------------------------------------------------
  // Remove (hard delete – blocked if category has linked products)
  // ------------------------------------------------------------------

  async remove(id: string) {
    await this.assertExists(id);

    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la categoria porque tiene ${productCount} producto(s) asociado(s). ` +
          'Reasigna o elimina los productos primero.',
      );
    }

    return this.prisma.productCategory.delete({
      where: { id },
      select: { id: true, name: true },
    });
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.productCategory.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Categoria con id "${id}" no encontrada`);
    }
  }

  private async assertNameAvailable(name: string, excludeId?: string): Promise<void> {
    const conflict = await this.prisma.productCategory.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (conflict) {
      throw new ConflictException(
        `Ya existe una categoria con el nombre "${name}"`,
      );
    }
  }
}
