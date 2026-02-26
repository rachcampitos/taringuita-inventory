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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { StationsService } from './stations.service';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { AssignStationProductsDto } from './dto/assign-station-products.dto';

@ApiTags('Stations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  // ------------------------------------------------------------------
  // POST /stations
  // ------------------------------------------------------------------

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear una nueva estacion (ADMIN)' })
  @ApiResponse({ status: 201, description: 'Estacion creada correctamente' })
  @ApiResponse({ status: 404, description: 'Ubicacion no encontrada' })
  @ApiResponse({ status: 409, description: 'Ya existe una estacion con ese nombre en la ubicacion' })
  create(
    @Body() dto: CreateStationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.stationsService.create(dto, userId);
  }

  // ------------------------------------------------------------------
  // GET /stations  (optional ?locationId=xxx)
  // ------------------------------------------------------------------

  @Get()
  @ApiOperation({ summary: 'Listar estaciones con conteo de usuarios y productos (todos los roles)' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filtrar por ubicacion' })
  @ApiResponse({ status: 200, description: 'Lista de estaciones con _count.assignedUsers y _count.stationProducts' })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.stationsService.findAll(userId, locationId);
  }

  // ------------------------------------------------------------------
  // GET /stations/:id
  // ------------------------------------------------------------------

  @Get(':id')
  @ApiOperation({ summary: 'Obtener estacion por ID con usuarios y productos asignados (todos los roles)' })
  @ApiParam({ name: 'id', description: 'ID de la estacion' })
  @ApiResponse({ status: 200, description: 'Estacion con assignedUsers y products' })
  @ApiResponse({ status: 404, description: 'Estacion no encontrada' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.stationsService.findOne(id, userId);
  }

  // ------------------------------------------------------------------
  // PATCH /stations/:id
  // ------------------------------------------------------------------

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar estacion (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID de la estacion' })
  @ApiResponse({ status: 200, description: 'Estacion actualizada' })
  @ApiResponse({ status: 404, description: 'Estacion no encontrada' })
  @ApiResponse({ status: 409, description: 'El nombre ya existe en la ubicacion' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.stationsService.update(id, dto, userId);
  }

  // ------------------------------------------------------------------
  // DELETE /stations/:id
  // ------------------------------------------------------------------

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar estacion (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID de la estacion' })
  @ApiResponse({ status: 200, description: 'Estacion eliminada' })
  @ApiResponse({ status: 404, description: 'Estacion no encontrada' })
  remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.stationsService.remove(id, userId);
  }

  // ------------------------------------------------------------------
  // PATCH /stations/:id/products
  // ------------------------------------------------------------------

  @Patch(':id/products')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Asignar productos a una estacion, reemplaza la lista actual (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID de la estacion' })
  @ApiResponse({ status: 200, description: 'Productos asignados correctamente' })
  @ApiResponse({ status: 404, description: 'Estacion no encontrada' })
  assignProducts(
    @Param('id') id: string,
    @Body() dto: AssignStationProductsDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.stationsService.assignProducts(id, dto, userId);
  }
}
