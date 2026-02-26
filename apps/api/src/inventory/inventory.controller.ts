import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';
import { CreateInventoryCountDto } from './dto/create-inventory-count.dto';
import { BulkInventoryCountDto } from './dto/bulk-inventory-count.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // --------------------------------------------------------------------------
  // POST /inventory/count
  // --------------------------------------------------------------------------

  @Post('count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar o actualizar el conteo de un producto en una estacion (upsert)',
  })
  @ApiResponse({ status: 200, description: 'Conteo guardado correctamente' })
  @ApiResponse({ status: 403, description: 'Sin permiso para registrar en esa estacion' })
  @ApiResponse({ status: 404, description: 'Estacion o producto no encontrado' })
  submitCount(
    @Body() dto: CreateInventoryCountDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.inventoryService.submitCount(dto, userId);
  }

  // --------------------------------------------------------------------------
  // POST /inventory/count/bulk
  // --------------------------------------------------------------------------

  @Post('count/bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Registrar todos los conteos de una estacion en un solo envio (flujo principal del sous-chef)',
  })
  @ApiResponse({ status: 200, description: 'Conteos guardados correctamente' })
  @ApiResponse({ status: 403, description: 'Sin permiso para registrar en esa estacion' })
  @ApiResponse({ status: 404, description: 'Estacion no encontrada' })
  submitBulkCount(
    @Body() dto: BulkInventoryCountDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.inventoryService.submitBulkCount(dto, userId);
  }

  // --------------------------------------------------------------------------
  // GET /inventory/status?date=YYYY-MM-DD
  // Must be declared before /:paramRoute patterns to avoid route shadowing
  // --------------------------------------------------------------------------

  @Get('status')
  @ApiOperation({
    summary:
      'Estado diario del inventario: estaciones que reportaron y estaciones pendientes (todos los roles)',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    example: '2025-01-15',
    description: 'Fecha a consultar (YYYY-MM-DD). Si se omite, usa hoy.',
  })
  @ApiResponse({ status: 200, description: 'Estado diario del inventario' })
  getDailyStatus(
    @CurrentUser('sub') userId: string,
    @Query('date') date?: string,
  ) {
    return this.inventoryService.getDailyStatus(userId, date);
  }

  // --------------------------------------------------------------------------
  // GET /inventory/station/:stationId?date=YYYY-MM-DD
  // --------------------------------------------------------------------------

  @Get('station/:stationId')
  @ApiOperation({
    summary:
      'Obtener conteos de una estacion para una fecha, agrupados por categoria (todos los roles)',
  })
  @ApiParam({ name: 'stationId', description: 'ID de la estacion' })
  @ApiQuery({
    name: 'date',
    required: false,
    example: '2025-01-15',
    description: 'Fecha del conteo (YYYY-MM-DD). Si se omite, usa hoy.',
  })
  @ApiResponse({
    status: 200,
    description: 'Productos de la estacion con su cantidad contada (null si aun no fue contado)',
  })
  @ApiResponse({ status: 404, description: 'Estacion no encontrada' })
  getStationCounts(
    @Param('stationId') stationId: string,
    @Query('date') date?: string,
  ) {
    return this.inventoryService.getStationCounts(stationId, date);
  }

  // --------------------------------------------------------------------------
  // GET /inventory/station/:stationId/history?from=&to=
  // --------------------------------------------------------------------------

  @Get('station/:stationId/history')
  @ApiOperation({
    summary: 'Historial de conteos de una estacion en un rango de fechas (todos los roles)',
  })
  @ApiParam({ name: 'stationId', description: 'ID de la estacion' })
  @ApiQuery({ name: 'from', required: true, example: '2025-01-01', description: 'Fecha inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: true, example: '2025-01-31', description: 'Fecha fin (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Historial de conteos de la estacion' })
  @ApiResponse({ status: 404, description: 'Estacion no encontrada' })
  getStationHistory(
    @Param('stationId') stationId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.inventoryService.getStationHistory(stationId, from, to);
  }

  // --------------------------------------------------------------------------
  // GET /inventory/product/:productId/history?from=&to=
  // --------------------------------------------------------------------------

  @Get('product/:productId/history')
  @ApiOperation({
    summary:
      'Historial de conteos de un producto especifico en todas las estaciones (todos los roles)',
  })
  @ApiParam({ name: 'productId', description: 'ID del producto' })
  @ApiQuery({ name: 'from', required: true, example: '2025-01-01', description: 'Fecha inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: true, example: '2025-01-31', description: 'Fecha fin (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Historial del producto en todas las estaciones' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  getProductHistory(
    @Param('productId') productId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.inventoryService.getProductHistory(productId, from, to);
  }
}
