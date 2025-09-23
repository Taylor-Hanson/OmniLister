# Supabase Edge Functions

This directory contains all the Supabase Edge Functions for the reseller accounting module.

## Functions Overview

### Core Reporting Functions

- **`pnl-report`** - Generates P&L reports with period totals and daily trends
- **`tax-summary`** - Calculates sales tax summary by state
- **`pnl-timeseries`** - Provides time-series data for charts (daily/weekly/monthly)

### Data Import Functions

- **`csv-sales-import`** - Imports sales data from CSV with validation and idempotency
- **`csv-expenses-import`** - Imports expenses data from CSV with validation and idempotency

### PDF Generation

- **`pdf-invoice`** - Generates server-side PDF invoices using PDFKit

### QuickBooks Integration

- **`qb-preview`** - Preview QuickBooks journal entries before committing
- **`qb-commit`** - Commit journal entries to QuickBooks with real JournalEntry payloads
- **`qb-auth-init`** - Initialize QuickBooks OAuth flow
- **`qb-auth-callback`** - Handle QuickBooks OAuth callback
- **`qb-status`** - Check QuickBooks connection status and token expiry
- **`qb-accounts-sync`** - Sync Chart of Accounts from QuickBooks
- **`qb-test-journal-reverse`** - Auto-reversing test export ($0.01)
- **`mapping-usage-bump`** - Track account mapping usage for recommendations
- **`qb-diagnostics`** - Comprehensive QuickBooks health check with persistence and alerting
- **`qb-diagnostics-get`** - Fast diagnostics status lookup for UI badges
- **`qb-get-journal`** - Verify journal entries exist in QuickBooks
- **`qb-diagnostics-cron`** - Scheduled diagnostics refresh for all orgs

### Shipping Integration
- **`shipping-addresses`** - Manage shipping addresses with validation
- **`shipping-rates`** - Calculate shipping rates via PirateShip API
- **`shipping-create`** - Create shipments and generate labels
- **`shipping-track`** - Track packages and update status
- **`shipping-dashboard-stats`** - Shipping analytics and statistics
- **`shipping-pending`** - Get pending shipments for processing
- **`shipping-recent`** - Get recent shipment history
- **`shipping-sync-orders`** - Sync marketplace orders for shipping

### Xero Integration

- **`xero-preview`** - Preview Xero journal entries before committing
- **`xero-commit`** - Commit journal entries to Xero
- **`xero-connect`** - Handle Xero OAuth connection
- **`xero-callback`** - Xero OAuth callback handler

## Deployment

To deploy these functions to Supabase:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
supabase functions deploy

# Or deploy individual functions
supabase functions deploy pnl-report
supabase functions deploy tax-summary
# ... etc
```

## Environment Variables

Set these in your Supabase project settings:

```bash
# Database
SUPABASE_DB_URL=postgresql://...

# QuickBooks
QBO_CLIENT_ID=your_client_id
QBO_CLIENT_SECRET=your_client_secret
QBO_REDIRECT_URL=https://your-project.supabase.co/functions/v1/qb-auth-callback

# Xero
XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret
XERO_REDIRECT_URI=https://your-project.supabase.co/functions/v1/xero-callback

# Alerting
RESEND_API_KEY=your_resend_key
ALERT_FROM="Reseller App <alerts@yourdomain.com>"
ALERT_BCC=""
ALERT_SLACK_DEFAULT=""
APP_DASH_URL=https://app.yourdomain.com

# Storage
STORAGE_INVOICE_BUCKET=invoices
```

## Testing

You can test functions locally using the Supabase CLI:

```bash
# Start local development
supabase start

# Test a function
supabase functions serve pnl-report
```

## API Documentation

### P&L Report
```
GET /functions/v1/pnl-report?orgId=uuid&from=epochMs&to=epochMs
```

### Tax Summary
```
GET /functions/v1/tax-summary?orgId=uuid&from=epochMs&to=epochMs
```

### CSV Import
```
POST /functions/v1/csv-sales-import
{
  "orgId": "uuid",
  "sourceLabel": "string",
  "rows": [...]
}
```

### QuickBooks Preview
```
GET /functions/v1/qb-preview?orgId=uuid&from=epochMs&to=epochMs&mode=summarized
```

### QuickBooks Commit
```
POST /functions/v1/qb-commit
{
  "orgId": "uuid",
  "journals": [...],
  "dryRun": false
}
```

### QuickBooks OAuth Init
```
GET /functions/v1/qb-auth-init?orgId=uuid
```

### QuickBooks Status
```
GET /functions/v1/qb-status?orgId=uuid
```

### QuickBooks Accounts Sync
```
GET /functions/v1/qb-accounts-sync?orgId=uuid
```

### QuickBooks Test Export
```
POST /functions/v1/qb-test-journal-reverse
{
  "orgId": "uuid",
  "sameDay": false,
  "noteSuffix": "optional"
}
```

### QuickBooks Diagnostics
```
POST /functions/v1/qb-diagnostics
{
  "orgId": "uuid",
  "save": true,
  "lastTestForwardId": "optional",
  "lastTestReverseId": "optional",
  "lastVerifiedAt": "optional"
}
```
**Features:**
- Comprehensive health check (OAuth, mappings, account types)
- Status change detection and alerting
- Email notifications via Resend
- Slack webhook notifications
- Audit trail in `alert_events` table

### QuickBooks Diagnostics Status
```
GET /functions/v1/qb-diagnostics-get?orgId=uuid
```

### QuickBooks Journal Verification
```
POST /functions/v1/qb-get-journal
{
  "orgId": "uuid",
  "ids": ["journal_id_1", "journal_id_2"]
}
```

## Security

- All functions use JWT authentication
- Row Level Security (RLS) is enforced
- All financial mutations are audited
- Input validation using Zod schemas
- Server-side secrets only

## Error Handling

All functions return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Optional additional details"
}
```

Success responses vary by function but typically include:

```json
{
  "ok": true,
  "data": "..."
}
```
