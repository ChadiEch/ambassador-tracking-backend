import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

// Use INSTAGRAM_IG_ID instead of INSTAGRAM_BUSINESS_ACCOUNT_ID
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_IG_ID;

async function setupWebhooks() {
  if (!PAGE_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ACCOUNT_ID) {
    console.error('Missing required environment variables:');
    console.error('- PAGE_ACCESS_TOKEN:', PAGE_ACCESS_TOKEN ? 'SET' : 'MISSING');
    console.error('- INSTAGRAM_BUSINESS_ACCOUNT_ID (INSTAGRAM_IG_ID):', INSTAGRAM_BUSINESS_ACCOUNT_ID ? 'SET' : 'MISSING');
    process.exit(1);
  }

  try {
    console.log('Setting up Instagram webhooks subscription...');
    console.log('Note: Instagram does not support "tags" as a direct webhook subscription field.');
    console.log('We will subscribe to supported fields: mentions, comments');
    
    // Subscribe to supported fields only (tags is not supported)
    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/subscribed_apps`,
      {},
      {
        params: {
          access_token: PAGE_ACCESS_TOKEN,
          subscribed_fields: 'mentions,comments'
        }
      }
    );

    console.log('✅ Webhook subscription successful:', response.data);
    
    // Verify subscription
    const verifyResponse = await axios.get(
      `https://graph.facebook.com/v23.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/subscribed_apps`,
      {
        params: {
          access_token: PAGE_ACCESS_TOKEN,
          fields: 'subscribed_fields'
        }
      }
    );
    
    console.log('Current subscriptions:', verifyResponse.data);
    console.log('\nImportant: For tag detection, a scheduled task will check for tagged media.');
    console.log('Make sure the scheduled task is enabled in your application.');
    
  } catch (error) {
    console.error('❌ Error setting up webhooks:', error.response?.data || error.message);
    
    if (error.response?.data?.error?.message) {
      console.error('Error details:', error.response.data.error.message);
    }
  }
}

// Run the setup
setupWebhooks();