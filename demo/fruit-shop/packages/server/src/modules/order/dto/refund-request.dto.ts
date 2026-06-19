import { IsString, MaxLength } from 'class-validator';

export class RefundRequestDto {
  @IsString()
  @MaxLength(500)
  reason: string;
}
