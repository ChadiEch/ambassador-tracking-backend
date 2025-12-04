import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateManualActivityDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['post', 'reel', 'story'])
  mediaType: string;

  @IsString()
  @IsNotEmpty()
  timestamp: string;
}