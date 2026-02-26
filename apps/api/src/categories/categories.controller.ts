import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ------------------------------------------------------------------
  // POST /categories
  // ------------------------------------------------------------------

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear una nueva categoria (ADMIN)' })
  @ApiResponse({ status: 201, description: 'Categoria creada correctamente' })
  @ApiResponse({ status: 409, description: 'Ya existe una categoria con ese nombre' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  // ------------------------------------------------------------------
  // GET /categories
  // ------------------------------------------------------------------

  @Get()
  @ApiOperation({
    summary: 'Listar todas las categorias con conteo de productos (todos los roles)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorias ordenadas por sortOrder y nombre',
  })
  findAll() {
    return this.categoriesService.findAll();
  }

  // ------------------------------------------------------------------
  // GET /categories/:id
  // ------------------------------------------------------------------

  @Get(':id')
  @ApiOperation({ summary: 'Obtener categoria por ID con sus productos (todos los roles)' })
  @ApiParam({ name: 'id', description: 'ID de la categoria' })
  @ApiResponse({ status: 200, description: 'Categoria encontrada con lista de productos' })
  @ApiResponse({ status: 404, description: 'Categoria no encontrada' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  // ------------------------------------------------------------------
  // PATCH /categories/:id
  // ------------------------------------------------------------------

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar categoria (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID de la categoria' })
  @ApiResponse({ status: 200, description: 'Categoria actualizada' })
  @ApiResponse({ status: 404, description: 'Categoria no encontrada' })
  @ApiResponse({ status: 409, description: 'Ya existe una categoria con ese nombre' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  // ------------------------------------------------------------------
  // DELETE /categories/:id
  // ------------------------------------------------------------------

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar categoria (ADMIN) – falla si tiene productos asociados' })
  @ApiParam({ name: 'id', description: 'ID de la categoria' })
  @ApiResponse({ status: 200, description: 'Categoria eliminada' })
  @ApiResponse({ status: 404, description: 'Categoria no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'La categoria tiene productos asociados y no puede eliminarse',
  })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
