import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { MailerModule } from '@nestjs-modules/mailer'; // ✅ Mailer module

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

import { WarningsModule } from './warnings/warnings.module'; // ✅ New warnings module

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
        synchronize: true, // ⚠️ Set false for production!
      }),
    }),
    // ✅ Mailer config (replace with real SMTP credentials)
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST || 'smtp.yourprovider.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'username',
          pass: process.env.SMTP_PASS || 'password',
        },
      },
      defaults: {
        from: '"Ambassador Tracking" <no-reply@yourdomain.com>',
      },
    }),
    // Your existing modules
    AuthModule,
    InstagramWebhookModule,
    UsersModule,
    TeamsModule,
    TeamMembersModule,
    PostingRulesModule,
    NotesModule,
    AnalyticsModule,
    FeedbackFormsModule,
    // ✅ Add warnings module last
    WarningsModule,
  ],
  controllers: [AuthController],
  providers: [],
})
export class AppModule {}
