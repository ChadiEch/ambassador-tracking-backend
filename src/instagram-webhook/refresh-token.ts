import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const APP_ID = process.env.INSTAGRAM_APP_ID;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const SHORT_LIVED_TOKEN = process.env.INSTAGRAM_EXTENDED_TOKEN; // This is actually a short-lived token

async function refreshToken() {
  if (!APP_ID || !APP_SECRET || !SHORT_LIVED_TOKEN) {
    console.error('Missing required environment variables:');
    console.error('- INSTAGRAM_APP_ID:', APP_ID ? 'SET' : 'MISSING');
    console.error('- INSTAGRAM_APP_SECRET:', APP_SECRET ? 'SET' : 'MISSING');
    console.error('- INSTAGRAM_EXTENDED_TOKEN (short-lived token):', SHORT_LIVED_TOKEN ? 'SET' : 'MISSING');
    process.exit(1);
  }

  try {
    console.log('Refreshing Instagram access token...');
    
    // Exchange short-lived token for long-lived token
    const response = await axios.get(
      'https://graph.facebook.com/v23.0/oauth/access_token',
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: APP_ID,
          client_secret: APP_SECRET,
          fb_exchange_token: SHORT_LIVED_TOKEN
        }
      }
    );

    console.log('✅ Token refresh successful!');
    console.log('New access token:', response.data.access_token);
    console.log('Token expires in:', response.data.expires_in, 'seconds');
    console.log('Expiration date:', new Date(Date.now() + response.data.expires_in * 1000).toString());
    
    console.log('\nUpdate your .env file with this new token:');
    console.log('PAGE_ACCESS_TOKEN=' + response.data.access_token);
    
  } catch (error) {
    console.error('❌ Error refreshing token:', error.response?.data || error.message);
    
    if (error.response?.data?.error?.message) {
      console.error('Error details:', error.response.data.error.message);
    }
  }
}

// Run the token refresh
refreshToken();