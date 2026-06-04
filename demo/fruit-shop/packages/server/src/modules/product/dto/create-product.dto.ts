import {
  IsString,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ProductStatus } from 'shared';

export class CreateProductDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(100)
  origin: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsString()
  @MaxLength(20)
  unit: string;

  @IsString()
  @MaxLength(20)
  sweetness: string;

  @IsString()
  @MaxLength(50)
  weight: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  tags?: string[];

  @IsString()
  @MaxLength(500)
  image: string;

  @IsString()
  @MaxLength(20)
  color: string;

  @IsInt()
  categoryId: number;

  @IsInt()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsNumber()
  status?: ProductStatus;
}
