import { IsUUID, IsInt, Min, IsOptional, IsString } from 'class-validator';

export class CreatePostingRuleDto {
  @IsUUID()
  userId: string;

  @IsInt()
  @Min(0)
  stories_per_week: number;

  @IsInt()
  @Min(0)
  posts_per_week: number;

  @IsInt()
  @Min(0)
  reels_per_week: number;

  @IsOptional()
  @IsString()
  rulesText?: string; // Optional general rules description
}
