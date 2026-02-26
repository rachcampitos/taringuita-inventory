import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitOfMeasure, DeliveryDay } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({
    example: 'LECHE-001',
    description: 'Codigo unico del producto',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    example: 'Leche entera UHT',
    description: 'Nombre descriptivo del producto',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'cuid_of_category',
    description: 'ID de la categoria del producto',
  })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    enum: UnitOfMeasure,
    example: UnitOfMeasure.LT,
    description: 'Unidad de medida en la que se trabaja internamente',
  })
  @IsEnum(UnitOfMeasure)
  unitOfMeasure: UnitOfMeasure;

  @ApiProperty({
    enum: UnitOfMeasure,
    example: UnitOfMeasure.BIDONES,
    description: 'Unidad de medida en la que se realiza el pedido al proveedor',
  })
  @IsEnum(UnitOfMeasure)
  unitOfOrder: UnitOfMeasure;

  @ApiPropertyOptional({
    example: 10,
    description:
      'Factor de conversion entre unidad de pedido y unidad de trabajo (ej: 1 bidon = 10 LT → conversionFactor = 10)',
    default: 1,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Type(() => Number)
  conversionFactor?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Stock minimo de alerta en unidades de trabajo',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  minStock?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Stock maximo esperado en unidades de trabajo',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  maxStock?: number;

  @ApiPropertyOptional({
    example: 3.5,
    description: 'Porcentaje de merma esperada (0-100)',
    default: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @Type(() => Number)
  wastagePercent?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica si el producto esta activo',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 2500.5,
    description: 'Costo unitario del producto en moneda local',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  unitCost?: number;

  @ApiPropertyOptional({
    example: 'Distribuidora Central',
    description: 'Nombre del proveedor principal',
  })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional({
    enum: DeliveryDay,
    example: DeliveryDay.MARTES,
    description: 'Dia de entrega del proveedor',
  })
  @IsOptional()
  @IsEnum(DeliveryDay)
  deliveryDay?: DeliveryDay;
}
