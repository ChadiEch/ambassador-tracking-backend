// create-feedback.dto.ts
import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateFeedbackDto {
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  message: string;
}
