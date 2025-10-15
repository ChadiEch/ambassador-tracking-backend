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
    
    // Log configuration for debugging
    this.logger.log(`Instagram Business Account ID: ${this.INSTAGRAM_BUSINESS_ACCOUNT_ID ? 'SET' : 'NOT SET'}`);
    this.logger.log(`Page Access Token: ${this.PAGE_ACCESS_TOKEN ? 'SET' : 'NOT SET'}`);
  }

  // Public method for manual triggering
  async manuallyCheckForTaggedMedia() {
    this.logger.log('Manual tag check initiated');
    return this.checkForTaggedMedia();
  }

  // Public method for testing Instagram API connection
  async testInstagramConnection() {
    if (!this.PAGE_ACCESS_TOKEN || !this.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      return {
        success: false,
        message: 'Missing Instagram credentials',
        pageAccessTokenSet: !!this.PAGE_ACCESS_TOKEN,
        instagramBusinessAccountIdSet: !!this.INSTAGRAM_BUSINESS_ACCOUNT_ID
      };
    }

    try {
      // Test the connection by fetching account info
      const url = `https://graph.facebook.com/${this.GRAPH_API_VERSION}/${this.INSTAGRAM_BUSINESS_ACCOUNT_ID}`;
      const params = {
        access_token: this.PAGE_ACCESS_TOKEN,
        fields: 'id,name,username',
      };

      this.logger.log(`Testing Instagram connection to: ${url}`);
      const response = await lastValueFrom(
        this.httpService.get(url, { params })
      );

      return {
        success: true,
        message: 'Instagram API connection successful',
        accountInfo: response.data
      };
    } catch (error) {
      this.logger.error('Error testing Instagram connection:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Error testing Instagram connection',
        error: error.response?.data || error.message
      };
    }
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
      this.logger.log(`With params: ${JSON.stringify(params)}`);
      const response = await lastValueFrom(
        this.httpService.get(url, { params })
      );

      this.logger.log(`Response status: ${response.status}`);
      this.logger.log(`Response data: ${JSON.stringify(response.data, null, 2)}`);

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
      this.logger.error('Error stack:', error.stack);
      return {
        success: false,
        message: 'Error checking for tagged media',
        error: error.response?.data || error.message
      };
    }
  }

  private async processTaggedMedia(media: any) {
    try {
      this.logger.log(`Processing tagged media from user: ${media.username}`);
      this.logger.log(`Media permalink: ${media.permalink}`);
      this.logger.log(`Media type: ${media.media_type}`);
      
      // Check if we've already processed this media
      const alreadyExists = await this.activityRepo.findOne({
        where: { permalink: media.permalink },
      });

      if (alreadyExists) {
        this.logger.log(`Skipping duplicate tagged media: ${media.permalink}`);
        return;
      }

      // Find user by their Instagram username (the user who tagged you)
      // First try to find by instagram field, then try to extract from link field
      let user = await this.userRepo.findOne({
        where: { instagram: media.username },
      });

      this.logger.log(`Found user by instagram field: ${!!user}`);

      // If not found and the user has a link field, try to extract username from link
      if (!user) {
        this.logger.log(`Searching for user by link field...`);
        const allUsers = await this.userRepo.find();
        for (const u of allUsers) {
          const extractedUsername = this.extractInstagramUsernameFromLink(u.link || '');
          this.logger.log(`Checking user ${u.name} with link ${u.link}, extracted username: ${extractedUsername}`);
          if (extractedUsername === media.username) {
            user = u;
            this.logger.log(`Found matching user by link field: ${user.name}`);
            break;
          }
        }
      }

      if (!user) {
        this.logger.log(`No user found for Instagram username: ${media.username}`);
      }

      const activity = new AmbassadorActivity();
      activity.mediaType = this.normalizeMediaType(media.media_type);
      activity.permalink = media.permalink;
      activity.timestamp = new Date(media.timestamp);
      activity.userInstagramId = media.username;
      if (user) activity.user = user;

      await this.activityRepo.save(activity);
      this.logger.log(`✅ Tagged media saved for user: ${media.username}${user ? ` (${user.name})` : ' (no matching user)'}`);
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

  // Helper function to extract Instagram username from link field
  private extractInstagramUsernameFromLink(link: string): string | null {
    if (!link) return null;
    
    // Remove trailing slashes
    link = link.replace(/\/$/, '');
    
    // Extract username from Instagram URL patterns
    // Matches https://www.instagram.com/username or https://instagram.com/username
    const instagramUrlRegex = /^https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._-]+)/;
    const match = link.match(instagramUrlRegex);
    
    if (match && match[1]) {
      // Remove any query parameters or fragments
      const username = match[1].split(/[?#]/)[0];
      return username;
    }
    
    return null;
  }
}