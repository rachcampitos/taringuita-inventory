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

export class TransformationOutputDto {
  @ApiProperty({ example: 'clx5678efgh', description: 'ID del producto de salida' })
  @IsString()
  @IsNotEmpty()
  outputProductId: string;

  @ApiProperty({ example: 2.1, description: 'Cantidad obtenida (mayor a 0)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;
}

export class CreateTransformationDto {
  @ApiProperty({ example: 'clx1234abcd', description: 'ID del producto de entrada (materia prima bruta)' })
  @IsString()
  @IsNotEmpty()
  inputProductId: string;

  @ApiProperty({ example: 5.0, description: 'Cantidad de materia prima utilizada' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  inputQuantity: number;

  @ApiProperty({ example: '2026-03-05', description: 'Fecha de la transformacion (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({
    type: [TransformationOutputDto],
    description: 'Lista de productos obtenidos de la transformacion',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransformationOutputDto)
  outputs: TransformationOutputDto[];

  @ApiPropertyOptional({ example: 'clxRecipeId', description: 'ID de receta asociada (opcional)' })
  @IsOptional()
  @IsString()
  recipeId?: string;

  @ApiPropertyOptional({ example: 'Pulpo con buen rendimiento', description: 'Notas opcionales' })
  @IsOptional()
  @IsString()
  notes?: string;
}
