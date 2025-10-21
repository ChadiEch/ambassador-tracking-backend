# Instagram Integration Setup Guide

## Common Issue: Using Facebook Page ID Instead of Instagram Business Account ID

The error messages you're seeing indicate that you're using a Facebook Page ID instead of an Instagram Business Account ID:

```
Instagram API Error: (#100) Tried accessing nonexisting field (tags) on node type (Page)
Instagram API Error: (#100) Tried accessing nonexisting field (profile_picture_url) on node type (Page)
```

## Solution

### 1. Use the Discovery Tools

You have several options to find the correct Instagram Business Account ID:

#### Option A: Use the Admin Dashboard (Recommended)
1. Go to your Admin Dashboard
2. Click the "Discover Instagram Accounts" button
3. Look for the Instagram Business Account ID in the results

#### Option B: Use the API Endpoint
Make a GET request to:
```
https://ambassador-tracking-backend-production.up.railway.app/webhook/discover-instagram
```

#### Option C: Run the Utility Script
```bash
npm run find-instagram-id
```

### 2. Update Your Configuration

Once you have the correct Instagram Business Account ID:

1. Update your `.env` file:
```
INSTAGRAM_IG_ID=YOUR_CORRECT_INSTAGRAM_BUSINESS_ACCOUNT_ID
```

2. Update your Railway environment variables with the same ID

3. Redeploy your application

## How to Verify Your Instagram Setup

### 1. Check Instagram Account Type
Make sure your Instagram account is:
- Set up as a **Business Account** (not a personal account)
- Connected to a Facebook Page
- Has the necessary permissions

### 2. Verify Facebook App Permissions
Your Facebook app should have these permissions:
- `instagram_basic`
- `instagram_manage_insights`
- `pages_show_list`
- `pages_read_engagement`

### 3. Test the Connection
After updating your ID, test the connection using:
- "Test Credentials" button in the Admin Dashboard
- "Validate Instagram Setup" button in the Admin Dashboard

## Troubleshooting

### If You Still Get Errors

1. **Double-check the ID**: Make sure you're using the Instagram Business Account ID, not the Facebook Page ID
2. **Verify permissions**: Ensure your access token has all required permissions
3. **Check Instagram setup**: Confirm your Instagram account is properly set up as a Business Account
4. **Review Facebook App configuration**: Make sure your app is properly configured with the correct permissions

### Common Mistakes

1. **Using Facebook Page ID**: The ID `610997345440995` is a Facebook Page ID, not an Instagram Business Account ID
2. **Using old access tokens**: Make sure your access token is current and has all required permissions
3. **Personal vs Business Account**: Instagram personal accounts cannot be used with the Instagram Graph API

## Need More Help?

1. Check the Facebook Developer documentation: https://developers.facebook.com/docs/instagram-api
2. Review Instagram Graph API permissions: https://developers.facebook.com/docs/instagram-api/overview#permissions
3. Contact Facebook support if you continue to have issues with your Instagram Business Account setup