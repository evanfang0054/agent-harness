import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RefundReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}
