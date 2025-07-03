import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource  } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
constructor(
  @InjectRepository(User)
  private readonly userRepository: Repository<User>,
  private readonly dataSource: DataSource, // inject DataSource to run raw queries
) {}

  async create(createUserDto: CreateUserDto) {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findAll() {
    return this.userRepository.find();
  }

  async findOne(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

async remove(id: string) {
  // Step 1: Remove references from `team_member` table manually
  await this.dataSource.query(
    `DELETE FROM team_member WHERE "userId" = $1`,
    [id],
  );
  // Step 2: Safely delete the user
  return this.userRepository.delete(id);
}
  async toggleActive(id: string) {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    user.active = !user.active;
    return this.userRepository.save(user);
  }
}
