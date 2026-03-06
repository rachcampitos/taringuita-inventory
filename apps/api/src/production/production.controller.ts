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
import { ProductionService } from './production.service';
import { CreateProductionLogDto } from './dto/create-production-log.dto';
import { BulkProductionLogDto } from './dto/bulk-production-log.dto';
import { CreateTransformationDto } from './dto/create-transformation.dto';

@ApiTags('Production')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  // --------------------------------------------------------------------------
  // POST /production/log
  // --------------------------------------------------------------------------

  @Post('log')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un log de produccion para un producto en una estacion' })
  @ApiResponse({ status: 201, description: 'Log de produccion registrado correctamente' })
  @ApiResponse({ status: 403, description: 'Sin permiso para registrar en esa estacion' })
  @ApiResponse({ status: 404, description: 'Estacion o producto no encontrado' })
  logProduction(
    @Body() dto: CreateProductionLogDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.productionService.logProduction(dto, userId);
  }

  // --------------------------------------------------------------------------
  // POST /production/log/bulk
  // --------------------------------------------------------------------------

  @Post('log/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Registrar la produccion de multiples productos en una estacion en un solo envio (transaccion)',
  })
  @ApiResponse({ status: 201, description: 'Logs de produccion registrados correctamente' })
  @ApiResponse({ status: 403, description: 'Sin permiso para registrar en esa estacion' })
  @ApiResponse({ status: 404, description: 'Estacion no encontrada' })
  logBulkProduction(
    @Body() dto: BulkProductionLogDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.productionService.logBulkProduction(dto, userId);
  }

  // --------------------------------------------------------------------------
  // GET /production/summary?date=YYYY-MM-DD
  // Must be declared before /:paramRoute patterns to avoid route shadowing
  // --------------------------------------------------------------------------

  @Get('summary')
  @ApiOperation({
    summary:
      'Resumen diario de produccion por estacion (admin): total producido por producto en cada estacion',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    example: '2025-01-15',
    description: 'Fecha a consultar (YYYY-MM-DD). Si se omite, usa hoy.',
  })
  @ApiResponse({ status: 200, description: 'Resumen de produccion del dia' })
  getDailySummary(
    @CurrentUser('sub') userId: string,
    @Query('date') date?: string,
  ) {
    return this.productionService.getDailySummary(userId, date);
  }

  // --------------------------------------------------------------------------
  // POST /production/transformation
  // --------------------------------------------------------------------------

  @Post('transformation')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar una transformacion de produccion (materia prima bruta -> productos porcionados)' })
  @ApiResponse({ status: 201, description: 'Transformacion registrada correctamente' })
  @ApiResponse({ status: 400, description: 'Suma de salidas supera la entrada' })
  @ApiResponse({ status: 403, description: 'Sin permiso para registrar transformaciones' })
  createTransformation(
    @Body() dto: CreateTransformationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.productionService.createTransformation(dto, userId);
  }

  // --------------------------------------------------------------------------
  // GET /production/transformations?date=YYYY-MM-DD
  // --------------------------------------------------------------------------

  @Get('transformations')
  @ApiOperation({ summary: 'Listar transformaciones del dia' })
  @ApiQuery({
    name: 'date',
    required: false,
    example: '2026-03-05',
    description: 'Fecha a consultar (YYYY-MM-DD). Si se omite, usa hoy.',
  })
  @ApiResponse({ status: 200, description: 'Lista de transformaciones del dia' })
  getTransformations(@Query('date') date?: string) {
    return this.productionService.getTransformations(date);
  }

  // --------------------------------------------------------------------------
  // GET /production/transformation/summary?date=YYYY-MM-DD
  // Must be before /:id to avoid route shadowing
  // --------------------------------------------------------------------------

  @Get('transformation/summary')
  @ApiOperation({ summary: 'Resumen de merma y rendimiento del dia' })
  @ApiQuery({
    name: 'date',
    required: false,
    example: '2026-03-05',
    description: 'Fecha a consultar (YYYY-MM-DD). Si se omite, usa hoy.',
  })
  @ApiResponse({ status: 200, description: 'Resumen de transformaciones del dia' })
  getTransformationSummary(@Query('date') date?: string) {
    return this.productionService.getTransformationSummary(date);
  }

  // --------------------------------------------------------------------------
  // GET /production/transformation/:id
  // --------------------------------------------------------------------------

  @Get('transformation/:id')
  @ApiOperation({ summary: 'Detalle de una transformacion por ID' })
  @ApiParam({ name: 'id', description: 'ID de la transformacion' })
  @ApiResponse({ status: 200, description: 'Detalle de la transformacion' })
  @ApiResponse({ status: 404, description: 'Transformacion no encontrada' })
  getTransformationById(@Param('id') id: string) {
    return this.productionService.getTransformationById(id);
  }

  // --------------------------------------------------------------------------
  // GET /production/station/:stationId?date=YYYY-MM-DD
  // --------------------------------------------------------------------------

  @Get('station/:stationId')
  @ApiOperation({
    summary:
      'Obtener los logs de produccion de una estacion para una fecha (todos los roles)',
  })
  @ApiParam({ name: 'stationId', description: 'ID de la estacion' })
  @ApiQuery({
    name: 'date',
    required: false,
    example: '2025-01-15',
    description: 'Fecha de produccion (YYYY-MM-DD). Si se omite, usa hoy.',
  })
  @ApiResponse({ status: 200, description: 'Logs de produccion de la estacion en la fecha indicada' })
  @ApiResponse({ status: 404, description: 'Estacion no encontrada' })
  getStationLogs(
    @Param('stationId') stationId: string,
    @Query('date') date?: string,
  ) {
    return this.productionService.getStationLogs(stationId, date);
  }

  // --------------------------------------------------------------------------
  // GET /production/station/:stationId/history?from=&to=
  // --------------------------------------------------------------------------

  @Get('station/:stationId/history')
  @ApiOperation({
    summary: 'Historial de produccion de una estacion en un rango de fechas (todos los roles)',
  })
  @ApiParam({ name: 'stationId', description: 'ID de la estacion' })
  @ApiQuery({ name: 'from', required: true, example: '2025-01-01', description: 'Fecha inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: true, example: '2025-01-31', description: 'Fecha fin (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Historial de produccion de la estacion' })
  @ApiResponse({ status: 404, description: 'Estacion no encontrada' })
  getStationHistory(
    @Param('stationId') stationId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.productionService.getStationHistory(stationId, from, to);
  }
}
