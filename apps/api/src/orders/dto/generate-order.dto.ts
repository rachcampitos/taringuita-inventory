import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryDay } from '@prisma/client';

export class GenerateOrderDto {
  @ApiProperty({ example: 'cuid_of_location', description: 'ID del local' })
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({
    enum: DeliveryDay,
    example: DeliveryDay.VIERNES,
    description: 'Dia de entrega del pedido',
  })
  @IsEnum(DeliveryDay)
  deliveryDay: DeliveryDay;

  @ApiPropertyOptional({ example: 'Pedido semanal normal' })
  @IsOptional()
  @IsString()
  notes?: string;
}
