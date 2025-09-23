# Mobile Deployment Guide

## Overview

This guide covers deploying the OmniLister mobile app to iOS and Android app stores using EAS (Expo Application Services).

## Prerequisites

### Required Accounts
- [Expo Account](https://expo.dev) (free tier available)
- [Apple Developer Account](https://developer.apple.com) ($99/year)
- [Google Play Console](https://play.google.com/console) ($25 one-time)

### Required Tools
- [EAS CLI](https://docs.expo.dev/build/setup/#eas-cli): `npm install -g @expo/eas-cli`
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g @expo/cli`

## Setup

### 1. Expo Project Setup

```bash
# Login to Expo
eas login

# Initialize EAS project
cd apps/mobile/OmniListerMobile
eas init

# Update app.config.js with your project ID
# Replace "your-project-id-here" with the actual project ID from EAS
```

### 2. Apple App Store Connect Setup

#### Create App Store Connect API Key
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Users and Access** → **Keys** → **App Store Connect API**
3. Click **Generate API Key**
4. Download the `.p8` file
5. Note the Key ID and Issuer ID

#### Configure EAS
```bash
# Add Apple credentials to EAS
eas credentials

# Select iOS platform
# Choose "App Store Connect API Key" when prompted
# Upload your .p8 file and enter Key ID and Issuer ID
```

### 3. Google Play Console Setup

#### Create Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Play Developer API
4. Create a Service Account
5. Download the JSON key file
6. In Play Console, go to **Setup** → **API access**
7. Link your Google Cloud project
8. Grant access to your service account

#### Configure EAS
```bash
# Add Android credentials to EAS
eas credentials

# Select Android platform
# Choose "Google Play Service Account" when prompted
# Upload your service account JSON file
```

## Build Commands

### Development Builds
```bash
# iOS development build
npm run mobile:dev:ios

# Android development build
npm run mobile:dev:android

# Both platforms
npm run mobile:dev
```

### Preview/Beta Builds
```bash
# iOS beta build (TestFlight)
npm run mobile:beta:ios

# Android beta build (Play Internal)
npm run mobile:beta:android

# Both platforms
npm run mobile:beta
```

### Production Builds
```bash
# iOS production build
npm run mobile:prod:ios

# Android production build
npm run mobile:prod:android

# Both platforms
npm run mobile:prod
```

## Submission Commands

### Submit to TestFlight (iOS)
```bash
npm run mobile:submit:ios
```

### Submit to Play Internal (Android)
```bash
npm run mobile:beta:android
```

### Submit to Production Stores
```bash
# iOS App Store
npm run mobile:submit:ios:prod

# Google Play Store
npm run mobile:submit:android:prod
```

## CI/CD Integration

### GitHub Actions
The repository includes automated CI/CD workflows:

- **EAS Build**: `.github/workflows/eas-build.yml`
- **Manual Triggers**: Available in GitHub Actions tab

### Required Secrets
Add these secrets to your GitHub repository:

```
EXPO_TOKEN=your_expo_access_token
EXPO_USERNAME=your_expo_username
APPLE_ID=your_apple_id@example.com
APPLE_TEAM_ID=your_apple_team_id
APPLE_APP_ID=your_app_store_connect_app_id
GOOGLE_SERVICE_ACCOUNT_KEY=your_service_account_json_content
```

### Manual CI Trigger
```bash
# Trigger build via GitHub CLI
gh workflow run eas-build.yml -f platform=all -f profile=preview -f submit=false
```

## Testing Checklist

### Pre-Build Testing
- [ ] App builds successfully locally
- [ ] All tests pass
- [ ] Feature flags work correctly
- [ ] Push notifications function
- [ ] Offline queue works
- [ ] Camera features work
- [ ] Barcode scanning works

### Beta Testing
- [ ] TestFlight/Play Internal access granted
- [ ] Test accounts created
- [ ] Core user flows tested
- [ ] Performance acceptable
- [ ] No crashes in first 24 hours
- [ ] Push notifications received
- [ ] Offline functionality verified

### Production Readiness
- [ ] App store guidelines compliance
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] App store metadata complete
- [ ] Screenshots and descriptions ready
- [ ] Age rating appropriate
- [ ] Content rating accurate

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear EAS cache
eas build --clear-cache

# Check build logs
eas build:list
eas build:view [build-id]
```

#### Credential Issues
```bash
# Reset credentials
eas credentials --clear-credentials

# Reconfigure credentials
eas credentials
```

#### Submission Failures
```bash
# Check submission status
eas submit:list

# View submission logs
eas submit:view [submit-id]
```

### Support Resources
- [EAS Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Discord](https://chat.expo.dev)
- [GitHub Issues](https://github.com/expo/expo/issues)

## Release Process

### 1. Version Bump
```bash
# Update version in app.config.js
# Update build numbers in eas.json
```

### 2. Build and Test
```bash
# Create beta build
npm run mobile:beta

# Test on TestFlight/Play Internal
# Gather feedback and fix issues
```

### 3. Production Release
```bash
# Create production build
npm run mobile:prod

# Submit to stores
npm run mobile:submit:ios:prod
npm run mobile:submit:android:prod
```

### 4. Monitor Release
- Monitor crash reports
- Check app store reviews
- Track performance metrics
- Gather user feedback

## Security Considerations

### Secrets Management
- Never commit credentials to repository
- Use GitHub Secrets for CI/CD
- Rotate credentials regularly
- Use least-privilege access

### App Security
- Enable app transport security
- Use secure storage for sensitive data
- Implement proper authentication
- Regular security audits

## Performance Optimization

### Build Optimization
- Use appropriate resource classes
- Optimize bundle size
- Enable code splitting
- Use tree shaking

### Runtime Optimization
- Implement lazy loading
- Optimize images
- Use efficient data structures
- Monitor memory usage

## Monitoring and Analytics

### Crash Reporting
- Configure Sentry or similar
- Monitor crash rates
- Set up alerts for critical issues

### Performance Monitoring
- Track app launch time
- Monitor memory usage
- Measure network performance
- User experience metrics

### Analytics
- User engagement tracking
- Feature usage analytics
- Conversion funnel analysis
- A/B testing framework
