import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AmbassadorActivity } from '../entities/ambassador-activity.entity';
import { InstagramMessage } from '../entities/instagram-message.entity';
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
    @InjectRepository(InstagramMessage)
    private readonly messageRepo: Repository<InstagramMessage>,
  ) {
    this.VERIFY_TOKEN = this.configService.get<string>('META_VERIFY_TOKEN') ?? '';
    this.PAGE_ACCESS_TOKEN = this.configService.get<string>('PAGE_ACCESS_TOKEN') ?? '';
  }

  // --- 1. IG DM MESSAGE HANDLER ---
  @Post('messages')
  async handleMessages(@Body() body: any) {
    try {
      console.log('📩 [DM] Webhook event received:', JSON.stringify(body, null, 2));
      
      // Validate payload
      if (!body?.entry) {
        console.warn('Invalid DM webhook payload received');
        return 'ok';
      }
      
      for (const entry of body.entry) {
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            const senderId = messagingEvent.sender?.id;
            const mid = messagingEvent.message?.mid;
            const text = messagingEvent.message?.text ?? '';

            if (mid && senderId && text) {
              const exists = await this.messageRepo.findOne({ where: { mid } });
              if (!exists) {
                const msg = this.messageRepo.create({
                  senderId,
                  text,
                  mid,
                });
                await this.messageRepo.save(msg);
                console.log('✅ Message saved:', { senderId, text, mid });
              } else {
                console.log('ℹ️ Duplicate message ignored:', mid);
              }
            } else {
              console.log('❗Missing one of mid/senderId/text', { senderId, mid, text });
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing DM webhook:', error);
      // Don't throw error to avoid Instagram retrying with the same payload
    }
    
    return 'ok';
  }

  // --- 2. IG STORY MENTION & MENTION HANDLER ---
  @Post()
  async handleWebhook(@Body() body: any) {
    try {
      console.log('📩 Webhook event received:', JSON.stringify(body, null, 2));

      if (!body?.entry) {
        console.warn('Invalid webhook payload received');
        return 'ok';
      }

      for (const entry of body.entry) {
        // Story mentions (messages webhook)
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            const senderId = messagingEvent.sender?.id;
            const timestamp = messagingEvent.timestamp
              ? new Date(messagingEvent.timestamp)
              : new Date();
            const attachments = messagingEvent.message?.attachments || [];

            for (const attachment of attachments) {
              if (attachment.type === 'story_mention') {
                const permalink = attachment.payload?.url;
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

        // Standard IG mention webhook
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field === 'mentions') {
            const mediaId = change.value.media_id;
            const fromUsername = change.value.from?.username;
            
            try {
              // Retry mechanism for fetching media details
              let media;
              let retries = 3;
              while (retries > 0) {
                try {
                  media = await this.fetchMediaDetails(mediaId);
                  break;
                } catch (error) {
                  retries--;
                  if (retries === 0) throw error;
                  console.warn(`Retrying media fetch (${3 - retries}/3)`, error);
                  await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
                }
              }
              
              const alreadyExists = await this.activityRepo.findOne({
                where: { permalink: media.permalink },
              });
              if (alreadyExists) continue;

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
              console.error('❌ Error processing mention:', err.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      // Don't throw error to avoid Instagram retrying with the same payload
    }
    
    return 'ok';
  }

  // ... existing GET endpoints ...

  private async fetchMediaDetails(mediaId: string) {
    const url = `https://graph.facebook.com/${this.GRAPH_API_VERSION}/${mediaId}`;
    const params = {
      access_token: this.PAGE_ACCESS_TOKEN,
      fields: 'id,media_type,permalink,timestamp',
    };

    try {
      const response = await lastValueFrom(
        this.httpService.get(url, { params })
      );
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching media details:', error);
      throw new HttpException('Failed to fetch media details', HttpStatus.BAD_GATEWAY);
    }
  }
}