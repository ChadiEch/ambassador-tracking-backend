import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDeactivation } from './entities/UserDeactivation.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(UserDeactivation)
    private readonly deactivationRepo: Repository<UserDeactivation>,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto) {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  /**
   * Get all users including warning count and deactivations
   */
  async findAll() {
    return this.userRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.warnings', 'w')
      .leftJoinAndSelect('u.deactivations', 'deactivation')
      .loadRelationCountAndMap(
        'u.warningsCount',
        'u.warnings',
        'w',
        (qb) => qb.andWhere('w.active = true'),
      )
      .getMany();
  }

  /**
   * Get one user by ID
   */
  async findOne(id: string) {
    return this.userRepository.findOne({
      where: { id },
      relations: ['deactivations'],
    });
  }

  /**
   * Update user by ID
   */
async update(id: string, updateUserDto: UpdateUserDto) {
  const user = await this.userRepository.findOne({ where: { id } });
  if (!user) throw new NotFoundException('User not found');

  const updated = this.userRepository.merge(user, updateUserDto);
  await this.userRepository.save(updated);

  return this.findOne(id);
}


  /**
   * Remove a user and clean up from team_member join table
   */
  async remove(id: string) {
    await this.dataSource.query(`DELETE FROM team_member WHERE "userId" = $1`, [id]);
    return this.userRepository.delete(id);
  }

  /**
   * Toggle active status of user
   */
  async toggleActive(id: string) {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    user.active = !user.active;
    return this.userRepository.save(user);
  }

  /**
   * Simple deactivation with reason (legacy)
   */
  async deactivate(id: string, reason: string) {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    user.active = false;
    user.deactivationReason = reason;
    return this.userRepository.save(user);
  }

  /**
   * Deactivate user with feedback and log to UserDeactivation table
   */
  async deactivateWithFeedback(
    userId: string,
    feedback: { reason: string; rating: number; note?: string; date: string },
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    user.active = false;
    await this.userRepository.save(user);

    const deactivation = this.deactivationRepo.create({
      user,
      reason: feedback.reason,
      rating: feedback.rating,
      note: feedback.note,
      date: new Date(feedback.date),
    });

    await this.deactivationRepo.save(deactivation);

    return { success: true };
  }
}
