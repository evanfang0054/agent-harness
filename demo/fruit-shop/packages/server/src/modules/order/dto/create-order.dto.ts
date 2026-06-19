import { IsString, IsOptional, MaxLength, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsString()
  @MaxLength(255)
  address: string;

  @IsString()
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  addressId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  couponId?: number;
}
