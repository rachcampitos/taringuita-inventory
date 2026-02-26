import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BulkImportProductDto, BulkImportResultDto } from './dto/bulk-import-product.dto';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ------------------------------------------------------------------
  // POST /products/bulk-import  – declared before :id to avoid shadowing
  // ------------------------------------------------------------------

  @Post('bulk-import')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Importacion masiva de productos desde Excel (ADMIN)',
    description:
      'Recibe un array de productos (tipicamente parseado desde Excel) y los inserta en bloque. ' +
      'Los productos cuyo codigo ya existe son omitidos sin error.',
  })
  @ApiResponse({
    status: 200,
    type: BulkImportResultDto,
    description: 'Resumen de la importacion',
  })
  @ApiResponse({ status: 400, description: 'Payload invalido o errores de validacion' })
  @ApiResponse({ status: 404, description: 'Una o mas categorias no existen' })
  bulkImport(@Body() dto: BulkImportProductDto): Promise<BulkImportResultDto> {
    return this.productsService.bulkImport(dto);
  }

  // ------------------------------------------------------------------
  // POST /products
  // ------------------------------------------------------------------

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear un nuevo producto (ADMIN)' })
  @ApiResponse({ status: 201, description: 'Producto creado correctamente' })
  @ApiResponse({ status: 409, description: 'El codigo de producto ya existe' })
  @ApiResponse({ status: 404, description: 'Categoria no encontrada' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  // ------------------------------------------------------------------
  // GET /products
  // ------------------------------------------------------------------

  @Get()
  @ApiOperation({
    summary: 'Listar productos con filtros y paginacion (todos los roles)',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filtrar por ID de categoria',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Busqueda parcial por nombre o codigo',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrar por estado activo/inactivo',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Pagina (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Resultados por pagina (default 20, max 100)',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filtrar por nombre de categoria',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de productos' })
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('isActive', new ParseBoolPipe({ optional: true })) isActive?: boolean,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.productsService.findAll({ categoryId, category, search, isActive, page, limit });
  }

  // ------------------------------------------------------------------
  // GET /products/categories
  // ------------------------------------------------------------------

  @Get('categories')
  @ApiOperation({ summary: 'Listar nombres de categorias con productos activos' })
  @ApiResponse({ status: 200, description: 'Array de nombres de categorias' })
  getCategories() {
    return this.productsService.getCategoryNames();
  }

  // ------------------------------------------------------------------
  // GET /products/by-station/:stationId
  // ------------------------------------------------------------------

  @Get('by-station/:stationId')
  @ApiOperation({
    summary: 'Obtener productos asignados a una estacion (todos los roles)',
  })
  @ApiParam({ name: 'stationId', description: 'ID de la estacion' })
  @ApiResponse({
    status: 200,
    description: 'Productos de la estacion, ordenados por sortOrder',
  })
  @ApiResponse({ status: 404, description: 'Estacion no encontrada' })
  findByStation(@Param('stationId') stationId: string) {
    return this.productsService.findByStation(stationId);
  }

  // ------------------------------------------------------------------
  // GET /products/:id
  // ------------------------------------------------------------------

  @Get(':id')
  @ApiOperation({ summary: 'Obtener producto por ID (todos los roles)' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Producto encontrado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // ------------------------------------------------------------------
  // PATCH /products/:id/price
  // ------------------------------------------------------------------

  @Patch(':id/price')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar precio unitario + crear historial (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Precio actualizado y registrado en historial' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  updatePrice(
    @Param('id') id: string,
    @Body() body: { unitCost: number; notes?: string },
  ) {
    return this.productsService.updatePrice(id, body.unitCost, body.notes);
  }

  // ------------------------------------------------------------------
  // GET /products/:id/price-history
  // ------------------------------------------------------------------

  @Get(':id/price-history')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Historial de precios de un producto (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Lista de cambios de precio' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  getPriceHistory(
    @Param('id') id: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.productsService.getPriceHistory(id, limit);
  }

  // ------------------------------------------------------------------
  // PATCH /products/:id
  // ------------------------------------------------------------------

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar producto (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Producto actualizado' })
  @ApiResponse({ status: 404, description: 'Producto o categoria no encontrada' })
  @ApiResponse({ status: 409, description: 'El nuevo codigo ya pertenece a otro producto' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  // ------------------------------------------------------------------
  // DELETE /products/:id
  // ------------------------------------------------------------------

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar producto – soft delete (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Producto desactivado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
