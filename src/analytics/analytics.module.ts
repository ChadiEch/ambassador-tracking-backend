// src/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AmbassadorActivity } from '../entities/ambassador-activity.entity';
import { User } from '../users/entities/user.entity';
import { PostingRule } from '../posting-rules/entities/posting-rule.entity';
import { Team } from '../teams/entities/team.entity'; // 👈 ajoute ceci

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AmbassadorActivity,
      User,
      PostingRule, 
      Team, // ✅ Met ici Team dans le tableau
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
