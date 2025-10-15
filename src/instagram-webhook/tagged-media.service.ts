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
    
    // Log actual values (masked for security)
    if (this.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      this.logger.log(`Instagram Business Account ID length: ${this.INSTAGRAM_BUSINESS_ACCOUNT_ID.length}`);
    }
    
    if (this.PAGE_ACCESS_TOKEN) {
      this.logger.log(`Page Access Token length: ${this.PAGE_ACCESS_TOKEN.length}`);
    }
    
    // Validate configuration
    if (!this.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      this.logger.error('Instagram Business Account ID is not configured! Please set INSTAGRAM_IG_ID in environment variables.');
    }
    
    if (!this.PAGE_ACCESS_TOKEN) {
      this.logger.error('Page Access Token is not configured! Please set PAGE_ACCESS_TOKEN in environment variables.');
    }
    
    // Log the source of configuration values
    this.logger.log('Configuration sources:');
    this.logger.log('- PAGE_ACCESS_TOKEN from configService:', !!this.configService.get<string>('PAGE_ACCESS_TOKEN'));
    this.logger.log('- INSTAGRAM_IG_ID from configService:', !!this.configService.get<string>('INSTAGRAM_IG_ID'));
    
    // Log actual values for debugging (masked for security)
    if (this.PAGE_ACCESS_TOKEN) {
      this.logger.log(`Actual PAGE_ACCESS_TOKEN (first 10 chars): ${this.PAGE_ACCESS_TOKEN.substring(0, Math.min(10, this.PAGE_ACCESS_TOKEN.length))}...`);
    }
    if (this.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      this.logger.log(`Actual INSTAGRAM_BUSINESS_ACCOUNT_ID: ${this.INSTAGRAM_BUSINESS_ACCOUNT_ID}`);
    }
  }

  // Public method to validate configuration
  validateConfiguration(): { valid: boolean; errors: string[]; instagramBusinessAccountId: string; pageAccessToken: string } {
    const errors: string[] = [];
    
    if (!this.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      errors.push('Instagram Business Account ID (INSTAGRAM_IG_ID) is not configured');
    }
    
    if (!this.PAGE_ACCESS_TOKEN) {
      errors.push('Page Access Token (PAGE_ACCESS_TOKEN) is not configured');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      instagramBusinessAccountId: this.INSTAGRAM_BUSINESS_ACCOUNT_ID ? 'SET' : 'NOT SET',
      pageAccessToken: this.PAGE_ACCESS_TOKEN ? 'SET' : 'NOT SET'
    };
  }

  // Public method for manual triggering
  async manuallyCheckForTaggedMedia() {
    this.logger.log('Manual tag check initiated');
    
    // Validate configuration first
    const configValidation = this.validateConfiguration();
    this.logger.log('Manual check - Configuration validation result:', this.safeStringify(configValidation));
    
    if (!configValidation.valid) {
      this.logger.error('Configuration validation failed:', configValidation.errors);
      return {
        success: false,
        message: 'Configuration validation failed',
        errors: configValidation.errors,
        config: {
          instagramBusinessAccountId: configValidation.instagramBusinessAccountId,
          pageAccessToken: configValidation.pageAccessToken
        }
      };
    }
    
    return this.checkForTaggedMedia();
  }

  // Public method to test Instagram credentials
  async testInstagramCredentials() {
    if (!this.PAGE_ACCESS_TOKEN || !this.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      return {
        success: false,
        message: 'Missing Instagram credentials',
        pageAccessTokenSet: !!this.PAGE_ACCESS_TOKEN,
        instagramBusinessAccountIdSet: !!this.INSTAGRAM_BUSINESS_ACCOUNT_ID
      };
    }

    try {
      // Test if the access token is valid by fetching the Instagram account info
      const accountInfoUrl = `https://graph.facebook.com/${this.GRAPH_API_VERSION}/me`;
      const accountParams = {
        access_token: this.PAGE_ACCESS_TOKEN,
        fields: 'id,name,accounts{instagram_business_account}'
      };

      this.logger.log(`Testing access token validity: ${accountInfoUrl}`);
      const accountResponse = await lastValueFrom(
        this.httpService.get(accountInfoUrl, { params: accountParams })
      );

      this.logger.log(`Account info response status: ${accountResponse.status}`);
      this.logger.log(`Account info response data: ${this.safeStringify(accountResponse.data)}`);

      // Check if we can access the Instagram business account
      let instagramAccountId = this.INSTAGRAM_BUSINESS_ACCOUNT_ID;
      
      // If we don't have the Instagram account ID, try to extract it from the response
      if (!instagramAccountId && accountResponse.data?.accounts?.data) {
        const instagramAccount = accountResponse.data.accounts.data.find(
          (account: any) => account.instagram_business_account
        );
        if (instagramAccount) {
          instagramAccountId = instagramAccount.instagram_business_account.id;
          this.logger.log(`Discovered Instagram Business Account ID: ${instagramAccountId}`);
        }
      }

      if (!instagramAccountId) {
        return {
          success: false,
          message: 'Instagram Business Account ID not found',
          accountInfo: accountResponse.data
        };
      }

      // Test the Instagram Business Account endpoint
      const instagramUrl = `https://graph.facebook.com/${this.GRAPH_API_VERSION}/${instagramAccountId}`;
      const instagramParams = {
        access_token: this.PAGE_ACCESS_TOKEN,
        fields: 'id,username,name,profile_picture_url'
      };

      this.logger.log(`Testing Instagram Business Account: ${instagramUrl}`);
      const instagramResponse = await lastValueFrom(
        this.httpService.get(instagramUrl, { params: instagramParams })
      );

      this.logger.log(`Instagram response status: ${instagramResponse.status}`);
      this.logger.log(`Instagram response data: ${this.safeStringify(instagramResponse.data)}`);

      return {
        success: true,
        message: 'Instagram credentials are valid',
        facebookAccount: accountResponse.data,
        instagramAccount: instagramResponse.data
      };
    } catch (error) {
      this.logger.error('Error testing Instagram credentials:');
      this.logger.error('Error name:', error.name);
      this.logger.error('Error message:', error.message);
      this.logger.error('Error code:', error.code);
      this.logger.error('Error stack:', error.stack);
      
      if (error.response) {
        this.logger.error('Response status:', error.response.status);
        this.logger.error('Response headers:', this.safeStringify(error.response.headers));
        this.logger.error('Response data:', this.safeStringify(error.response.data));
      }
      
      return {
        success: false,
        message: 'Error testing Instagram credentials',
        errorName: error.name,
        errorMessage: error.message,
        errorCode: error.code,
        errorResponse: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : undefined
      };
    }
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
      this.logger.log(`With params: ${this.safeStringify(params)}`);
      
      const response = await lastValueFrom(
        this.httpService.get(url, { params })
      );

      this.logger.log(`Account info response status: ${response.status}`);
      this.logger.log(`Account info response data: ${this.safeStringify(response.data)}`);

      // Also test the tags endpoint to make sure it's accessible
      const tagsUrl = `https://graph.facebook.com/${this.GRAPH_API_VERSION}/${this.INSTAGRAM_BUSINESS_ACCOUNT_ID}/tags`;
      const tagsParams = {
        access_token: this.PAGE_ACCESS_TOKEN,
        fields: 'id,media_type,permalink,timestamp,username',
      };

      this.logger.log(`Testing tags endpoint: ${tagsUrl}`);
      const tagsResponse = await lastValueFrom(
        this.httpService.get(tagsUrl, { params: tagsParams })
      );

      this.logger.log(`Tags endpoint response status: ${tagsResponse.status}`);
      this.logger.log(`Tags endpoint response data keys: ${Object.keys(tagsResponse.data || {})}`);
      
      if (tagsResponse.data) {
        this.logger.log(`Tags endpoint response data sample: ${this.safeStringify({
          ...tagsResponse.data,
          data: Array.isArray(tagsResponse.data.data) ? 
            `${tagsResponse.data.data.length} items` : 
            tagsResponse.data.data
        })}`);
      }

      return {
        success: true,
        message: 'Instagram API connection successful',
        accountInfo: response.data,
        tagsEndpointAccessible: true,
        tagsEndpointResponse: {
          status: tagsResponse.status,
          hasData: !!tagsResponse.data,
          dataItemCount: Array.isArray(tagsResponse.data?.data) ? tagsResponse.data.data.length : 0
        }
      };
    } catch (error) {
      this.logger.error('Error testing Instagram connection:');
      this.logger.error('Error name:', error.name);
      this.logger.error('Error message:', error.message);
      this.logger.error('Error code:', error.code);
      this.logger.error('Error stack:', error.stack);
      
      if (error.response) {
        this.logger.error('Response status:', error.response.status);
        this.logger.error('Response headers:', this.safeStringify(error.response.headers));
        this.logger.error('Response data:', this.safeStringify(error.response.data));
      }
      
      if (error.request) {
        this.logger.error('Request object received (circular structure handled)');
      }
      
      return {
        success: false,
        message: 'Error testing Instagram connection',
        errorName: error.name,
        errorMessage: error.message,
        errorCode: error.code,
        errorStack: error.stack,
        errorResponse: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : undefined
      };
    }
  }

  // Public method for debugging user mapping
  async debugUserMapping() {
    try {
      const users = await this.userRepo.find();
      const mapping = users.map(user => ({
        id: user.id,
        name: user.name,
        instagram: user.instagram,
        link: user.link,
        extractedUsername: user.link ? this.extractInstagramUsernameFromLink(user.link) : null
      }));
      
      return {
        success: true,
        userMapping: mapping,
        totalUsers: users.length
      };
    } catch (error) {
      this.logger.error('Error debugging user mapping:', error.message);
      this.logger.error('Error stack:', error.stack);
      return {
        success: false,
        error: error.message,
        errorStack: error.stack
      };
    }
  }

  // Helper function to safely serialize objects with circular references
  private safeStringify(obj: any, space: number = 2): string {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, val) => {
      if (val !== null && typeof val === "object") {
        if (seen.has(val)) {
          return "[Circular]";
        }
        seen.add(val);
      }
      return val;
    }, space);
  }

  // Run every hour to check for new tagged media
  @Cron(CronExpression.EVERY_HOUR)
  async checkForTaggedMedia() {
    this.logger.log('Automatic tag check initiated');
    
    // Validate configuration first
    const configValidation = this.validateConfiguration();
    this.logger.log('Configuration validation result:', this.safeStringify(configValidation));
    
    if (!configValidation.valid) {
      this.logger.warn('Missing Instagram credentials. Skipping tag check.');
      return {
        success: false,
        message: 'Missing Instagram credentials',
        pageAccessTokenSet: !!this.PAGE_ACCESS_TOKEN,
        instagramBusinessAccountIdSet: !!this.INSTAGRAM_BUSINESS_ACCOUNT_ID,
        configErrors: configValidation.errors,
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
      this.logger.log(`With params: ${this.safeStringify(params)}`);
      
      const response = await lastValueFrom(
        this.httpService.get(url, { params })
      );

      this.logger.log(`Response status: ${response.status}`);
      this.logger.log(`Response headers: ${this.safeStringify(response.headers)}`);
      this.logger.log(`Response data keys: ${Object.keys(response.data || {})}`);
      
      if (response.data) {
        this.logger.log(`Response data: ${this.safeStringify(response.data)}`);
      }

      // Check if response has the expected structure
      if (!response.data) {
        this.logger.error('Response data is missing');
        return {
          success: false,
          message: 'Response data is missing',
          responseStatus: response.status,
          responseData: '[No Data]'
        };
      }

      const taggedMediaItems = response.data.data || [];
      this.logger.log(`Found ${taggedMediaItems.length} tagged media items`);

      // Process each tagged media
      let processedCount = 0;
      if (Array.isArray(taggedMediaItems)) {
        for (const media of taggedMediaItems) {
          try {
            await this.processTaggedMedia(media);
            processedCount++;
          } catch (processError) {
            this.logger.error(`Error processing individual media item:`, processError);
          }
        }
      }
      
      return {
        success: true,
        message: `Successfully checked for tagged media. Found ${taggedMediaItems.length} items. Processed ${processedCount} items.`,
        count: taggedMediaItems.length,
        processed: processedCount,
        rawData: '[Data not serialized for performance]'
      };
    } catch (error) {
      this.logger.error('Error checking for tagged media:');
      this.logger.error('Error name:', error.name);
      this.logger.error('Error message:', error.message);
      this.logger.error('Error code:', error.code);
      this.logger.error('Error stack:', error.stack);
      
      // Log additional error details
      this.logger.error('Full error object keys:', Object.keys(error));
      
      if (error.response) {
        this.logger.error('Response status:', error.response.status);
        this.logger.error('Response headers:', this.safeStringify(error.response.headers));
        this.logger.error('Response data:', this.safeStringify(error.response.data));
      }
      
      if (error.request) {
        this.logger.error('Request object received (circular structure handled)');
        this.logger.error('Request keys:', Object.keys(error.request));
      }
      
      // Try to get more details about the error
      if (error.config) {
        this.logger.error('Request config:', this.safeStringify({
          url: error.config.url,
          method: error.config.method,
          params: error.config.params
        }));
        
        // Log the full URL that was being requested
        if (error.config.url && error.config.params) {
          const fullUrl = `${error.config.url}?${Object.keys(error.config.params).map(key => 
            `${key}=${encodeURIComponent(error.config.params[key])}`).join('&')}`;
          this.logger.error('Full request URL:', fullUrl);
        }
      }
      
      return {
        success: false,
        message: 'Error checking for tagged media',
        errorName: error.name,
        errorMessage: error.message,
        errorCode: error.code,
        errorStack: error.stack,
        errorDetails: {
          hasResponse: !!error.response,
          hasRequest: !!error.request,
          hasConfig: !!error.config
        },
        errorResponse: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : undefined
      };
    }
  }

  private async processTaggedMedia(media: any) {
    try {
      // Validate media object
      if (!media) {
        this.logger.error('Media object is null or undefined');
        return;
      }
      
      this.logger.log(`Processing tagged media: ${this.safeStringify(media)}`);
      
      // Check required fields
      if (!media.username) {
        this.logger.error('Media object missing username field');
        return;
      }
      
      if (!media.permalink) {
        this.logger.error('Media object missing permalink field');
        return;
      }
      
      if (!media.media_type) {
        this.logger.error('Media object missing media_type field');
        return;
      }
      
      if (!media.timestamp) {
        this.logger.error('Media object missing timestamp field');
        return;
      }
      
      this.logger.log(`Processing tagged media from user: ${media.username}`);
      this.logger.log(`Media permalink: ${media.permalink}`);
      this.logger.log(`Media type: ${media.media_type}`);
      this.logger.log(`Media timestamp: ${media.timestamp}`);
      
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
      if (user) {
        this.logger.log(`User found: ${user.name} (${user.id})`);
      }

      // If not found and the user has a link field, try to extract username from link
      if (!user) {
        this.logger.log(`Searching for user by link field...`);
        const allUsers = await this.userRepo.find();
        for (const u of allUsers) {
          const extractedUsername = this.extractInstagramUsernameFromLink(u.link || '');
          this.logger.log(`Checking user ${u.name} (${u.id}) with link ${u.link}, extracted username: ${extractedUsername}`);
          if (extractedUsername === media.username) {
            user = u;
            this.logger.log(`Found matching user by link field: ${user.name} (${user.id})`);
            break;
          }
        }
      }

      if (!user) {
        this.logger.log(`No user found for Instagram username: ${media.username}`);
        // Log all users for debugging
        const allUsers = await this.userRepo.find();
        this.logger.log(`All users in system: ${this.safeStringify(allUsers.map(u => ({
          id: u.id,
          name: u.name,
          instagram: u.instagram,
          link: u.link
        })))}`);
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
      this.logger.error(`Error processing tagged media ${media?.permalink || 'unknown'}:`, error.message);
      this.logger.error('Error stack:', error.stack);
      throw error; // Re-throw to be caught by the calling function
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
    if (!link) {
      this.logger.log('extractInstagramUsernameFromLink: Empty link provided');
      return null;
    }
    
    this.logger.log(`extractInstagramUsernameFromLink: Processing link: ${link}`);
    
    // Remove trailing slashes
    link = link.replace(/\/$/, '');
    
    // Extract username from Instagram URL patterns
    // Matches https://www.instagram.com/username or https://instagram.com/username
    const instagramUrlRegex = /^https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._-]+)/;
    const match = link.match(instagramUrlRegex);
    
    if (match && match[1]) {
      // Remove any query parameters or fragments
      const username = match[1].split(/[?#]/)[0];
      this.logger.log(`extractInstagramUsernameFromLink: Extracted username: ${username}`);
      return username;
    }
    
    this.logger.log(`extractInstagramUsernameFromLink: No match found for link: ${link}`);
    return null;
  }
}