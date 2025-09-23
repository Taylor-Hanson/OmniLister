# Product SKUs and Entitlements

This document describes the product SKUs across Apple App Store, Google Play Store, and Web/Stripe, and how they map to user entitlements.

## Product Overview

### Advanced Automation
- **Description**: Unlock advanced automation features including smart scheduling, bulk operations, and AI-powered optimization
- **Price**: $9.99/month
- **Entitlement**: `ADV_AUTOMATION`

### Bulk Analytics
- **Description**: Access to bulk analytics, advanced reporting, and data export features
- **Price**: $4.99/month
- **Entitlement**: `BULK_ANALYTICS`

### Premium Support
- **Description**: Priority customer support with faster response times and dedicated support channels
- **Price**: $2.99/month
- **Entitlement**: `PREMIUM_SUPPORT`

### Unlimited Listings
- **Description**: Remove listing limits and enable unlimited inventory management
- **Price**: $19.99/month
- **Entitlement**: `UNLIMITED_LISTINGS`

## Platform-Specific SKUs

### Apple App Store
```
com.juliehanson.omnilister.adv_automation
com.juliehanson.omnilister.bulk_analytics
com.juliehanson.omnilister.premium_support
com.juliehanson.omnilister.unlimited_listings
```

### Google Play Store
```
adv_automation
bulk_analytics
premium_support
unlimited_listings
```

### Web/Stripe
```
price_adv_automation
price_bulk_analytics
price_premium_support
price_unlimited_listings
```

## Entitlement Mapping

| Product | Apple SKU | Google SKU | Web SKU | Entitlement |
|---------|-----------|------------|---------|-------------|
| Advanced Automation | `com.juliehanson.omnilister.adv_automation` | `adv_automation` | `price_adv_automation` | `ADV_AUTOMATION` |
| Bulk Analytics | `com.juliehanson.omnilister.bulk_analytics` | `bulk_analytics` | `price_bulk_analytics` | `BULK_ANALYTICS` |
| Premium Support | `com.juliehanson.omnilister.premium_support` | `premium_support` | `price_premium_support` | `PREMIUM_SUPPORT` |
| Unlimited Listings | `com.juliehanson.omnilister.unlimited_listings` | `unlimited_listings` | `price_unlimited_listings` | `UNLIMITED_LISTINGS` |

## Trial Entitlements

New users receive a 14-day free trial with access to:
- `ADV_AUTOMATION`
- `BULK_ANALYTICS`

Trial entitlements automatically expire after 14 days and users must purchase a subscription to continue using these features.

## Implementation Notes

### Mobile Apps (iOS/Android)
- Use In-App Purchase (IAP) for all paid features
- Never redirect iOS users to web payment flows
- Implement receipt verification on the backend
- Sync entitlements after successful purchase

### Web Application
- Use Stripe for subscription management
- Implement webhook handlers for subscription events
- Sync entitlements when subscription status changes
- Provide upgrade paths from mobile to web subscriptions

### Cross-Platform Considerations
- Entitlements are stored centrally and synced across platforms
- Users can access features on any platform where they have valid entitlements
- Subscription management is platform-specific but entitlements are shared

## Testing

### Test Products (Sandbox)
- Apple: Use sandbox environment with test accounts
- Google: Use internal testing track with test accounts
- Stripe: Use test mode with test payment methods

### Test Accounts
- Create test accounts for each platform
- Verify entitlement sync across platforms
- Test trial expiration and renewal flows
- Validate receipt verification and error handling

## Compliance

### Apple App Store Guidelines
- All digital features must be sold through IAP
- No external payment links for digital content
- Clear pricing and subscription terms
- Proper handling of subscription cancellations

### Google Play Store Guidelines
- Use Google Play Billing for all in-app purchases
- Implement proper subscription management
- Handle subscription lifecycle events
- Provide clear cancellation options

### Web/Stripe Compliance
- PCI DSS compliance for payment processing
- GDPR compliance for user data
- Clear terms of service and privacy policy
- Proper handling of subscription cancellations and refunds

## Monitoring and Analytics

### Key Metrics
- Conversion rate from trial to paid
- Churn rate by product
- Revenue per user (RPU)
- Platform-specific performance

### Alerts
- Failed receipt verifications
- Entitlement sync failures
- Subscription payment failures
- Unusual usage patterns

## Support

### Common Issues
- Entitlement not syncing after purchase
- Trial not activating
- Cross-platform access issues
- Payment processing errors

### Resolution Process
1. Verify receipt/subscription status
2. Check entitlement sync logs
3. Manual entitlement grant if needed
4. Escalate to platform support if required
