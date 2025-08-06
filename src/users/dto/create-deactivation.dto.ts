import { IsNotEmpty, IsOptional, IsString, IsNumber, IsDateString, Min, Max } from 'class-validator';

export class CreateDeactivationDto {
  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsNumber()
  @Min(1)
  @Max(10)
  rating: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;
}
