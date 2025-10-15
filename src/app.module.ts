import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { MailerModule } from '@nestjs-modules/mailer';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

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

import { WarningsModule } from './warnings/warnings.module';
import { LoggingModule } from './logging/logging.module';

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
        synchronize: true,
        poolSize: 10,
        extra: {
          connectionLimit: 10,
          idleTimeoutMillis: 60000,
          keepAlive: true,
        },
      }),
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST || 'smtp.yourprovider.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'username',
          pass: 'railway',
        },
      },
      defaults: {
        from: '"Ambassador Tracking" <no-reply@yourdomain.com>',
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'docs'),
      serveRoot: '/docs',
    }),
    LoggingModule,
    AuthModule,
    InstagramWebhookModule,
    UsersModule,
    TeamsModule,
    TeamMembersModule,
    PostingRulesModule,
    NotesModule,
    AnalyticsModule,
    FeedbackFormsModule,
    WarningsModule,
  ],
  controllers: [AuthController],
  providers: [],
})
export class AppModule {}