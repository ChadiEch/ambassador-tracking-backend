import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AmbassadorActivity } from '../entities/ambassador-activity.entity';
import { User } from '../users/entities/user.entity';
import { CreateManualActivityDto } from './dto/create-manual-activity.dto';

@Injectable()
export class ManualActivityService {
  constructor(
    @InjectRepository(AmbassadorActivity)
    private activityRepository: Repository<AmbassadorActivity>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createManualActivity(createManualActivityDto: CreateManualActivityDto): Promise<AmbassadorActivity> {
    const { userId, mediaType, timestamp } = createManualActivityDto;

    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Create activity record
    const activity = this.activityRepository.create({
      mediaType,
      permalink: `manual_${mediaType}_${userId}_${timestamp}`,
      timestamp: new Date(timestamp),
      userInstagramId: user.instagram || '',
      user,
    });

    return this.activityRepository.save(activity);
  }

  async getManualActivities(userId: string): Promise<AmbassadorActivity[]> {
    return this.activityRepository.find({
      where: { user: { id: userId } },
      order: { timestamp: 'DESC' },
    });
  }
}