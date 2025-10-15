import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { lastValueFrom } from 'rxjs';
import { AmbassadorActivity } from '../entities/ambassador-activity.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TaggedMediaService {
  private readonly logger = new Logger(TaggedMediaService.name);
  private readonly GRAPH_API_VERSION = 'v23.0';
  private readonly PAGE_ACCESS_TOKEN: string;
  private readonly INSTAGRAM_BUSINESS_ACCOUNT_ID: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(AmbassadorActivity)
    private readonly activityRepo: Repository<AmbassadorActivity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    this.PAGE_ACCESS_TOKEN = this.configService.get<string>('PAGE_ACCESS_TOKEN') ?? '';
    this.INSTAGRAM_BUSINESS_ACCOUNT_ID = this.configService.get<string>('INSTAGRAM_IG_ID') ?? '';
  }

  // Public method for manual triggering
  async manuallyCheckForTaggedMedia() {
    this.logger.log('Manual tag check initiated');
    return this.checkForTaggedMedia();
  }

  // Run every hour to check for new tagged media
  @Cron(CronExpression.EVERY_HOUR)
  async checkForTaggedMedia() {
    this.logger.log('Automatic tag check initiated');
    if (!this.PAGE_ACCESS_TOKEN || !this.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      this.logger.warn('Missing Instagram credentials. Skipping tag check.');
      return {
        success: false,
        message: 'Missing Instagram credentials',
        count: 0
      };
    }

    try {
      this.logger.log('Checking for tagged media...');
      
      // Get tagged media for your Instagram Business Account
      const url = `https://graph.facebook.com/${this.GRAPH_API_VERSION}/${this.INSTAGRAM_BUSINESS_ACCOUNT_ID}/tags`;
      const params = {
        access_token: this.PAGE_ACCESS_TOKEN,
        fields: 'id,media_type,permalink,timestamp,username',
      };

      this.logger.log(`Making request to: ${url}`);
      const response = await lastValueFrom(
        this.httpService.get(url, { params })
      );

      this.logger.log(`Found ${response.data.data?.length || 0} tagged media items`);

      // Process each tagged media
      if (response.data.data && Array.isArray(response.data.data)) {
        for (const media of response.data.data) {
          await this.processTaggedMedia(media);
        }
      }
      
      return {
        success: true,
        message: `Successfully checked for tagged media. Found ${response.data.data?.length || 0} items.`,
        count: response.data.data?.length || 0
      };
    } catch (error) {
      this.logger.error('Error checking for tagged media:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Error checking for tagged media',
        error: error.response?.data || error.message
      };
    }
  }

  private async processTaggedMedia(media: any) {
    try {
      // Check if we've already processed this media
      const alreadyExists = await this.activityRepo.findOne({
        where: { permalink: media.permalink },
      });

      if (alreadyExists) {
        this.logger.log(`Skipping duplicate tagged media: ${media.permalink}`);
        return;
      }

      // Find user by their Instagram username (the user who tagged you)
      const user = await this.userRepo.findOne({
        where: { instagram: media.username },
      });

      const activity = new AmbassadorActivity();
      activity.mediaType = this.normalizeMediaType(media.media_type);
      activity.permalink = media.permalink;
      activity.timestamp = new Date(media.timestamp);
      activity.userInstagramId = media.username;
      if (user) activity.user = user;

      await this.activityRepo.save(activity);
      this.logger.log(`✅ Tagged media saved for user: ${media.username}`);
    } catch (error) {
      this.logger.error(`Error processing tagged media ${media.permalink}:`, error.message);
    }
  }

  // Helper function to normalize media type
  private normalizeMediaType(mediaType: string): string {
    switch (mediaType.toLowerCase()) {
      case 'image':
        return 'post';
      case 'video':
        return 'reel';
      case 'carousel':
        return 'post'; // Carousel is typically considered a post
      default:
        return mediaType.toLowerCase();
    }
  }
}