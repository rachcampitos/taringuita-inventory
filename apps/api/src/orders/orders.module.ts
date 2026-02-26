import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ConsumptionScheduler } from './consumption.scheduler';

// PrismaModule is @Global() so PrismaService is available without explicit import
@Module({
  controllers: [OrdersController],
  providers: [OrdersService, ConsumptionScheduler],
  exports: [OrdersService],
})
export class OrdersModule {}
