import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddIngredientDto {
  @ApiProperty({ description: 'ID del producto ingrediente' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Cantidad requerida', example: 0.5 })
  @IsNumber()
  @Min(0.0001)
  quantity: number;
}

export class UpdateIngredientDto {
  @ApiProperty({ description: 'Nueva cantidad', example: 0.75 })
  @IsNumber()
  @Min(0.0001)
  quantity: number;
}
