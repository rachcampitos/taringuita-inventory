import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({ example: 'Planta Principal', description: 'Nombre de la ubicacion' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Av. Los Pinos 123', description: 'Direccion de la ubicacion' })
  @IsOptional()
  @IsString()
  address?: string;
}
