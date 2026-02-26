import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductionLogDto {
  @ApiProperty({ example: 'clx1234abcd', description: 'ID de la estacion' })
  @IsString()
  @IsNotEmpty()
  stationId: string;

  @ApiProperty({ example: 'clx5678efgh', description: 'ID del producto producido' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    example: 48.5,
    description: 'Cantidad producida (mayor o igual a 0)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  quantityProduced: number;

  @ApiProperty({
    example: '2025-01-15',
    description: 'Fecha de produccion (YYYY-MM-DD)',
  })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    example: 'Lote con menor rendimiento por temperatura',
    description: 'Notas opcionales sobre este registro',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
