# Instagram Webhook Setup

This document explains how to set up Instagram webhooks for the Ambassador Tracking system.

## Prerequisites

1. Instagram Business Account
2. Facebook Page connected to your Instagram Business Account
3. Facebook App with Instagram Basic Display API permissions
4. Page Access Token with `instagram_basic` and `instagram_manage_insights` permissions
5. Instagram Business Account ID

## Environment Variables

Make sure you have these environment variables set in your `.env` file:

```
PAGE_ACCESS_TOKEN=your_page_access_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id
META_VERIFY_TOKEN=your_verify_token
```

## Setting up Webhooks

1. **Subscribe to Webhook Events**
   Run the setup script to subscribe to mentions and tags:
   ```bash
   npm run setup-webhooks
   ```

2. **Verify Subscription**
   Check current webhook subscriptions:
   ```bash
   npm run check-webhooks
   ```

## Webhook Events Handled

The system handles the following Instagram webhook events:

1. **Mentions** - When someone mentions your Instagram Business Account in a post or story
2. **Tags** - When someone tags your Instagram Business Account in a post or story
3. **Story Mentions** - When someone mentions your Instagram Business Account in a story

## Troubleshooting

### Webhook Not Receiving Events

1. **Check Webhook URL**
   Make sure your webhook URL is publicly accessible and correctly configured in the Facebook Developer Console.

2. **Verify Subscription**
   Run `npm run check-webhooks` to verify your webhook subscriptions.

3. **Check Logs**
   Check the application logs for any errors in processing webhook events.

4. **Test Webhook**
   Use the Facebook Webhooks testing tool to send test events to your webhook.

### Common Issues

1. **Duplicate Events**
   The system automatically checks for duplicate events using the permalink and skips them.

2. **Missing User Mapping**
   If a user is not found in the system, the activity will still be recorded but not linked to a specific user.

3. **Media Fetch Failures**
   The system retries failed media fetches up to 3 times with exponential backoff.

## Webhook URL

The webhook endpoint is available at:
```
POST /webhook
GET /webhook (for verification)
```

Make sure to configure this URL in your Facebook App's Webhooks settings.