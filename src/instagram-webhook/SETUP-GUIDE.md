# Complete Instagram Webhook Setup Guide

This guide will help you set up Instagram webhooks from scratch for the Ambassador Tracking system.

## Step 1: Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" and then "Create App"
3. Select "Business" as the app type
4. Enter app name and contact email
5. Complete the security check

## Step 2: Configure Instagram Basic Display

1. In your Facebook App dashboard, click "Add Product"
2. Select "Instagram Basic Display" and click "Set Up"
3. In the left sidebar, click "Instagram Basic Display" under Products
4. Click "Create New App" and follow the prompts

## Step 3: Get Instagram Credentials

1. In your Facebook App dashboard, go to Settings > Basic
2. Note down your "App ID" and "App Secret"
3. Add these to your `.env` file:
   ```
   INSTAGRAM_APP_ID=your_app_id
   INSTAGRAM_APP_SECRET=your_app_secret
   ```

## Step 4: Get Instagram Business Account ID

1. Go to [Facebook Business Manager](https://business.facebook.com/)
2. Select your business account
3. Go to "Accounts" > "Instagram Accounts"
4. Click on your Instagram account
5. The URL will contain your Instagram Business Account ID
6. Add it to your `.env` file:
   ```
   INSTAGRAM_IG_ID=your_instagram_business_account_id
   ```

## Step 5: Generate Access Tokens

### Get Short-lived Token

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app from the dropdown
3. Select "Get Token" > "Get Page Access Token"
4. Make sure to select the page connected to your Instagram account
5. Copy the generated token

### Exchange for Long-lived Token

1. Use the following URL in your browser (replace values):
   ```
   https://graph.facebook.com/v23.0/oauth/access_token?
     grant_type=fb_exchange_token&
     client_id=YOUR_APP_ID&
     client_secret=YOUR_APP_SECRET&
     fb_exchange_token=SHORT_LIVED_TOKEN
   ```
2. Copy the `access_token` from the response
3. Add it to your `.env` file:
   ```
   PAGE_ACCESS_TOKEN=your_long_lived_access_token
   ```

## Step 6: Configure Webhook URL

1. In your Facebook App dashboard, go to "Webhooks" in the left sidebar
2. Click "Add Callback URL"
3. Enter your webhook URL:
   ```
   https://your-domain.com/webhook
   ```
4. Enter your verify token (should match META_VERIFY_TOKEN in .env):
   ```
   ambassador123
   ```
5. Click "Verify and Save"

## Step 7: Subscribe to Events

1. In the Webhooks section, click "Add Subscriptions"
2. Select "Page" from the dropdown
3. Subscribe to the following fields:
   - `mentions`
   - `comments`
4. Click "Save"

Note: Instagram does not support "tags" as a direct webhook subscription field. Tag detection is handled through a scheduled task that periodically checks for tagged media.

## Step 8: Test the Setup

1. Run the check script:
   ```bash
   npm run check-webhooks
   ```
2. You should see output showing your subscriptions

## Step 9: Set Up Auto-refresh (Optional)

To avoid token expiration issues:

1. Set up a cron job to refresh your token every 50 days
2. Run the refresh script:
   ```bash
   npm run refresh-token
   ```
3. Update your `.env` file with the new token

## Environment Variables Summary

Your `.env` file should contain:

```
# Instagram App Credentials
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret

# Instagram Account
INSTAGRAM_IG_ID=your_instagram_business_account_id

# Access Tokens
PAGE_ACCESS_TOKEN=your_long_lived_access_token

# Webhook Verification
META_VERIFY_TOKEN=ambassador123
```

## Tag Detection

Since Instagram does not support "tags" as a webhook subscription field, the system implements a scheduled task that:

1. Runs every hour to check for new tagged media
2. Uses the Instagram Graph API `/tags` endpoint
3. Processes and saves tagged media activities
4. Prevents duplicate processing

Make sure the scheduled task is enabled in your application configuration.

## Troubleshooting

### Common Issues

1. **"Application has been deleted"**
   - Create a new Facebook app and update your credentials

2. **"Session has expired"**
   - Generate a new long-lived token

3. **"Error validating application"**
   - Check that your app ID and secret are correct

4. **Webhook not receiving events**
   - Verify your webhook URL is publicly accessible
   - Check that you've subscribed to the correct events
   - Ensure your Instagram account is a Business account

### Testing Webhooks

1. Use Facebook's Webhook testing tool
2. Send test events to verify your endpoint works
3. Check application logs for processing details

## Important Notes

1. Instagram tokens expire after 60 days
2. Your Instagram account must be a Business account
3. Your Facebook Page must be connected to your Instagram Business account
4. The webhook URL must be publicly accessible (localhost won't work)
5. Tag detection requires a scheduled task, not webhooks