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

export class BulkInventoryItemDto {
  @ApiProperty({ example: 'clx5678efgh', description: 'ID del producto' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    example: 12.5,
    description: 'Cantidad contada (mayor o igual a 0)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({
    example: 'Producto con envase roto',
    description: 'Notas opcionales sobre este producto',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkInventoryCountDto {
  @ApiProperty({ example: 'clx1234abcd', description: 'ID de la estacion' })
  @IsString()
  @IsNotEmpty()
  stationId: string;

  @ApiProperty({
    example: '2025-01-15',
    description: 'Fecha del conteo (YYYY-MM-DD)',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    type: [BulkInventoryItemDto],
    description: 'Lista de productos contados en esta sesion',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkInventoryItemDto)
  items: BulkInventoryItemDto[];
}
