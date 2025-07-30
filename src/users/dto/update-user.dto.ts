import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  // NEW link field (explicitly added)
  @IsOptional()
  @IsString()
  link?: string;
}
