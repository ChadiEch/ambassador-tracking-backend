import { IsNotEmpty, IsUUID, IsArray } from 'class-validator';

export class CreateTeamDto {
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  leaderId: string;

  @IsArray()
  @IsUUID('all', { each: true }) // This means every item in the array must be a UUID
  memberIds: string[];
}

