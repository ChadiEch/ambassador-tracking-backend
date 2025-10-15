import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig],
    }),
    ScheduleModule.forRoot(),
    HttpModule,
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('database.url'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        poolSize: 10,
        extra: {
          connectionLimit: 10,
          idleTimeoutMillis: 60000,
          keepAlive: true,
        },
      }),
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('mailer.host'),
          port: configService.get<number>('mailer.port'),
          secure: configService.get<boolean>('mailer.secure'),
          auth: {
            user: configService.get<string>('mailer.user'),
            pass: configService.get<string>('mailer.password'),
          },
        },
        defaults: {
          from: configService.get<string>('mailer.from'),
        },
      }),
      inject: [ConfigService],
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