import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class BulkProductionItemDto {
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

  @ApiPropertyOptional({
    example: 'Lote con menor rendimiento por temperatura',
    description: 'Notas opcionales sobre este producto',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkProductionLogDto {
  @ApiProperty({ example: 'clx1234abcd', description: 'ID de la estacion' })
  @IsString()
  @IsNotEmpty()
  stationId: string;

  @ApiProperty({
    example: '2025-01-15',
    description: 'Fecha de produccion (YYYY-MM-DD)',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    type: [BulkProductionItemDto],
    description: 'Lista de productos producidos en esta sesion',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkProductionItemDto)
  items: BulkProductionItemDto[];
}
