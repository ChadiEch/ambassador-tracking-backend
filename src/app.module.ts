import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';

import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { TeamMembersModule } from './team-members/team-members.module';
import { PostingRulesModule } from './posting-rules/posting-rules.module';
import { NotesModule } from './notes/notes.module';
import { FeedbackFormsModule } from './feedback-forms/feedback-forms.module';
import { InstagramWebhookModule } from './instagram-webhook/instagram-webhook.module';
import { AuthModule } from './auth/auth.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthController } from './auth/auth.controller';
import { AmbassadorActivity } from './entities/ambassador-activity.entity';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Schedule support (for cron jobs etc.)
    ScheduleModule.forRoot(),

    // Axios HTTP client
    HttpModule,

    // TypeORM PostgreSQL connection
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'Good@29072004',
      database: 'ambassador_tracker',
      entities: [AmbassadorActivity], // manually declare entity if autoLoad is off
      synchronize: true, // ❗ set false in production
      autoLoadEntities: true,
    }),

    // Feature Modules
    AuthModule,
    InstagramWebhookModule,
    UsersModule,
    TeamsModule,
    TeamMembersModule,
    PostingRulesModule,
    NotesModule,
    AnalyticsModule,
    FeedbackFormsModule,
  ],
  controllers: [AuthController],
  providers: [],
})
export class AppModule {}
