import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { AssignStationProductsDto } from './dto/assign-station-products.dto';

const STATION_BASE_SELECT = {
  id: true,
  name: true,
  locationId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class StationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // Create
  // ------------------------------------------------------------------

  async create(dto: CreateStationDto, userId: string) {
    const organizationId = await this.resolveOrganizationId(userId);

    await this.assertLocationBelongsToOrg(dto.locationId, organizationId);

    const existing = await this.prisma.station.findFirst({
      where: { name: dto.name, locationId: dto.locationId },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una estacion con el nombre "${dto.name}" en esa ubicacion`,
      );
    }

    return this.prisma.station.create({
      data: { name: dto.name, locationId: dto.locationId },
      select: STATION_BASE_SELECT,
    });
  }

  // ------------------------------------------------------------------
  // Read – list with counts, optional locationId filter
  // ------------------------------------------------------------------

  async findAll(userId: string, locationId?: string) {
    const organizationId = await this.resolveOrganizationId(userId);

    // Collect location ids that belong to the organization
    const locationWhere = locationId
      ? { id: locationId, organizationId }
      : { organizationId };

    const locations = await this.prisma.location.findMany({
      where: locationWhere,
      select: { id: true },
    });

    const locationIds = locations.map((l) => l.id);

    return this.prisma.station.findMany({
      where: { locationId: { in: locationIds } },
      orderBy: { name: 'asc' },
      select: {
        ...STATION_BASE_SELECT,
        _count: {
          select: {
            assignedUsers: true,
            stationProducts: true,
          },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // Read – single station with users and products
  // ------------------------------------------------------------------

  async findOne(id: string, userId: string) {
    const organizationId = await this.resolveOrganizationId(userId);
    const station = await this.prisma.station.findFirst({
      where: {
        id,
        location: { organizationId },
      },
      include: {
        assignedUsers: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        stationProducts: {
          orderBy: { sortOrder: 'asc' },
          select: {
            sortOrder: true,
            product: {
              select: {
                id: true,
                name: true,
                code: true,
                unitOfMeasure: true,
              },
            },
          },
        },
      },
    });

    if (!station) {
      throw new NotFoundException(`Estacion con id "${id}" no encontrada`);
    }

    return {
      id: station.id,
      name: station.name,
      locationId: station.locationId,
      createdAt: station.createdAt,
      updatedAt: station.updatedAt,
      assignedUsers: station.assignedUsers.map((us) => us.user),
      products: station.stationProducts.map((sp) => ({ ...sp.product, sortOrder: sp.sortOrder })),
    };
  }

  // ------------------------------------------------------------------
  // Update
  // ------------------------------------------------------------------

  async update(id: string, dto: UpdateStationDto, userId: string) {
    const organizationId = await this.resolveOrganizationId(userId);
    await this.assertStationBelongsToOrg(id, organizationId);

    if (dto.locationId) {
      await this.assertLocationBelongsToOrg(dto.locationId, organizationId);
    }

    if (dto.name) {
      const targetLocationId =
        dto.locationId ??
        (await this.prisma.station.findUnique({ where: { id }, select: { locationId: true } }))
          ?.locationId;

      const conflict = await this.prisma.station.findFirst({
        where: { name: dto.name, locationId: targetLocationId, NOT: { id } },
        select: { id: true },
      });

      if (conflict) {
        throw new ConflictException(
          `Ya existe otra estacion con el nombre "${dto.name}" en esa ubicacion`,
        );
      }
    }

    return this.prisma.station.update({
      where: { id },
      data: dto,
      select: STATION_BASE_SELECT,
    });
  }

  // ------------------------------------------------------------------
  // Remove
  // ------------------------------------------------------------------

  async remove(id: string, userId: string) {
    const organizationId = await this.resolveOrganizationId(userId);
    await this.assertStationBelongsToOrg(id, organizationId);

    return this.prisma.station.delete({
      where: { id },
      select: STATION_BASE_SELECT,
    });
  }

  // ------------------------------------------------------------------
  // Assign products (replaces all StationProduct entries)
  // ------------------------------------------------------------------

  async assignProducts(id: string, dto: AssignStationProductsDto, userId: string) {
    const organizationId = await this.resolveOrganizationId(userId);
    await this.assertStationBelongsToOrg(id, organizationId);

    const [deleteResult, created] = await this.prisma.$transaction([
      this.prisma.stationProduct.deleteMany({ where: { stationId: id } }),
      this.prisma.stationProduct.createMany({
        data: dto.productIds.map((productId, index) => ({
          stationId: id,
          productId,
          sortOrder: index,
        })),
      }),
    ]);

    return {
      deleted: deleteResult.count,
      created: created.count,
    };
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

  private async assertLocationBelongsToOrg(
    locationId: string,
    organizationId: string,
  ): Promise<void> {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, organizationId },
      select: { id: true },
    });

    if (!location) {
      throw new NotFoundException(`Ubicacion con id "${locationId}" no encontrada`);
    }
  }

  private async assertStationBelongsToOrg(
    id: string,
    organizationId: string,
  ): Promise<void> {
    const station = await this.prisma.station.findFirst({
      where: { id, location: { organizationId } },
      select: { id: true },
    });

    if (!station) {
      throw new NotFoundException(`Estacion con id "${id}" no encontrada`);
    }
  }
}
