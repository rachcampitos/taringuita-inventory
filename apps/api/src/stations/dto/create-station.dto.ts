import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStationDto {
  @ApiProperty({ example: 'Linea 1', description: 'Nombre de la estacion' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'clx1234abcd', description: 'ID de la ubicacion a la que pertenece' })
  @IsString()
  @IsNotEmpty()
  locationId: string;
}
