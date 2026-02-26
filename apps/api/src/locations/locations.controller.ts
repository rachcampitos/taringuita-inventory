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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@ApiTags('Locations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // ------------------------------------------------------------------
  // POST /locations
  // ------------------------------------------------------------------

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear una nueva ubicacion (ADMIN)' })
  @ApiResponse({ status: 201, description: 'Ubicacion creada correctamente' })
  @ApiResponse({ status: 409, description: 'Ya existe una ubicacion con ese nombre' })
  create(
    @Body() dto: CreateLocationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.locationsService.create(dto, userId);
  }

  // ------------------------------------------------------------------
  // GET /locations
  // ------------------------------------------------------------------

  @Get()
  @ApiOperation({ summary: 'Listar ubicaciones de la organizacion con conteo de estaciones (todos los roles)' })
  @ApiResponse({ status: 200, description: 'Lista de ubicaciones con _count.stations' })
  findAll(@CurrentUser('sub') userId: string) {
    return this.locationsService.findAll(userId);
  }

  // ------------------------------------------------------------------
  // GET /locations/:id
  // ------------------------------------------------------------------

  @Get(':id')
  @ApiOperation({ summary: 'Obtener ubicacion por ID con lista de estaciones (todos los roles)' })
  @ApiParam({ name: 'id', description: 'ID de la ubicacion' })
  @ApiResponse({ status: 200, description: 'Ubicacion encontrada con estaciones' })
  @ApiResponse({ status: 404, description: 'Ubicacion no encontrada' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.locationsService.findOne(id, userId);
  }

  // ------------------------------------------------------------------
  // PATCH /locations/:id
  // ------------------------------------------------------------------

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar ubicacion (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID de la ubicacion' })
  @ApiResponse({ status: 200, description: 'Ubicacion actualizada' })
  @ApiResponse({ status: 404, description: 'Ubicacion no encontrada' })
  @ApiResponse({ status: 409, description: 'El nombre ya pertenece a otra ubicacion' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.locationsService.update(id, dto, userId);
  }

  // ------------------------------------------------------------------
  // DELETE /locations/:id
  // ------------------------------------------------------------------

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar ubicacion (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID de la ubicacion' })
  @ApiResponse({ status: 200, description: 'Ubicacion eliminada' })
  @ApiResponse({ status: 404, description: 'Ubicacion no encontrada' })
  remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.locationsService.remove(id, userId);
  }
}
