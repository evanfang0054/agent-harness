import { IsString, MaxLength } from 'class-validator';

export class ShipDto {
  @IsString()
  @MaxLength(100)
  company: string;

  @IsString()
  @MaxLength(100)
  trackingNo: string;
}
