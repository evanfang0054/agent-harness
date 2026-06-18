import { IsInt, IsString, IsOptional, Min } from 'class-validator';

export class AddToCartDto {
  @IsInt()
  productId: number;

  @IsString()
  specLabel: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
