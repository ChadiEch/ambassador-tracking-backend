// src/notes/dto/create-note.dto.ts
import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateNoteDto {
  @IsUUID()
  authorId: string;

  @IsUUID()
  targetUserId: string;

  @IsNotEmpty()
  content: string;
}
