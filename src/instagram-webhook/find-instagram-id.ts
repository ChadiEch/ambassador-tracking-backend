#!/usr/bin/env node

// Utility script to find the correct Instagram Business Account ID
// Run this script to discover your Instagram Business Account ID

import axios from 'axios';

// Define the type for Instagram account information
interface InstagramAccountInfo {
  pageId: string;
  pageName: string;
  instagramAccountId: string;
  instagramUsername: string;
  instagramName: string;
}

// Replace these with your actual values
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'YOUR_PAGE_ACCESS_TOKEN_HERE';
const GRAPH_API_VERSION = 'v23.0';

async function findInstagramAccountId() {
  try {
    console.log('🔍 Discovering Instagram Business Account ID...\n');
    
    // Get all accounts associated with this access token
    const accountsUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts`;
    const accountsParams = {
      access_token: PAGE_ACCESS_TOKEN,
      fields: 'id,name,instagram_business_account{id,username,name}'
    };

    console.log(`📡 Requesting: ${accountsUrl}`);
    const accountsResponse = await axios.get(accountsUrl, { params: accountsParams });

    console.log(`✅ Response status: ${accountsResponse.status}\n`);
    
    // Look for Instagram Business Accounts in the response
    const instagramAccounts: InstagramAccountInfo[] = [];
    if (accountsResponse.data?.data) {
      for (const account of accountsResponse.data.data) {
        if (account.instagram_business_account) {
          instagramAccounts.push({
            pageId: account.id,
            pageName: account.name,
            instagramAccountId: account.instagram_business_account.id,
            instagramUsername: account.instagram_business_account.username,
            instagramName: account.instagram_business_account.name
          });
        }
      }
    }

    if (instagramAccounts.length === 0) {
      console.log('❌ No Instagram Business Accounts found.');
      console.log('💡 Please make sure your Instagram account is properly connected to a Facebook Page and set up as a Business Account.');
      console.log('📚 Documentation: https://developers.facebook.com/docs/instagram-api/getting-started');
      return;
    }

    console.log(`✅ Found ${instagramAccounts.length} Instagram Business Account(s):\n`);
    
    instagramAccounts.forEach((account, index) => {
      console.log(`${index + 1}. Instagram Business Account:`);
      console.log(`   ID: ${account.instagramAccountId}`);
      console.log(`   Username: ${account.instagramUsername}`);
      console.log(`   Name: ${account.instagramName}`);
      console.log(`   Connected Facebook Page: ${account.pageName} (${account.pageId})\n`);
    });

    console.log('📋 To use the correct Instagram Business Account ID:');
    console.log('   1. Update your INSTAGRAM_IG_ID environment variable with one of the IDs above');
    console.log('   2. Redeploy your application');
    console.log('   3. Test your Instagram integration again\n');

  } catch (error: any) {
    console.error('❌ Error discovering Instagram accounts:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    console.log('\n💡 Troubleshooting tips:');
    console.log('   - Make sure your PAGE_ACCESS_TOKEN is correct and has the necessary permissions');
    console.log('   - Verify that your Instagram account is set up as a Business Account');
    console.log('   - Ensure your Instagram account is connected to a Facebook Page');
    console.log('   - Check that your Facebook app has the required permissions (instagram_basic, pages_show_list, etc.)');
  }
}

// Run the function
findInstagramAccountId();