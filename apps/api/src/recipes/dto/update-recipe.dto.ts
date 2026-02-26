import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRecipeDto {
  @ApiPropertyOptional({ description: 'Nombre de la receta' })
  @IsOptional()
  @IsString()
  name?: string;

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
