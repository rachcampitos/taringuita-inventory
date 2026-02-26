import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from './orders.service';

@Injectable()
export class ConsumptionScheduler {
  private readonly logger = new Logger(ConsumptionScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  // Domingos 23:00 UTC (20:00 Chile)
  @Cron('0 23 * * 0')
  async handleWeeklyConsumption() {
    this.logger.log('Iniciando calculo de consumo semanal...');

    const results = await this.calculateAllLocations();

    this.logger.log(
      `Calculo completado: ${results.length} locales procesados`,
    );
    for (const r of results) {
      this.logger.log(
        `  ${r.locationName}: ${r.calculated} registros calculados`,
      );
    }

    return results;
  }

  async calculateAllLocations() {
    const locations = await this.prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setUTCHours(0, 0, 0, 0);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);

    const results: {
      locationId: string;
      locationName: string;
      calculated: number;
    }[] = [];

    for (const location of locations) {
      try {
        const result = await this.ordersService.calculateWeeklyConsumption(
          location.id,
          weekStart,
          weekEnd,
        );
        results.push({
          locationId: location.id,
          locationName: location.name,
          calculated: result.calculated,
        });
      } catch (err) {
        this.logger.error(
          `Error calculando consumo para ${location.name}: ${err}`,
        );
        results.push({
          locationId: location.id,
          locationName: location.name,
          calculated: 0,
        });
      }
    }

    return results;
  }
}
