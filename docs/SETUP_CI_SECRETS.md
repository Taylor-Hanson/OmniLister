# Setting Up CI Secrets for GitHub Repository

This guide walks you through adding the required secrets to your GitHub repository for mobile deployment.

## Required Secrets

### EAS Build & Submit Secrets

Add these secrets to your GitHub repository at: `https://github.com/YOUR_USERNAME/OmniLister/settings/secrets/actions`

#### 1. EXPO_TOKEN
- **Description**: Your Expo access token for EAS CLI authentication
- **How to get**: 
  1. Go to [Expo Dashboard](https://expo.dev)
  2. Sign in to your account
  3. Go to Account Settings → Access Tokens
  4. Create a new token with "EAS" scope
- **Value**: `exp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### 2. EXPO_USERNAME
- **Description**: Your Expo username
- **How to get**: Found in your Expo account settings
- **Value**: `your-expo-username`

#### 3. APPLE_ID
- **Description**: Your Apple ID email address
- **How to get**: The email address associated with your Apple Developer account
- **Value**: `your-apple-id@example.com`

#### 4. APPLE_TEAM_ID
- **Description**: Your Apple Developer Team ID
- **How to get**: 
  1. Go to [Apple Developer Portal](https://developer.apple.com)
  2. Sign in to your account
  3. Go to Membership → Team ID
- **Value**: `XXXXXXXXXX` (10-character string)

#### 5. APPLE_APP_ID
- **Description**: Your App Store Connect App ID
- **How to get**: 
  1. Go to [App Store Connect](https://appstoreconnect.apple.com)
  2. Create a new app or select existing app
  3. Copy the App ID from the app information
- **Value**: `1234567890` (numeric string)

#### 6. GOOGLE_SERVICE_ACCOUNT_KEY
- **Description**: Google Play Console service account JSON key
- **How to get**: 
  1. Go to [Google Cloud Console](https://console.cloud.google.com)
  2. Create a new project or select existing
  3. Enable Google Play Developer API
  4. Create a Service Account
  5. Download the JSON key file
  6. In Play Console, link the project and grant access
- **Value**: The entire JSON content as a single line

### Optional Secrets (for advanced features)

#### 7. STRIPE_WEBHOOK_SECRET
- **Description**: Stripe webhook endpoint secret
- **How to get**: From your Stripe dashboard webhook configuration
- **Value**: `whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### 8. STRIPE_PUBLISHABLE_KEY
- **Description**: Stripe publishable key for client-side
- **How to get**: From your Stripe dashboard API keys
- **Value**: `pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### 9. STRIPE_SECRET_KEY
- **Description**: Stripe secret key for server-side
- **How to get**: From your Stripe dashboard API keys
- **Value**: `sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## How to Add Secrets to GitHub

1. **Navigate to Repository Settings**:
   - Go to your GitHub repository
   - Click on "Settings" tab
   - Click on "Secrets and variables" → "Actions"

2. **Add Each Secret**:
   - Click "New repository secret"
   - Enter the secret name (exactly as listed above)
   - Enter the secret value
   - Click "Add secret"

3. **Verify Secrets**:
   - All secrets should be listed in the repository secrets
   - Names should match exactly (case-sensitive)

## Testing Secrets

After adding secrets, you can test them by:

1. **Manual Workflow Trigger**:
   - Go to Actions tab in your repository
   - Select "EAS Build and Submit" workflow
   - Click "Run workflow"
   - Select platform and profile
   - Click "Run workflow"

2. **Check Workflow Logs**:
   - Monitor the workflow execution
   - Look for authentication success messages
   - Check for any secret-related errors

## Security Notes

- **Never commit secrets to the repository**
- **Use environment-specific secrets** (test vs production)
- **Rotate secrets regularly**
- **Limit secret access to necessary workflows only**

## Troubleshooting

### Common Issues

1. **Invalid Expo Token**:
   - Regenerate token in Expo dashboard
   - Ensure token has correct scopes

2. **Apple Authentication Failed**:
   - Verify Apple ID and Team ID
   - Check App Store Connect app exists
   - Ensure proper permissions

3. **Google Service Account Issues**:
   - Verify JSON key format
   - Check Play Console project linking
   - Ensure API is enabled

### Getting Help

- Check workflow logs for specific error messages
- Verify secret names match exactly
- Test secrets individually if possible
- Contact platform support for authentication issues
