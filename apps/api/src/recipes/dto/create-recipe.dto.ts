import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class IngredientInput {
  @ApiProperty({ description: 'ID del producto ingrediente' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Cantidad requerida', example: 0.5 })
  @IsNumber()
  @Min(0.0001)
  quantity: number;
}

export class CreateRecipeDto {
  @ApiProperty({ description: 'Nombre de la receta', example: 'Ceviche clasico' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'ID del producto resultante' })
  @IsString()
  @IsNotEmpty()
  outputProductId: string;

  @ApiProperty({ description: 'Cantidad producida por receta', example: 10 })
  @IsNumber()
  @Min(0.01)
  outputQuantity: number;

  @ApiPropertyOptional({ description: 'Instrucciones de preparacion' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ type: [IngredientInput], description: 'Ingredientes opcionales' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientInput)
  ingredients?: IngredientInput[];
}
