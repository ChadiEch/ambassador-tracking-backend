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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    HttpModule,
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.database,
        autoLoadEntities: true,
        synchronize: true, // false for prod!
      }),
    }),
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
