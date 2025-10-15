import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_IG_ID; // Changed this line

if (!PAGE_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ACCOUNT_ID) {
  console.error('Missing required environment variables:');
  console.error('- PAGE_ACCESS_TOKEN:', PAGE_ACCESS_TOKEN ? 'SET' : 'MISSING');
  console.error('- INSTAGRAM_BUSINESS_ACCOUNT_ID (INSTAGRAM_IG_ID):', INSTAGRAM_BUSINESS_ACCOUNT_ID ? 'SET' : 'MISSING');
  process.exit(1);
}

async function checkWebhookSubscription() {
  try {
    // Check current subscriptions
    const response = await axios.get(
      `https://graph.facebook.com/v23.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/subscribed_apps`,
      {
        params: {
          access_token: PAGE_ACCESS_TOKEN,
          fields: 'subscribed_fields'
        }
      }
    );

    console.log('Current webhook subscriptions:', response.data);
    
    // Check if we're subscribed to mentions and tags
    const subscribedFields = response.data?.data?.[0]?.subscribed_fields || [];
    console.log('Subscribed fields:', subscribedFields);
    
    if (!subscribedFields.includes('mentions')) {
      console.log('Missing mentions subscription');
    }
    
    if (!subscribedFields.includes('tags')) {
      console.log('Missing tags subscription');
    }
    
  } catch (error) {
    console.error('Error checking webhook subscription:', error.response?.data || error.message);
  }
}

async function subscribeToWebhooks() {
  try {
    // Subscribe to mentions and tags
    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/subscribed_apps`,
      {},
      {
        params: {
          access_token: PAGE_ACCESS_TOKEN,
          subscribed_fields: 'mentions,tags'
        }
      }
    );

    console.log('Webhook subscription response:', response.data);
  } catch (error) {
    console.error('Error subscribing to webhooks:', error.response?.data || error.message);
  }
}

// Run the functions
checkWebhookSubscription().then(() => {
  console.log('Checking subscription completed');
  // Uncomment the next line if you want to subscribe to webhooks
  // subscribeToWebhooks();
});