import { Injectable } from '@nestjs/common';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

@Injectable()
export class TeamMembersService {
  create(createTeamMemberDto: CreateTeamMemberDto) {
    return 'This action adds a new teamMember';
  }

  findAll() {
    return `This action returns all teamMembers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} teamMember`;
  }

  update(id: number, updateTeamMemberDto: UpdateTeamMemberDto) {
    return `This action updates a #${id} teamMember`;
  }

  remove(id: number) {
    return `This action removes a #${id} teamMember`;
  }
}
