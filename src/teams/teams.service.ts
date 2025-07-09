import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Team } from './entities/team.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { User } from '../users/entities/user.entity';
import { TeamMember } from '../team-members/entities/team-member.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamRepo: Repository<Team>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(TeamMember)
    private teamMemberRepo: Repository<TeamMember>,
  ) {}


async create(createTeamDto: CreateTeamDto) {
  const { name, leaderId, memberIds } = createTeamDto;
  const uniqueMemberIds = [...new Set(memberIds)];

  if (uniqueMemberIds.length < 1 || uniqueMemberIds.length > 50) {
    throw new BadRequestException('A team must have between 1 and 50 unique members.');
  }

  // 🔒 Enforce exclusivity
  const existingMembers = await this.teamMemberRepo.find({
    where: { user: In(uniqueMemberIds) },
    relations: ['team', 'user'],
  });
  if (existingMembers.length > 0) {
    const alreadyAssigned = existingMembers.map((tm) => `${tm.user.name} (${tm.user.id})`);
    throw new BadRequestException(`Users already assigned: ${alreadyAssigned.join(', ')}`);
  }

  const leader = await this.userRepo.findOneByOrFail({ id: leaderId });
  const members = await this.userRepo.findBy({ id: In(uniqueMemberIds) });

  const team = this.teamRepo.create({ name, leader });
  const savedTeam = await this.teamRepo.save(team);

  const teamMembers = this.teamMemberRepo.create(
    members.map((user) => ({ team: savedTeam, user }))
  );

  await this.teamMemberRepo.save(teamMembers);

  return { message: 'Team created successfully' };
}

async findAll() {
  const teams = await this.teamRepo.find({
    relations: {
      leader: true,
      members: {
        user: true, // ✅ ensure user is loaded inside each TeamMember
      },
    },
  });

  const result = teams.map((team) => ({
    id: team.id,
    name: team.name,
    leader: {
      id: team.leader?.id,
      name: team.leader?.name,
    },
    members: team.members.map((tm) => ({
      id: tm.user.id,         // ✅ the real ambassador user ID
      name: tm.user.name,
      username: tm.user.username || '',
      role: tm.user.role,
      active: tm.user.active,
    })),
    createdAt: team.createdAt,
  }));

  

  return result;
}



  async findOne(id: string) {
    const team = await this.teamRepo.findOne({
      where: { id },
      relations: ['leader', 'members', 'members.user'],
    });

    if (!team) throw new NotFoundException('Team not found');

    return {
      id: team.id,
      name: team.name,
      leader: {
        id: team.leader?.id,
        name: team.leader?.name,
      },
members: team.members.map((tm) => ({
  id: tm.id,
  userId: tm.user.id,  // ✅ add this
  name: tm.user.name,
  
})),

      createdAt: team.createdAt,
    };
  }

  async update(id: string, dto: UpdateTeamDto) {
  const team = await this.teamRepo.findOne({
    where: { id },
    relations: ['leader'],
  });
  if (!team) throw new NotFoundException('Team not found');

  if (dto.name) team.name = dto.name;

  if (dto.leaderId) {
    const newLeader = await this.userRepo.findOneBy({ id: dto.leaderId });
    if (!newLeader) throw new NotFoundException('New leader not found');
    team.leader = newLeader;
  }

  await this.teamRepo.save(team);

  // 🔒 Check for member uniqueness
  if (dto.memberIds && Array.isArray(dto.memberIds)) {
    const uniqueMemberIds = [...new Set(dto.memberIds)];

    if (uniqueMemberIds.length < 1 || uniqueMemberIds.length > 50) {
      throw new BadRequestException('A team must have between 1 and 50 unique members.');
    }

    const existingMembers = await this.teamMemberRepo.find({
      where: { user: In(uniqueMemberIds) },
      relations: ['team', 'user'],
    });

    const alreadyInOtherTeams = existingMembers.filter(
      (tm) => tm.team.id !== id
    );

    if (alreadyInOtherTeams.length > 0) {
      const list = alreadyInOtherTeams.map((tm) => `${tm.user.name} (${tm.user.id})`);
      throw new BadRequestException(
        `These users are already in other teams: ${list.join(', ')}`
      );
    }

    await this.teamMemberRepo.delete({ team: { id } });

    const users = await this.userRepo.findBy({ id: In(uniqueMemberIds) });
    const newTeamMembers = this.teamMemberRepo.create(
      users.map((user) => ({ team, user }))
    );
    await this.teamMemberRepo.save(newTeamMembers);
  }

  return { message: 'Team updated successfully' };
}

  async remove(id: string) {
    await this.teamMemberRepo.delete({ team: { id } });
    await this.teamRepo.delete(id);
    return { message: 'Team deleted successfully' };
  }
  
}
