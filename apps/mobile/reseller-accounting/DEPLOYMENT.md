# Deployment Guide

This guide covers deploying the OmniLister Reseller Accounting Module to production.

## Prerequisites

- Supabase account and project
- Expo account for mobile app deployment
- Apple Developer account (for iOS)
- Google Play Console account (for Android)

## Backend Deployment (Supabase)

### 1. Database Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy database schema
supabase db push
```

### 2. Edge Functions Deployment

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy pnl-report
supabase functions deploy tax-summary
supabase functions deploy csv-sales-import
supabase functions deploy csv-expenses-import
supabase functions deploy pdf-invoice
supabase functions deploy qb-preview
supabase functions deploy qb-commit
supabase functions deploy qb-connect
supabase functions deploy qb-callback
supabase functions deploy xero-preview
supabase functions deploy xero-commit
supabase functions deploy xero-connect
supabase functions deploy xero-callback
supabase functions deploy pnl-timeseries
```

### 3. Environment Variables

Set these in your Supabase project settings:

```bash
# Database
SUPABASE_DB_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# QuickBooks Integration
QB_CLIENT_ID=your_quickbooks_client_id
QB_CLIENT_SECRET=your_quickbooks_client_secret
QB_REDIRECT_URI=https://[project-ref].supabase.co/functions/v1/qb-callback

# Xero Integration
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_REDIRECT_URI=https://[project-ref].supabase.co/functions/v1/xero-callback

# Storage
STORAGE_INVOICE_BUCKET=invoices
```

### 4. Storage Buckets

Create storage buckets in Supabase:

```bash
# Create invoices bucket
supabase storage create invoices

# Set bucket policies
supabase storage policy create invoices "Users can upload invoices" --bucket invoices --operation insert
supabase storage policy create invoices "Users can view their invoices" --bucket invoices --operation select
```

## Mobile App Deployment

### 1. Environment Configuration

Update your `.env` file with production values:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SENTRY_DSN=your_sentry_dsn
```

### 2. EAS Build Configuration

Update `eas.json` for production builds:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://[project-ref].supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your_anon_key"
      }
    }
  }
}
```

### 3. Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Build for both platforms
eas build --platform all --profile production
```

### 4. Submit to App Stores

```bash
# Submit to Apple App Store
eas submit --platform ios

# Submit to Google Play Store
eas submit --platform android

# Submit to both
eas submit --platform all
```

## Security Configuration

### 1. Row Level Security (RLS)

Ensure RLS policies are properly configured:

```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies
SELECT * FROM pg_policies;
```

### 2. API Keys and Secrets

- Store all secrets in Supabase environment variables
- Never commit API keys to version control
- Use different keys for development and production
- Rotate keys regularly

### 3. Authentication

Configure Supabase Auth:

```bash
# Enable email/password auth
# Configure OAuth providers (Google, Apple, etc.)
# Set up custom SMTP for email verification
```

## Monitoring and Observability

### 1. Sentry Integration

```bash
# Install Sentry
npm install @sentry/react-native

# Configure in app
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: 'production',
});
```

### 2. Supabase Monitoring

- Monitor Edge Function logs
- Set up alerts for errors
- Track performance metrics
- Monitor database usage

### 3. App Store Analytics

- Track app downloads and usage
- Monitor crash reports
- Analyze user feedback
- Monitor performance metrics

## Backup and Recovery

### 1. Database Backups

```bash
# Enable automatic backups in Supabase
# Set up point-in-time recovery
# Test backup restoration procedures
```

### 2. Data Export

```bash
# Regular data exports
# User data portability
# Compliance with data regulations
```

## Performance Optimization

### 1. Database Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_sales_org_sold_at ON sales(org_id, sold_at);
CREATE INDEX CONCURRENTLY idx_expenses_org_occurred_at ON expenses(org_id, occurred_at);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM sales WHERE org_id = 'uuid' AND sold_at BETWEEN 1000 AND 2000;
```

### 2. Edge Function Optimization

- Implement caching where appropriate
- Optimize database queries
- Use connection pooling
- Monitor function execution times

### 3. Mobile App Optimization

- Implement lazy loading
- Optimize image handling
- Use efficient data structures
- Minimize bundle size

## Testing in Production

### 1. Smoke Tests

```bash
# Test critical functions
curl -X GET "https://[project-ref].supabase.co/functions/v1/pnl-report?orgId=test&from=1000&to=2000"

# Test authentication
curl -X POST "https://[project-ref].supabase.co/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### 2. Load Testing

- Test with realistic data volumes
- Monitor performance under load
- Test concurrent user scenarios
- Validate error handling

## Maintenance

### 1. Regular Updates

- Keep dependencies updated
- Monitor security advisories
- Update Edge Functions
- Maintain mobile app versions

### 2. Monitoring

- Set up health checks
- Monitor error rates
- Track performance metrics
- Monitor user feedback

### 3. Scaling

- Monitor resource usage
- Plan for growth
- Implement caching strategies
- Optimize database performance

## Troubleshooting

### Common Issues

1. **Edge Function Timeouts**
   - Optimize database queries
   - Implement pagination
   - Use connection pooling

2. **Authentication Issues**
   - Check JWT configuration
   - Verify RLS policies
   - Test token refresh

3. **Mobile App Crashes**
   - Check Sentry logs
   - Test on different devices
   - Validate data handling

### Support Resources

- Supabase Documentation
- Expo Documentation
- React Native Documentation
- Community Forums
- GitHub Issues
