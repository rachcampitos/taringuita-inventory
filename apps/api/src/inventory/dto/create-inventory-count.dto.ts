import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateInventoryCountDto {
  @ApiProperty({ example: 'clx1234abcd', description: 'ID de la estacion' })
  @IsString()
  @IsNotEmpty()
  stationId: string;

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

  @ApiProperty({
    example: '2025-01-15',
    description: 'Fecha del conteo (YYYY-MM-DD)',
  })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    example: 'Producto con envase roto',
    description: 'Notas opcionales sobre el conteo',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
