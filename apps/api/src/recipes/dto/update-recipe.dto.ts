import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RecipeType } from '@prisma/client';

export class UpdateRecipeDto {
  @ApiPropertyOptional({ description: 'Nombre de la receta' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Tipo de receta', enum: RecipeType })
  @IsOptional()
  @IsEnum(RecipeType)
  type?: RecipeType;

  @ApiPropertyOptional({ description: 'Instrucciones de preparacion' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Cantidad producida por receta' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  outputQuantity?: number;
}
