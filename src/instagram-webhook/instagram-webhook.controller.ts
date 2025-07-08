import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AmbassadorActivity } from '../entities/ambassador-activity.entity'; // ✅ correct
import { User } from 'src/users/entities/user.entity';

@Controller('webhook')
export class InstagramWebhookController {
  private readonly VERIFY_TOKEN: string;
  private readonly GRAPH_API_VERSION = 'v23.0';
  private readonly PAGE_ACCESS_TOKEN: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(AmbassadorActivity)
    private readonly activityRepo: Repository<AmbassadorActivity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    this.VERIFY_TOKEN = this.configService.get<string>('META_VERIFY_TOKEN') ?? '';
    this.PAGE_ACCESS_TOKEN = this.configService.get<string>('PAGE_ACCESS_TOKEN') ?? '';
  }

  @Get('mentions/:userInstagramId')
  async getUserMentions(@Param('userInstagramId') userId: string) {
    return this.activityRepo.find({
      where: { userInstagramId: userId },
      order: { timestamp: 'DESC' },
      relations: ['user'],
    });
  }

  @Get('mentions/:userInstagramId/stats/week')
  async getWeeklyStats(@Param('userInstagramId') userId: string) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday

    return this.activityRepo
      .createQueryBuilder('activity')
      .select('activity.mediaType', 'mediaType')
      .addSelect('COUNT(*)', 'count')
      .where('activity.userInstagramId = :userId', { userId })
      .andWhere('activity.timestamp >= :start', { start: startOfWeek })
      .groupBy('activity.mediaType')
      .getRawMany();
  }

  @Get()
  verifyWebhook(@Query() query: any) {
    if (
      query['hub.mode'] === 'subscribe' &&
      query['hub.verify_token'] === this.VERIFY_TOKEN
    ) {
      console.log('✅ Webhook verified!');
      return query['hub.challenge'];
    }
    console.log('❌ Webhook verification failed');
    return 'Invalid verify token';
  }

 @Post()
async handleWebhook(@Body() body: any) {
  console.log('📩 Webhook event received:', JSON.stringify(body, null, 2));

  // --- TEMPORARY SUPPORT FOR MESSAGE WEBHOOK STORY_MENTION ---
  if (body?.entry) {
    for (const entry of body.entry) {
      // 1. Handle messages webhook (story_mention)
      if (entry.messaging) {
        for (const messagingEvent of entry.messaging) {
          const senderId = messagingEvent.sender?.id;
          const timestamp = messagingEvent.timestamp ? new Date(messagingEvent.timestamp) : new Date();
          const attachments = messagingEvent.message?.attachments || [];

          for (const attachment of attachments) {
            if (attachment.type === 'story_mention') {
              const permalink = attachment.payload?.url;
              // Try to find user by senderId or map senderId to a user/instagram
              const user = await this.userRepo.findOne({
                where: { instagram: senderId } // or another field if you store it differently
              });

              const activity = new AmbassadorActivity();
              activity.mediaId = ''; // No mediaId from message webhook
              activity.mediaType = 'story_mention';
              activity.permalink = permalink;
              activity.timestamp = timestamp;
              activity.userInstagramId = senderId;
              if (user) activity.user = user;

              await this.activityRepo.save(activity);
              console.log('✅ Story mention saved for user:', senderId);
            }
          }
        }
      }

      // 2. Fallback to your previous mentions webhook handler
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === 'mentions') {
          // ... your existing mention code here ...
        }
      }
    }
  }

  return 'ok';
}

  private async fetchMediaDetails(mediaId: string) {
    const url = `https://graph.facebook.com/${this.GRAPH_API_VERSION}/${mediaId}`;
    const params = {
      access_token: this.PAGE_ACCESS_TOKEN,
      fields: 'id,media_type,permalink,timestamp',
    };

    const response = await lastValueFrom(
      this.httpService.get(url, { params })
    );

    return response.data;
  }
}
