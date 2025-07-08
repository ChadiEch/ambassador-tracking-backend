import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';   // <-- THIS IS CRITICAL
import { InstagramWebhookController } from './instagram-webhook.controller';
import { AmbassadorActivity } from '../entities/ambassador-activity.entity';
import { User } from '../users/entities/user.entity';
import { InstagramMessage } from '../entities/instagram-message.entity';

@Module({
  imports: [
    HttpModule,  // <-- Make sure this is present!
    TypeOrmModule.forFeature([AmbassadorActivity, User, InstagramMessage]),
  ],
  controllers: [InstagramWebhookController],
  providers: [],
})
export class InstagramWebhookModule {}
