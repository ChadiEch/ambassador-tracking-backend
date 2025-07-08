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
import { AmbassadorActivity } from '../entities/ambassador-activity.entity';
import { User } from 'src/users/entities/user.entity';

function mapToPluralKeys(obj: any) {
  return {
    stories: obj.stories ?? obj.story ?? 0,
    posts: obj.posts ?? obj.post ?? 0,
    reels: obj.reels ?? obj.reel ?? 0,
  };
}

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

  @Get('analytics/all-compliance')
  async getAllCompliance(@Query('start') start: string, @Query('end') end: string) {
    // Get all ambassadors
    const allAmbassadors = await this.userRepo.find({ where: { role: 'ambassador' } });

    // For each, aggregate activity
    const result = await Promise.all(allAmbassadors.map(async user => {
      // Activity aggregation
      let qb = this.activityRepo.createQueryBuilder('a')
        .select('a.mediaType', 'mediaType')
        .addSelect('COUNT(*)', 'count')
        .where('a.userInstagramId = :userId', { userId: user.instagram || user.id });

      if (start && end) {
        qb = qb.andWhere('a.timestamp BETWEEN :start AND :end', { start, end });
      }

      qb = qb.groupBy('a.mediaType');
      const actualRaw = await qb.getRawMany();

      // Aggregate result to { story: N, post: M, reel: L }
      const actualCountObj: any = {};
      actualRaw.forEach(r => actualCountObj[r.mediaType] = parseInt(r.count, 10));

      // Dummy expected, replace with your logic if needed!
      const expectedObj = { story: 2, post: 1, reel: 1 };

      // Compliance calculation (simple)
      const compliance = {
        story: (actualCountObj.story ?? 0) >= expectedObj.story ? 'green' : 'red',
        post: (actualCountObj.post ?? 0) >= expectedObj.post ? 'green' : 'red',
        reel: (actualCountObj.reel ?? 0) >= expectedObj.reel ? 'green' : 'red',
      };

      return {
        id: user.id,
        name: user.name,
        actual: mapToPluralKeys(actualCountObj),
        expected: mapToPluralKeys(expectedObj),
        compliance,
      };
    }));

    return result;
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
        // 1. Handle messages webhook (story_mention)
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            const senderId = messagingEvent.sender?.id;
            const timestamp = messagingEvent.timestamp ? new Date(messagingEvent.timestamp) : new Date();
            const attachments = messagingEvent.message?.attachments || [];

            for (const attachment of attachments) {
              if (attachment.type === 'story_mention') {
                const permalink = attachment.payload?.url;
                // Remove user lookup if you do not store numeric ID
                const activity = new AmbassadorActivity();
                activity.mediaType = 'story';
                activity.permalink = permalink;
                activity.timestamp = timestamp;
                activity.userInstagramId = senderId;
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
            const mediaId = change.value.media_id;
            const fromUsername = change.value.from?.username;
            try {
              const media = await this.fetchMediaDetails(mediaId);

              // Optional: Check for duplicate media
              const alreadyExists = await this.activityRepo.findOne({
                where: { permalink: media.permalink },
              });
              if (alreadyExists) continue; // Skip duplicate

              const user = await this.userRepo.findOne({
                where: { instagram: fromUsername },
              });

              const activity = new AmbassadorActivity();
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
// This controller handles Instagram webhooks for mentions and story mentions.
// It verifies the webhook, processes incoming events, and saves ambassador activities to the database. 