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

  if (body?.entry) {
    for (const entry of body.entry) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === 'mentions') {
          const mediaId = change.value.media_id;
          const fromUsername = change.value.from?.username;
          const brandMentionedId = change.value.mentioned_user_id;

          try {
            const media = await this.fetchMediaDetails(mediaId);

            // Optional: Check for duplicate media
            const alreadyExists = await this.activityRepo.findOne({
              where: { mediaId },
            });
            if (alreadyExists) continue; // Skip duplicate

            const user = await this.userRepo.findOne({
              where: { instagram: fromUsername },
            });

            const activity = new AmbassadorActivity();
            activity.mediaId = media.id;
            activity.mediaType = media.media_type;
            activity.permalink = media.permalink;
            activity.timestamp = new Date(media.timestamp);
            activity.userInstagramId = fromUsername;
            if (user) activity.user = user;

            await this.activityRepo.save(activity);

          } catch (err: any) {
            console.error('❌ Error:', err.message);
          }
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
