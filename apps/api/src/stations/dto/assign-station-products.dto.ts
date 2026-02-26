import { IsArray, IsString, ArrayUnique } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignStationProductsDto {
  @ApiProperty({
    example: ['clx1111', 'clx2222'],
    description: 'Lista de IDs de productos a asignar. Reemplaza la asignacion actual.',
    type: [String],
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  productIds: string[];
}
