import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

export class BulkImportProductDto {
  @ApiProperty({
    type: [CreateProductDto],
    description:
      'Array de productos a importar masivamente (tipicamente desde Excel)',
    example: [
      {
        code: 'LECHE-001',
        name: 'Leche entera UHT',
        categoryId: 'cuid_category',
        unitOfMeasure: 'LT',
        unitOfOrder: 'BIDONES',
        conversionFactor: 10,
        minStock: 5,
        maxStock: 100,
        wastagePercent: 2,
        isActive: true,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  products: CreateProductDto[];
}

// --------------------------------------------------------------------
// Response shape returned after a bulk import operation
// --------------------------------------------------------------------

export class BulkImportResultDto {
  @ApiProperty({ example: 10, description: 'Total de filas recibidas' })
  total: number;

  @ApiProperty({ example: 8, description: 'Productos creados exitosamente' })
  created: number;

  @ApiProperty({ example: 2, description: 'Productos omitidos por duplicado de codigo' })
  skipped: number;

  @ApiProperty({
    type: [String],
    example: ['LECHE-001', 'QUESO-003'],
    description: 'Codigos de productos que ya existian y fueron omitidos',
  })
  skippedCodes: string[];
}
