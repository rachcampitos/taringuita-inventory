import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // --------------------------------------------------------------------------
  // GET /reports/dashboard
  // --------------------------------------------------------------------------

  @Get('dashboard')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Dashboard principal del administrador',
    description:
      'Devuelve el estado de reportes del dia, resumen de inventario por estacion, resumen de produccion y alertas de stock bajo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos agregados del dashboard',
    schema: {
      example: {
        date: '2025-01-15',
        todayStatus: { totalStations: 4, reportedStations: 3, pendingStations: 1 },
        inventorySummary: [
          {
            stationId: 'clxyz',
            stationName: 'Cocina Fria',
            totalProducts: 20,
            countedProducts: 20,
            isComplete: true,
          },
        ],
        productionSummary: [
          { stationId: 'clxyz', stationName: 'Cocina Fria', totalItemsProduced: 150 },
        ],
        lowStockAlerts: [
          {
            productId: 'clabc',
            productName: 'Aceite de oliva',
            productCode: 'OLV-001',
            stationId: 'clxyz',
            stationName: 'Cocina Fria',
            currentQuantity: 1.5,
            minStock: 5,
          },
        ],
      },
    },
  })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filtrar por local' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Solo administradores' })
  getDashboard(
    @CurrentUser('sub') userId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.reportsService.getDashboard(userId, locationId);
  }

  // --------------------------------------------------------------------------
  // GET /reports/cost-summary?from=&to=&locationId=
  // --------------------------------------------------------------------------

  @Get('cost-summary')
  @Roles(Role.ADMIN, Role.HEAD_CHEF)
  @ApiOperation({
    summary: 'Resumen de costos por categoria y tendencia semanal',
    description:
      'Calcula costos totales y desglosados por categoria usando el consumo semanal y costos unitarios.',
  })
  @ApiQuery({ name: 'from', required: true, example: '2025-01-01' })
  @ApiQuery({ name: 'to', required: true, example: '2025-03-31' })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiResponse({ status: 200, description: 'Resumen de costos' })
  getCostSummary(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.reportsService.getCostSummary(from, to, locationId);
  }

  // --------------------------------------------------------------------------
  // GET /reports/consumption?stationId=&from=&to=
  // --------------------------------------------------------------------------

  @Get('consumption')
  @Roles(Role.ADMIN, Role.HEAD_CHEF)
  @ApiOperation({
    summary: 'Calculo de consumo de una estacion en un rango de fechas',
    description:
      'Consumo = conteo dia anterior + produccion - conteo dia actual. ' +
      'Util para detectar merma y eficiencia operativa.',
  })
  @ApiQuery({
    name: 'stationId',
    required: true,
    description: 'ID de la estacion a analizar',
  })
  @ApiQuery({
    name: 'from',
    required: true,
    example: '2025-01-01',
    description: 'Fecha de inicio del rango (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    example: '2025-01-31',
    description: 'Fecha de fin del rango (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de consumo por producto y dia',
    schema: {
      example: {
        stationId: 'clxyz',
        stationName: 'Cocina Fria',
        from: '2025-01-01',
        to: '2025-01-07',
        rows: [
          {
            productId: 'clabc',
            productName: 'Aceite de oliva',
            productCode: 'OLV-001',
            date: '2025-01-01',
            previousCount: 10,
            production: 0,
            currentCount: 8,
            consumption: 2,
            wastagePercent: 5,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Solo ADMIN y HEAD_CHEF' })
  @ApiResponse({ status: 404, description: 'Estacion no encontrada' })
  getConsumption(
    @Query('stationId') stationId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getConsumption(stationId, from, to);
  }

  // --------------------------------------------------------------------------
  // GET /reports/trends?productId=&from=&to=
  // --------------------------------------------------------------------------

  @Get('trends')
  @Roles(Role.ADMIN, Role.HEAD_CHEF)
  @ApiOperation({
    summary: 'Tendencia de inventario de un producto a lo largo del tiempo',
    description:
      'Muestra la evolucion del stock de un producto en todas las estaciones dia a dia. ' +
      'Util para detectar patrones de consumo, sobrestock o problemas de reposicion.',
  })
  @ApiQuery({
    name: 'productId',
    required: true,
    description: 'ID del producto a analizar',
  })
  @ApiQuery({
    name: 'from',
    required: true,
    example: '2025-01-01',
    description: 'Fecha de inicio del rango (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    example: '2025-01-31',
    description: 'Fecha de fin del rango (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tendencia de inventario por fecha y estacion',
    schema: {
      example: {
        productId: 'clabc',
        productName: 'Aceite de oliva',
        productCode: 'OLV-001',
        from: '2025-01-01',
        to: '2025-01-07',
        trend: [
          {
            date: '2025-01-01',
            counts: [
              { stationId: 'clxyz', stationName: 'Cocina Fria', quantity: 10 },
              { stationId: 'clqrs', stationName: 'Cocina Caliente', quantity: 5 },
            ],
            totalQuantity: 15,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Solo ADMIN y HEAD_CHEF' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  getTrends(
    @Query('productId') productId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getTrends(productId, from, to);
  }
}
