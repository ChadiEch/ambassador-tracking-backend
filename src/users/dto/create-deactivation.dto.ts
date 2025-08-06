// src/users/dto/create-deactivation.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateDeactivationDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsNumber()
  rating: number;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsNotEmpty()
  date: string;
}
