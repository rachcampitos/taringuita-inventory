import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { AddIngredientDto, UpdateIngredientDto } from './dto/add-ingredient.dto';

@ApiTags('Recipes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UsePipes(
  new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
)
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear receta con ingredientes opcionales (ADMIN)' })
  @ApiResponse({ status: 201, description: 'Receta creada' })
  create(@Body() dto: CreateRecipeDto) {
    return this.recipesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.HEAD_CHEF)
  @ApiOperation({ summary: 'Listar recetas paginadas (ADMIN, HEAD_CHEF)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Lista paginada de recetas' })
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ) {
    return this.recipesService.findAll({ page, limit, search });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.HEAD_CHEF)
  @ApiOperation({ summary: 'Detalle de receta con ingredientes (ADMIN, HEAD_CHEF)' })
  @ApiParam({ name: 'id', description: 'ID de la receta' })
  @ApiResponse({ status: 200, description: 'Receta con ingredientes y costos' })
  @ApiResponse({ status: 404, description: 'Receta no encontrada' })
  findOne(@Param('id') id: string) {
    return this.recipesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar receta (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID de la receta' })
  @ApiResponse({ status: 200, description: 'Receta actualizada' })
  @ApiResponse({ status: 404, description: 'Receta no encontrada' })
  update(@Param('id') id: string, @Body() dto: UpdateRecipeDto) {
    return this.recipesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar receta (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID de la receta' })
  @ApiResponse({ status: 200, description: 'Receta eliminada' })
  @ApiResponse({ status: 404, description: 'Receta no encontrada' })
  remove(@Param('id') id: string) {
    return this.recipesService.remove(id);
  }

  @Post(':id/ingredients')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Agregar ingrediente a receta (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID de la receta' })
  @ApiResponse({ status: 201, description: 'Ingrediente agregado' })
  addIngredient(@Param('id') id: string, @Body() dto: AddIngredientDto) {
    return this.recipesService.addIngredient(id, dto);
  }

  @Patch(':id/ingredients/:iid')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Editar cantidad de ingrediente (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID de la receta' })
  @ApiParam({ name: 'iid', description: 'ID del ingrediente' })
  @ApiResponse({ status: 200, description: 'Ingrediente actualizado' })
  updateIngredient(
    @Param('id') id: string,
    @Param('iid') iid: string,
    @Body() dto: UpdateIngredientDto,
  ) {
    return this.recipesService.updateIngredient(id, iid, dto);
  }

  @Delete(':id/ingredients/:iid')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar ingrediente de receta (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID de la receta' })
  @ApiParam({ name: 'iid', description: 'ID del ingrediente' })
  @ApiResponse({ status: 200, description: 'Ingrediente eliminado' })
  removeIngredient(@Param('id') id: string, @Param('iid') iid: string) {
    return this.recipesService.removeIngredient(id, iid);
  }

  @Get(':id/cost')
  @Roles(Role.ADMIN, Role.HEAD_CHEF)
  @ApiOperation({ summary: 'Costo desglosado de receta (ADMIN, HEAD_CHEF)' })
  @ApiParam({ name: 'id', description: 'ID de la receta' })
  @ApiResponse({ status: 200, description: 'Desglose de costos' })
  @ApiResponse({ status: 404, description: 'Receta no encontrada' })
  calculateCost(@Param('id') id: string) {
    return this.recipesService.calculateCost(id);
  }
}
