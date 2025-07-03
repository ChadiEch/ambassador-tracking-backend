import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackFormsService } from './feedback-forms.service';
import { FeedbackFormsController } from './feedback-forms.controller';
import { FeedbackForm } from './entities/feedback-form.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FeedbackForm, User])], // ✅ This is what was missing
  controllers: [FeedbackFormsController],
  providers: [FeedbackFormsService],
})
export class FeedbackFormsModule {}
