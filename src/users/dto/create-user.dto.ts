import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsString()
  role: 'ambassador' | 'leader';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  participationDate?: string;

  @IsOptional()
@IsString()
note?: string;

}
