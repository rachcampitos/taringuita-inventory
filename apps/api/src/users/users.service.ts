import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Fields excluded from every query response
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  organizationId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  password: false,
  refreshToken: false,
} as const;

const USER_SELECT_WITH_STATIONS = {
  ...USER_SELECT,
  stations: {
    select: {
      station: {
        select: { id: true, name: true, locationId: true },
      },
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un usuario con el email ${dto.email}`,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role,
        organizationId: dto.organizationId,
      },
      select: USER_SELECT,
    });
  }

  async findAllForCurrentUser(currentUserId: string) {
    // Resolve the organization from the authenticated user to avoid
    // trusting a value that is not present in the JWT payload.
    const current = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { organizationId: true },
    });

    if (!current) {
      throw new NotFoundException('Usuario autenticado no encontrado');
    }

    return this.prisma.user.findMany({
      where: { organizationId: current.organizationId },
      select: USER_SELECT_WITH_STATIONS,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT_WITH_STATIONS,
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    return user;
  }

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT_WITH_STATIONS,
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id); // throws NotFoundException if missing

    const data: Record<string, unknown> = { ...dto };

    if (dto.password) {
      data['password'] = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // throws NotFoundException if missing

    // Soft-delete: deactivate instead of hard delete to preserve audit trail
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false, refreshToken: null },
      select: USER_SELECT,
    });
  }

  async assignStations(id: string, stationIds: string[]) {
    await this.findOne(id); // throws NotFoundException if missing

    // Verify all stations exist before touching join table
    const stations = await this.prisma.station.findMany({
      where: { id: { in: stationIds } },
      select: { id: true },
    });

    if (stations.length !== stationIds.length) {
      const foundIds = stations.map((s) => s.id);
      const missing = stationIds.filter((sid) => !foundIds.includes(sid));
      throw new NotFoundException(
        `Estaciones no encontradas: ${missing.join(', ')}`,
      );
    }

    // Replace all existing assignments atomically
    await this.prisma.$transaction([
      this.prisma.userStation.deleteMany({ where: { userId: id } }),
      this.prisma.userStation.createMany({
        data: stationIds.map((stationId) => ({ userId: id, stationId })),
        skipDuplicates: true,
      }),
    ]);

    return this.findOne(id);
  }
}
