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

export class RequisitionItemDto {
  @ApiProperty({ example: 'clx5678efgh', description: 'ID del producto' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    example: 2.5,
    description: 'Cantidad requisitada (mayor a 0)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;
}

export class CreateRequisitionDto {
  @ApiProperty({ example: 'clx1234abcd', description: 'ID de la estacion destino' })
  @IsString()
  @IsNotEmpty()
  stationId: string;

  @ApiProperty({
    example: '2025-01-15',
    description: 'Fecha de la requisicion (YYYY-MM-DD)',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    type: [RequisitionItemDto],
    description: 'Lista de productos requisitados',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RequisitionItemDto)
  items: RequisitionItemDto[];

  @ApiPropertyOptional({
    example: 'Requisicion de cierre de turno',
    description: 'Notas opcionales',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
