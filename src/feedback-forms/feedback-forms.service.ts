import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedbackForm } from './entities/feedback-form.entity';
import { CreateFeedbackDto } from './dto/create-feedback-form.dto';
import { UpdateFeedbackFormDto } from './dto/update-feedback-form.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class FeedbackFormsService {
  constructor(
    @InjectRepository(FeedbackForm) private feedbackRepo: Repository<FeedbackForm>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async create(dto: CreateFeedbackDto) {
    const user = await this.userRepo.findOneBy({ id: dto.userId });
    if (!user) throw new NotFoundException('User not found');

    const feedback = this.feedbackRepo.create({
      user,
      message: dto.message,
    });

    await this.feedbackRepo.save(feedback);
    return { message: 'Feedback submitted successfully' };
  }

async findAll() {
  const feedbacks = await this.feedbackRepo.find({
    relations: ['user'],
    order: { created_at: 'DESC' },
  });

  return feedbacks.map((fb) => ({
    id: fb.id,
    userId: fb.user?.id,
    userName: fb.user?.name || '[Unknown]',
    role: fb.user?.role || 'ambassador', // optional but nice
    message: fb.message,
    createdAt: fb.created_at,
    archived: fb.archived, // ✅ THIS is the missing part
  }));
}


  async findOne(id: number) {
    const feedback = await this.feedbackRepo.findOne({ where: { id: String(id) }, relations: ['user'] });
    if (!feedback) throw new NotFoundException('Feedback not found');

    return {
      id: feedback.id,
      userName: feedback.user?.name || '[Unknown]',
      message: feedback.message,
      createdAt: feedback.created_at,
    };
  }

  async update(id: number, dto: UpdateFeedbackFormDto) {
    await this.feedbackRepo.update(id, dto);
    return { message: 'Feedback updated' };
  }

  async remove(id: number) {
    await this.feedbackRepo.delete(id);
    return { message: 'Feedback deleted' };
  }

async toggleArchive(id: string) {
  const feedback = await this.feedbackRepo.findOne({ where: { id } });
  if (!feedback) throw new NotFoundException('Feedback not found');

  feedback.archived = !feedback.archived;
  await this.feedbackRepo.save(feedback);

  return { message: 'Feedback archive toggled' };
}



}
