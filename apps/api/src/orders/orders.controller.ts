import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrderStatus, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrdersService } from './orders.service';
import { ConsumptionScheduler } from './consumption.scheduler';
import { GenerateOrderDto } from './dto/generate-order.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UsePipes(
  new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly consumptionScheduler: ConsumptionScheduler,
  ) {}

  // ------------------------------------------------------------------
  // POST /orders/generate
  // ------------------------------------------------------------------

  @Post('generate')
  @Roles(Role.ADMIN, Role.HEAD_CHEF)
  @ApiOperation({ summary: 'Generar pedido automatico basado en consumo (ADMIN, HEAD_CHEF)' })
  @ApiResponse({ status: 201, description: 'Pedido generado con items sugeridos' })
  @ApiResponse({ status: 404, description: 'Local no encontrado' })
  generate(@Body() dto: GenerateOrderDto, @Req() req: any) {
    return this.ordersService.generate(dto, req.user.id);
  }

  // ------------------------------------------------------------------
  // GET /orders
  // ------------------------------------------------------------------

  @Get()
  @Roles(Role.ADMIN, Role.HEAD_CHEF)
  @ApiOperation({ summary: 'Listar pedidos con filtros (ADMIN, HEAD_CHEF)' })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista paginada de pedidos' })
  findAll(
    @Query('locationId') locationId?: string,
    @Query('status') status?: OrderStatus,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.ordersService.findAll({ locationId, status, page, limit });
  }

  // ------------------------------------------------------------------
  // GET /orders/weekly-consumption
  // ------------------------------------------------------------------

  @Get('weekly-consumption')
  @Roles(Role.ADMIN, Role.HEAD_CHEF)
  @ApiOperation({ summary: 'Consumo historico semanal de un producto (ADMIN, HEAD_CHEF)' })
  @ApiQuery({ name: 'productId', required: true })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'weeks', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Historial de consumo semanal' })
  getWeeklyConsumption(
    @Query('productId') productId: string,
    @Query('locationId') locationId?: string,
    @Query('weeks', new ParseIntPipe({ optional: true })) weeks?: number,
  ) {
    return this.ordersService.getWeeklyConsumption(productId, locationId, weeks);
  }

  // ------------------------------------------------------------------
  // POST /orders/calculate-consumption
  // ------------------------------------------------------------------

  @Post('calculate-consumption')
  @Roles(Role.ADMIN, Role.HEAD_CHEF)
  @ApiOperation({ summary: 'Calcular consumo semanal para un local y rango de fechas' })
  @ApiResponse({ status: 201, description: 'Consumo calculado y guardado' })
  calculateConsumption(
    @Body() body: { locationId: string; weekStart: string; weekEnd: string },
  ) {
    return this.ordersService.calculateWeeklyConsumption(
      body.locationId,
      new Date(body.weekStart),
      new Date(body.weekEnd),
    );
  }

  // ------------------------------------------------------------------
  // POST /orders/calculate-consumption/all
  // ------------------------------------------------------------------

  @Post('calculate-consumption/all')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Calcular consumo semanal para todos los locales (ADMIN)' })
  @ApiResponse({ status: 201, description: 'Consumo calculado para todos los locales' })
  calculateConsumptionAll() {
    return this.consumptionScheduler.calculateAllLocations();
  }

  // ------------------------------------------------------------------
  // GET /orders/:id
  // ------------------------------------------------------------------

  @Get(':id')
  @Roles(Role.ADMIN, Role.HEAD_CHEF)
  @ApiOperation({ summary: 'Detalle de un pedido con items (ADMIN, HEAD_CHEF)' })
  @ApiParam({ name: 'id', description: 'ID del pedido' })
  @ApiResponse({ status: 200, description: 'Pedido con items' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  // ------------------------------------------------------------------
  // PATCH /orders/:id/items/:itemId
  // ------------------------------------------------------------------

  @Patch(':id/items/:itemId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Editar cantidad confirmada de un item (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID del pedido' })
  @ApiParam({ name: 'itemId', description: 'ID del item' })
  @ApiResponse({ status: 200, description: 'Item actualizado' })
  @ApiResponse({ status: 404, description: 'Pedido o item no encontrado' })
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemDto,
  ) {
    return this.ordersService.updateItem(id, itemId, dto);
  }

  // ------------------------------------------------------------------
  // PATCH /orders/:id/status
  // ------------------------------------------------------------------

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cambiar estado del pedido (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID del pedido' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 400, description: 'Transicion de estado no valida' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  // ------------------------------------------------------------------
  // GET /orders/:id/export
  // ------------------------------------------------------------------

  @Get(':id/export')
  @Roles(Role.ADMIN, Role.HEAD_CHEF)
  @ApiOperation({ summary: 'Exportar pedido para el bodeguero (ADMIN, HEAD_CHEF)' })
  @ApiParam({ name: 'id', description: 'ID del pedido' })
  @ApiResponse({ status: 200, description: 'Datos agrupados por categoria' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  exportOrder(@Param('id') id: string) {
    return this.ordersService.exportOrder(id);
  }

  // ------------------------------------------------------------------
  // GET /orders/:id/export/pdf
  // ------------------------------------------------------------------

  @Get(':id/export/pdf')
  @Roles(Role.ADMIN, Role.HEAD_CHEF)
  @ApiOperation({ summary: 'Descargar pedido como PDF (ADMIN, HEAD_CHEF)' })
  @ApiParam({ name: 'id', description: 'ID del pedido' })
  @ApiResponse({ status: 200, description: 'Archivo PDF' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  async exportPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.ordersService.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="pedido-${id.slice(0, 8)}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ------------------------------------------------------------------
  // GET /orders/:id/export/excel
  // ------------------------------------------------------------------

  @Get(':id/export/excel')
  @Roles(Role.ADMIN, Role.HEAD_CHEF)
  @ApiOperation({ summary: 'Descargar pedido como Excel (ADMIN, HEAD_CHEF)' })
  @ApiParam({ name: 'id', description: 'ID del pedido' })
  @ApiResponse({ status: 200, description: 'Archivo Excel' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  async exportExcel(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.ordersService.generateExcel(id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="pedido-${id.slice(0, 8)}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
