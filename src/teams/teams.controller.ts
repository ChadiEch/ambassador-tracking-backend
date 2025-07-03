import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Controller('admin/teams') // Matches frontend route
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  create(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.create(createTeamDto);
  }

 @Get()
  async findAll() {
    return this.teamsService.findAll();
  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id); // Use string for UUID
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto) {
    return this.teamsService.update(id, updateTeamDto); // Use string for UUID
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id); // Use string for UUID
  }
}
