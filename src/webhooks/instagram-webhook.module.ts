// src/instagram-webhook/instagram-webhook.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstagramWebhookController } from './instagram-webhook.controller';
import { AmbassadorActivity } from '../entities/ambassador-activity.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      AmbassadorActivity, // ✅ Already imported
      User                // ✅ This is the key missing part!
    ]),
  ],
  controllers: [InstagramWebhookController],
})
export class InstagramWebhookModules {}
