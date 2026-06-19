import { IsInt, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CouponPreviewItemDto {
  @Type(() => Number)
  @IsInt()
  productId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @Min(0)
  price: number;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  categoryId: number;
}

export class CouponPreviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  couponId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CouponPreviewItemDto)
  items: CouponPreviewItemDto[];
}
