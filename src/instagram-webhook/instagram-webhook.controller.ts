import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AmbassadorActivity } from '../entities/ambassador-activity.entity';
import { InstagramMessage } from '../entities/instagram-message.entity';
import { User } from 'src/users/entities/user.entity';
import { TaggedMediaService } from './tagged-media.service';

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
    private readonly taggedMediaService: TaggedMediaService, // Inject the service
  ) {
    this.VERIFY_TOKEN = this.configService.get<string>('META_VERIFY_TOKEN') ?? '';
    this.PAGE_ACCESS_TOKEN = this.configService.get<string>('PAGE_ACCESS_TOKEN') ?? '';
  }

  // Health check endpoint
  @Get('health')
  healthCheck() {
    return { status: 'OK', message: 'Instagram webhook service is running' };
  }

  // Manual trigger for checking tagged media (for testing purposes)
  @Get('check-tags')
  async manuallyCheckTags() {
    console.log('Manual tag check endpoint called');
    try {
      const result = await this.taggedMediaService.manuallyCheckForTaggedMedia();
      console.log('Tag check result:', result);
      return {
        success: true,
        message: 'Tag check completed',
        data: result
      };
    } catch (error) {
      console.error('Error in manuallyCheckTags:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Return a more detailed error response instead of throwing HttpException
      // Make sure we don't include circular references
      const errorResponse: any = {
        success: false,
        message: 'Failed to check for tagged media',
        error: {
          name: error.name || 'UnknownError',
          message: error.message || 'An unknown error occurred'
        }
      };
      
      // Only include stack trace in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = error.stack;
      }
      
      return errorResponse;
    }
  }

  // Test Instagram API connection
  @Get('test-connection')
  async testInstagramConnection() {
    console.log('Instagram connection test endpoint called');
    try {
      const result = await this.taggedMediaService.testInstagramConnection();
      console.log('Connection test result:', result);
      return result;
    } catch (error) {
      console.error('Error in testInstagramConnection:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Return a more detailed error response instead of throwing HttpException
      // Make sure we don't include circular references
      const errorResponse: any = {
        success: false,
        message: 'Failed to test Instagram connection',
        error: {
          name: error.name || 'UnknownError',
          message: error.message || 'An unknown error occurred'
        }
      };
      
      // Only include stack trace in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = error.stack;
      }
      
      return errorResponse;
    }
  }

  // Debug user mapping
  @Get('debug-users')
  async debugUserMapping() {
    console.log('Debug user mapping endpoint called');
    try {
      const result = await this.taggedMediaService.debugUserMapping();
      console.log('User mapping debug result:', result);
      return result;
    } catch (error) {
      console.error('Error in debugUserMapping:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Return a more detailed error response instead of throwing HttpException
      // Make sure we don't include circular references
      const errorResponse: any = {
        success: false,
        message: 'Failed to debug user mapping',
        error: {
          name: error.name || 'UnknownError',
          message: error.message || 'An unknown error occurred'
        }
      };
      
      // Only include stack trace in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = error.stack;
      }
      
      return errorResponse;
    }
  }

  // Test Instagram credentials
  @Get('test-credentials')
  async testInstagramCredentials() {
    console.log('Instagram credentials test endpoint called');
    try {
      const result = await this.taggedMediaService.testInstagramCredentials();
      console.log('Credentials test result:', result);
      return result;
    } catch (error) {
      console.error('Error in testInstagramCredentials:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Return a more detailed error response instead of throwing HttpException
      // Make sure we don't include circular references
      const errorResponse: any = {
        success: false,
        message: 'Failed to test Instagram credentials',
        error: {
          name: error.name || 'UnknownError',
          message: error.message || 'An unknown error occurred'
        }
      };
      
      // Only include stack trace in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = error.stack;
      }
      
      return errorResponse;
    }
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
        console.log('Processing entry:', JSON.stringify(entry, null, 2));
        
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
          console.log('Processing change:', JSON.stringify(change, null, 2));
          
          if (change.field === 'mentions') {
            const mediaId = change.value.media_id;
            const fromUsername = change.value.from?.username;
            
            console.log('Processing mention from:', fromUsername, 'mediaId:', mediaId);
            
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
              
              console.log('Media details:', JSON.stringify(media, null, 2));
              
              const alreadyExists = await this.activityRepo.findOne({
                where: { permalink: media.permalink },
              });
              if (alreadyExists) {
                console.log('Skipping duplicate mention:', media.permalink);
                continue;
              }

              const user = await this.userRepo.findOne({
                where: { instagram: fromUsername },
              });
              
              console.log('Found user for mention:', user?.id);

              const activity = new AmbassadorActivity();
              activity.mediaType = this.normalizeMediaType(media.media_type);
              activity.permalink = media.permalink;
              activity.timestamp = new Date(media.timestamp);
              activity.userInstagramId = fromUsername;
              if (user) activity.user = user;
              await this.activityRepo.save(activity);
              console.log('✅ Mention saved for user:', fromUsername);
            } catch (err: any) {
              console.error('❌ Error processing mention:', err.message);
            }
          }
          // Handle comments (can be used to detect potential tags)
          else if (change.field === 'comments') {
            const commentId = change.value.id;
            const commenterUsername = change.value.from?.username;
            const commentText = change.value.text;
            
            console.log('Processing comment from:', commenterUsername, 'commentId:', commentId);
            console.log('Comment text:', commentText);
            
            // We can log comments but not process them as tags directly
            // Tag detection will be handled by the scheduled task
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      // Don't throw error to avoid Instagram retrying with the same payload
    }
    
    return 'ok';
  }

  // Webhook verification endpoint
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
  ) {
    console.log('🔍 Webhook verification request received');
    if (mode && token) {
      if (mode === 'subscribe' && token === this.VERIFY_TOKEN) {
        console.log('✅ Webhook verified successfully');
        return challenge;
      } else {
        console.log('❌ Webhook verification failed');
        throw new HttpException('Verification failed', HttpStatus.FORBIDDEN);
      }
    }
    throw new HttpException('Missing parameters', HttpStatus.BAD_REQUEST);
  }

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