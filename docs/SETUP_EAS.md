# Setting Up EAS (Expo Application Services)

This guide walks you through configuring EAS for your OmniLister mobile app.

## Prerequisites

- Expo account (free tier available)
- Apple Developer account ($99/year)
- Google Play Console account ($25 one-time)

## Step 1: Install EAS CLI

```bash
npm install -g @expo/eas-cli
```

## Step 2: Login to Expo

```bash
eas login
```

Enter your Expo credentials when prompted.

## Step 3: Initialize EAS Project

```bash
cd apps/mobile/OmniListerMobile
eas init
```

This will:
- Create an EAS project
- Generate a project ID
- Update your `app.config.js` with the project ID

## Step 4: Update Configuration

After running `eas init`, you'll need to update the configuration:

### Update app.config.js

Replace the placeholder project ID with your actual EAS project ID:

```javascript
// In apps/mobile/OmniListerMobile/app.config.js
extra: {
  eas: {
    projectId: "your-actual-project-id-here" // Replace this
  }
}
```

### Update Bundle Identifiers

Update the bundle identifiers in `app.config.js`:

```javascript
ios: {
  bundleIdentifier: "com.yourcompany.omnilister.beta", // Replace with your bundle ID
  // ... other config
},
android: {
  package: "com.yourcompany.omnilister.beta", // Replace with your package name
  // ... other config
}
```

## Step 5: Configure Apple Credentials

### Create App Store Connect API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Users and Access** → **Keys** → **App Store Connect API**
3. Click **Generate API Key**
4. Download the `.p8` file
5. Note the Key ID and Issuer ID

### Add Apple Credentials to EAS

```bash
eas credentials
```

Select:
- Platform: iOS
- Credential type: App Store Connect API Key
- Upload your `.p8` file
- Enter Key ID and Issuer ID

## Step 6: Configure Google Credentials

### Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Play Developer API
4. Create a Service Account
5. Download the JSON key file
6. In Play Console, go to **Setup** → **API access**
7. Link your Google Cloud project
8. Grant access to your service account

### Add Google Credentials to EAS

```bash
eas credentials
```

Select:
- Platform: Android
- Credential type: Google Play Service Account
- Upload your service account JSON file

## Step 7: Test Configuration

### Test EAS Build

```bash
# Test iOS build
eas build --platform ios --profile preview

# Test Android build
eas build --platform android --profile preview
```

### Check Build Status

```bash
eas build:list
```

## Step 8: Update GitHub Secrets

After successful configuration, update your GitHub secrets with the actual values:

1. **EXPO_TOKEN**: Get from `eas whoami`
2. **EXPO_USERNAME**: Your Expo username
3. **APPLE_ID**: Your Apple ID email
4. **APPLE_TEAM_ID**: From Apple Developer Portal
5. **APPLE_APP_ID**: From App Store Connect
6. **GOOGLE_SERVICE_ACCOUNT_KEY**: The JSON content from your service account

## Step 9: Test CI/CD

### Manual Workflow Trigger

1. Go to your GitHub repository
2. Navigate to Actions tab
3. Select "EAS Build and Submit" workflow
4. Click "Run workflow"
5. Select platform and profile
6. Click "Run workflow"

### Monitor Build

- Check workflow logs for progress
- Verify authentication success
- Look for build completion

## Troubleshooting

### Common Issues

1. **Project ID Not Found**:
   - Run `eas init` again
   - Check project ID in app.config.js

2. **Authentication Failed**:
   - Verify credentials in EAS
   - Check GitHub secrets

3. **Build Failed**:
   - Check build logs for specific errors
   - Verify bundle identifiers
   - Check app configuration

### Getting Help

- Check [EAS Documentation](https://docs.expo.dev/build/introduction/)
- Join [Expo Discord](https://chat.expo.dev)
- Check [GitHub Issues](https://github.com/expo/expo/issues)

## Next Steps

After successful EAS setup:

1. **Test Beta Builds**: Run preview builds for both platforms
2. **Submit to Stores**: Use production profiles for store submission
3. **Monitor Performance**: Track build times and success rates
4. **Update Documentation**: Keep deployment docs current
