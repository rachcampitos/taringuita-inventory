import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateOrderItemDto {
  @ApiPropertyOptional({
    example: 12,
    description: 'Cantidad confirmada por el admin',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  confirmedQty?: number;
}
