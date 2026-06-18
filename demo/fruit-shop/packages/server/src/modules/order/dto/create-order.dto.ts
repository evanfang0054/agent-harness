import { IsString, IsOptional, MaxLength } from 'class-validator';

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
}
