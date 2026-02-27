import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, RecipeType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { AddIngredientDto, UpdateIngredientDto } from './dto/add-ingredient.dto';

const RECIPE_SELECT = {
  id: true,
  name: true,
  type: true,
  outputProductId: true,
  outputProduct: {
    select: { id: true, code: true, name: true, unitOfMeasure: true },
  },
  outputQuantity: true,
  instructions: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { ingredients: true } },
} as const;

const RECIPE_DETAIL_SELECT = {
  id: true,
  name: true,
  type: true,
  outputProductId: true,
  outputProduct: {
    select: { id: true, code: true, name: true, unitOfMeasure: true },
  },
  outputQuantity: true,
  instructions: true,
  createdAt: true,
  updatedAt: true,
  ingredients: {
    select: {
      id: true,
      productId: true,
      product: {
        select: {
          id: true,
          code: true,
          name: true,
          unitOfMeasure: true,
          unitCost: true,
        },
      },
      quantity: true,
    },
    orderBy: { product: { name: 'asc' as const } },
  },
} as const;

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRecipeDto) {
    return this.prisma.recipe.create({
      data: {
        name: dto.name,
        type: dto.type ?? 'PREPARACION',
        outputProductId: dto.outputProductId,
        outputQuantity: dto.outputQuantity,
        instructions: dto.instructions ?? null,
        ...(dto.ingredients?.length
          ? {
              ingredients: {
                create: dto.ingredients.map((i) => ({
                  productId: i.productId,
                  quantity: i.quantity,
                })),
              },
            }
          : {}),
      },
      select: RECIPE_DETAIL_SELECT,
    });
  }

  async findAll(query: { page?: number; limit?: number; search?: string; type?: string }) {
    const { page = 1, limit = 20, search, type } = query;
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const where: Prisma.RecipeWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        {
          outputProduct: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    if (type) {
      where.type = type as RecipeType;
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.recipe.count({ where }),
      this.prisma.recipe.findMany({
        where,
        select: RECIPE_SELECT,
        orderBy: { name: 'asc' },
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

  async findOne(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      select: RECIPE_DETAIL_SELECT,
    });

    if (!recipe) {
      throw new NotFoundException(`Receta con id "${id}" no encontrada`);
    }

    return recipe;
  }

  async update(id: string, dto: UpdateRecipeDto) {
    await this.ensureExists(id);

    return this.prisma.recipe.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.instructions !== undefined ? { instructions: dto.instructions } : {}),
        ...(dto.outputQuantity !== undefined ? { outputQuantity: dto.outputQuantity } : {}),
      },
      select: RECIPE_DETAIL_SELECT,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);

    return this.prisma.recipe.delete({
      where: { id },
      select: { id: true, name: true },
    });
  }

  async addIngredient(recipeId: string, dto: AddIngredientDto) {
    await this.ensureExists(recipeId);

    try {
      return await this.prisma.recipeIngredient.create({
        data: {
          recipeId,
          productId: dto.productId,
          quantity: dto.quantity,
        },
        select: {
          id: true,
          productId: true,
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              unitOfMeasure: true,
              unitCost: true,
            },
          },
          quantity: true,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Este ingrediente ya existe en la receta');
      }
      throw err;
    }
  }

  async updateIngredient(recipeId: string, ingredientId: string, dto: UpdateIngredientDto) {
    await this.ensureExists(recipeId);

    const ingredient = await this.prisma.recipeIngredient.findFirst({
      where: { id: ingredientId, recipeId },
    });

    if (!ingredient) {
      throw new NotFoundException(`Ingrediente con id "${ingredientId}" no encontrado`);
    }

    return this.prisma.recipeIngredient.update({
      where: { id: ingredientId },
      data: { quantity: dto.quantity },
      select: {
        id: true,
        productId: true,
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            unitOfMeasure: true,
            unitCost: true,
          },
        },
        quantity: true,
      },
    });
  }

  async removeIngredient(recipeId: string, ingredientId: string) {
    await this.ensureExists(recipeId);

    const ingredient = await this.prisma.recipeIngredient.findFirst({
      where: { id: ingredientId, recipeId },
    });

    if (!ingredient) {
      throw new NotFoundException(`Ingrediente con id "${ingredientId}" no encontrado`);
    }

    return this.prisma.recipeIngredient.delete({
      where: { id: ingredientId },
      select: { id: true },
    });
  }

  async calculateCost(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        outputQuantity: true,
        ingredients: {
          select: {
            id: true,
            quantity: true,
            product: {
              select: {
                id: true,
                code: true,
                name: true,
                unitOfMeasure: true,
                unitCost: true,
              },
            },
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Receta con id "${id}" no encontrada`);
    }

    const breakdown = recipe.ingredients.map((ing) => {
      const unitCost = ing.product.unitCost ? Number(ing.product.unitCost) : 0;
      const qty = Number(ing.quantity);
      const lineCost = unitCost * qty;

      return {
        ingredientId: ing.id,
        productId: ing.product.id,
        productName: ing.product.name,
        productCode: ing.product.code,
        unitOfMeasure: ing.product.unitOfMeasure,
        quantity: qty,
        unitCost,
        lineCost,
      };
    });

    const totalCost = breakdown.reduce((sum, b) => sum + b.lineCost, 0);
    const costPerUnit = Number(recipe.outputQuantity) > 0
      ? totalCost / Number(recipe.outputQuantity)
      : 0;

    // Persist cost snapshot fire-and-forget
    this.prisma.recipeCostSnapshot.create({
      data: {
        recipeId: recipe.id,
        totalCost,
        costPerUnit,
        ingredientCount: breakdown.length,
        snapshot: breakdown,
      },
    }).catch(() => {});

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      outputQuantity: Number(recipe.outputQuantity),
      totalCost,
      costPerUnit,
      breakdown,
    };
  }

  async duplicate(id: string) {
    const original = await this.prisma.recipe.findUnique({
      where: { id },
      select: {
        name: true,
        type: true,
        outputProductId: true,
        outputQuantity: true,
        instructions: true,
        ingredients: {
          select: { productId: true, quantity: true },
        },
      },
    });

    if (!original) {
      throw new NotFoundException(`Receta con id "${id}" no encontrada`);
    }

    return this.prisma.recipe.create({
      data: {
        name: `${original.name} (copia)`,
        type: original.type,
        outputProductId: original.outputProductId,
        outputQuantity: original.outputQuantity,
        instructions: original.instructions,
        ...(original.ingredients.length > 0
          ? {
              ingredients: {
                create: original.ingredients.map((i) => ({
                  productId: i.productId,
                  quantity: i.quantity,
                })),
              },
            }
          : {}),
      },
      select: RECIPE_DETAIL_SELECT,
    });
  }

  async getCostHistory(id: string, limit = 10) {
    await this.ensureExists(id);

    return this.prisma.recipeCostSnapshot.findMany({
      where: { recipeId: id },
      orderBy: { calculatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        totalCost: true,
        costPerUnit: true,
        ingredientCount: true,
        calculatedAt: true,
      },
    });
  }

  private async ensureExists(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!recipe) {
      throw new NotFoundException(`Receta con id "${id}" no encontrada`);
    }
  }
}
