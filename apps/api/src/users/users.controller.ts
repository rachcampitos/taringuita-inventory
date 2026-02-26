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
import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class AssignStationsDto {
  @ApiProperty({ example: ['cuid_station_1', 'cuid_station_2'] })
  @IsArray()
  @IsString({ each: true })
  stationIds: string[];
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ------------------------------------------------------------------
  // Current user profile - accessible by any authenticated role
  // ------------------------------------------------------------------

  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario actual' })
  getMe(@CurrentUser('sub') userId: string) {
    return this.usersService.findMe(userId);
  }

  // ------------------------------------------------------------------
  // CRUD - ADMIN only
  // ------------------------------------------------------------------

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear un nuevo usuario (ADMIN)' })
  @ApiResponse({ status: 201, description: 'Usuario creado correctamente' })
  @ApiResponse({ status: 409, description: 'El email ya esta registrado' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar usuarios de la organizacion (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  findAll(@CurrentUser('sub') userId: string) {
    // organizationId is resolved inside the service from the authenticated user's record
    return this.usersService.findAllForCurrentUser(userId);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtener usuario por ID (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar datos del usuario (ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactivar usuario (soft delete) (ADMIN)',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario desactivado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  // ------------------------------------------------------------------
  // Station assignment - ADMIN only
  // ------------------------------------------------------------------

  @Patch(':id/stations')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Asignar estaciones al usuario (reemplaza las existentes) (ADMIN)',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Estaciones asignadas correctamente' })
  @ApiResponse({ status: 404, description: 'Usuario o estacion no encontrado' })
  assignStations(
    @Param('id') id: string,
    @Body() dto: AssignStationsDto,
  ) {
    return this.usersService.assignStations(id, dto.stationIds);
  }
}
