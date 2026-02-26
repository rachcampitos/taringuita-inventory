import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

const LOCATION_SELECT = {
  id: true,
  name: true,
  address: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // Create
  // ------------------------------------------------------------------

  async create(dto: CreateLocationDto, userId: string) {
    const organizationId = await this.resolveOrganizationId(userId);

    const existing = await this.prisma.location.findFirst({
      where: { name: dto.name, organizationId },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una ubicacion con el nombre "${dto.name}" en su organizacion`,
      );
    }

    return this.prisma.location.create({
      data: {
        name: dto.name,
        address: dto.address,
        organizationId,
      },
      select: LOCATION_SELECT,
    });
  }

  // ------------------------------------------------------------------
  // Read – list with station count
  // ------------------------------------------------------------------

  async findAll(userId: string) {
    const organizationId = await this.resolveOrganizationId(userId);

    return this.prisma.location.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      select: {
        ...LOCATION_SELECT,
        _count: { select: { stations: true } },
      },
    });
  }

  // ------------------------------------------------------------------
  // Read – single location with stations list
  // ------------------------------------------------------------------

  async findOne(id: string, userId: string) {
    const organizationId = await this.resolveOrganizationId(userId);

    const location = await this.prisma.location.findFirst({
      where: { id, organizationId },
      select: {
        ...LOCATION_SELECT,
        stations: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true, createdAt: true, updatedAt: true },
        },
      },
    });

    if (!location) {
      throw new NotFoundException(`Ubicacion con id "${id}" no encontrada`);
    }

    return location;
  }

  // ------------------------------------------------------------------
  // Update
  // ------------------------------------------------------------------

  async update(id: string, dto: UpdateLocationDto, userId: string) {
    const organizationId = await this.resolveOrganizationId(userId);

    await this.assertExists(id, organizationId);

    if (dto.name) {
      const conflict = await this.prisma.location.findFirst({
        where: { name: dto.name, organizationId, NOT: { id } },
      });

      if (conflict) {
        throw new ConflictException(
          `Ya existe otra ubicacion con el nombre "${dto.name}" en su organizacion`,
        );
      }
    }

    return this.prisma.location.update({
      where: { id },
      data: dto,
      select: LOCATION_SELECT,
    });
  }

  // ------------------------------------------------------------------
  // Remove (hard delete – locations have no status flag in schema)
  // ------------------------------------------------------------------

  async remove(id: string, userId: string) {
    const organizationId = await this.resolveOrganizationId(userId);

    await this.assertExists(id, organizationId);

    return this.prisma.location.delete({
      where: { id },
      select: LOCATION_SELECT,
    });
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private async resolveOrganizationId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id "${userId}" no encontrado`);
    }

    return user.organizationId;
  }

  private async assertExists(id: string, organizationId: string): Promise<void> {
    const location = await this.prisma.location.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!location) {
      throw new NotFoundException(`Ubicacion con id "${id}" no encontrada`);
    }
  }
}
