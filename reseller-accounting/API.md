# API Documentation

This document describes the API endpoints for the OmniLister Reseller Accounting Module.

## Base URL

```
https://[project-ref].supabase.co/functions/v1
```

## Authentication

All API endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Core Reporting APIs

### P&L Report

Get profit and loss report for a specific period.

**Endpoint:** `GET /pnl-report`

**Query Parameters:**
- `orgId` (string, required) - Organization ID
- `from` (number, required) - Start date in epoch milliseconds
- `to` (number, required) - End date in epoch milliseconds

**Response:**
```json
{
  "orgId": "uuid",
  "from": "2024-01-01",
  "to": "2024-01-31",
  "totals": {
    "revenueCents": 150000,
    "cogsCents": 45000,
    "feesCents": 12000,
    "shippingCostCents": 8000,
    "expensesCents": 15000,
    "grossProfitCents": 85000,
    "netProfitCents": 70000
  },
  "trend": [
    {
      "day": "2024-01-01",
      "revenueCents": 5000,
      "directCostsCents": 2000
    }
  ]
}
```

### Tax Summary

Get sales tax summary by jurisdiction.

**Endpoint:** `GET /tax-summary`

**Query Parameters:**
- `orgId` (string, required) - Organization ID
- `from` (number, required) - Start date in epoch milliseconds
- `to` (number, required) - End date in epoch milliseconds

**Response:**
```json
{
  "orgId": "uuid",
  "from": 1640995200000,
  "to": 1643673600000,
  "rows": [
    {
      "state": "CA",
      "taxCollectedCents": 1200,
      "remittedByMarketplaceCents": 1200,
      "sellerOwedCents": 0
    },
    {
      "state": "TX",
      "taxCollectedCents": 900,
      "remittedByMarketplaceCents": 0,
      "sellerOwedCents": 900
    }
  ]
}
```

### P&L Time Series

Get time-series data for charts and analytics.

**Endpoint:** `GET /pnl-timeseries`

**Query Parameters:**
- `orgId` (string, required) - Organization ID
- `from` (number, required) - Start date in epoch milliseconds
- `to` (number, required) - End date in epoch milliseconds
- `granularity` (string, optional) - "daily", "weekly", or "monthly" (default: "daily")

**Response:**
```json
{
  "orgId": "uuid",
  "from": "2024-01-01",
  "to": "2024-01-31",
  "granularity": "daily",
  "timeSeries": [
    {
      "period": "2024-01-01",
      "revenueCents": 5000,
      "cogsCents": 1500,
      "feesCents": 400,
      "shippingCostCents": 300,
      "taxCents": 400,
      "expensesCents": 500,
      "grossProfitCents": 2800,
      "netProfitCents": 2300,
      "orderCount": 5
    }
  ]
}
```

## Data Import APIs

### Sales CSV Import

Import sales data from CSV.

**Endpoint:** `POST /csv-sales-import`

**Request Body:**
```json
{
  "orgId": "uuid",
  "sourceLabel": "ebay-export-2024-01",
  "rows": [
    {
      "marketplace": "ebay",
      "marketplaceOrderId": "123456789",
      "soldAt": "2024-01-15",
      "title": "Nike Air Max 90",
      "sku": "NK-AM90-001",
      "salePrice": "85.00",
      "shippingCharged": "12.99",
      "shippingCost": "8.50",
      "platformFees": "8.50",
      "discounts": "0.00",
      "refunds": "0.00",
      "chargebacks": "0.00",
      "taxCollected": "7.80",
      "taxRemittedByMarketplace": "yes",
      "currency": "USD"
    }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "inserted": 1,
  "errors": []
}
```

### Expenses CSV Import

Import expenses data from CSV.

**Endpoint:** `POST /csv-expenses-import`

**Request Body:**
```json
{
  "orgId": "uuid",
  "sourceLabel": "bank-export-2024-01",
  "rows": [
    {
      "occurredAt": "2024-01-01",
      "amount": "25.99",
      "category": "shipping_supplies",
      "vendor": "Amazon",
      "method": "credit_card",
      "note": "Bubble mailers and tape",
      "mileageMiles": null,
      "vehicleRate": null
    }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "inserted": 1,
  "errors": []
}
```

## PDF Generation API

### Invoice PDF

Generate server-side PDF for invoices.

**Endpoint:** `POST /pdf-invoice`

**Request Body:**
```json
{
  "orgId": "uuid",
  "invoiceId": "uuid",
  "number": "INV-001",
  "issuedAt": "2024-01-15",
  "dueAt": "2024-02-15",
  "seller": {
    "name": "Your Business Name",
    "address": "123 Main St, City, State 12345",
    "email": "billing@yourbusiness.com",
    "taxId": "12-3456789",
    "logoDataUrl": "data:image/png;base64,..."
  },
  "customer": {
    "name": "Customer Name",
    "email": "customer@example.com",
    "address": "456 Customer St, City, State 67890"
  },
  "items": [
    {
      "description": "Product Description",
      "qty": 1,
      "unitPriceCents": 10000,
      "totalCents": 10000
    }
  ],
  "subtotalCents": 10000,
  "taxCents": 800,
  "totalCents": 10800,
  "notes": "Thank you for your business!"
}
```

**Response:**
```json
{
  "ok": true,
  "url": "https://storage.supabase.co/object/sign/invoices/...",
  "key": "org-id/invoice-uuid.pdf"
}
```

## QuickBooks Integration APIs

### QuickBooks Preview

Preview journal entries before committing to QuickBooks.

**Endpoint:** `GET /qb-preview`

**Query Parameters:**
- `orgId` (string, required) - Organization ID
- `from` (number, required) - Start date in epoch milliseconds
- `to` (number, required) - End date in epoch milliseconds
- `mode` (string, optional) - "summarized" or "per-order" (default: "summarized")

**Response:**
```json
{
  "mode": "summarized",
  "journals": [
    {
      "date": "2024-01-15",
      "marketplace": "ebay",
      "lines": [
        {
          "account": "4000",
          "debit": 0,
          "credit": 8500,
          "memo": "Revenue ebay"
        },
        {
          "account": "5000",
          "debit": 850,
          "credit": 0,
          "memo": "Platform Fees ebay"
        }
      ]
    }
  ],
  "mappings": [
    {
      "accountType": "revenue",
      "externalAccountId": "4000",
      "name": "Sales Revenue"
    }
  ]
}
```

### QuickBooks Commit

Commit journal entries to QuickBooks.

**Endpoint:** `POST /qb-commit`

**Request Body:**
```json
{
  "orgId": "uuid",
  "journals": [
    {
      "date": "2024-01-15",
      "marketplace": "ebay",
      "lines": [
        {
          "account": "4000",
          "debit": 0,
          "credit": 8500,
          "memo": "Revenue ebay"
        }
      ]
    }
  ],
  "accessToken": "qb_access_token",
  "companyId": "qb_company_id"
}
```

**Response:**
```json
{
  "ok": true,
  "exportId": "uuid",
  "results": [
    {
      "journal": { "date": "2024-01-15" },
      "qbId": "qb_journal_id",
      "success": true
    }
  ]
}
```

### QuickBooks Connect

Handle QuickBooks OAuth connection.

**Endpoint:** `POST /qb-connect`

**Request Body:**
```json
{
  "orgId": "uuid",
  "code": "oauth_authorization_code",
  "state": "optional_state"
}
```

**Response:**
```json
{
  "ok": true,
  "companyId": "qb_company_id",
  "companyName": "Your QuickBooks Company"
}
```

### QuickBooks Callback

Handle QuickBooks OAuth callback.

**Endpoint:** `GET /qb-callback`

**Query Parameters:**
- `code` (string, required) - Authorization code
- `state` (string, optional) - State parameter
- `error` (string, optional) - Error parameter

**Response:**
```json
{
  "code": "oauth_authorization_code",
  "state": "optional_state"
}
```

## Xero Integration APIs

### Xero Preview

Preview journal entries before committing to Xero.

**Endpoint:** `GET /xero-preview`

**Query Parameters:**
- `orgId` (string, required) - Organization ID
- `from` (number, required) - Start date in epoch milliseconds
- `to` (number, required) - End date in epoch milliseconds
- `mode` (string, optional) - "summarized" or "per-order" (default: "summarized")

**Response:**
```json
{
  "mode": "summarized",
  "journals": [
    {
      "date": "2024-01-15",
      "marketplace": "ebay",
      "lines": [
        {
          "account": "4000",
          "debit": 0,
          "credit": 8500,
          "memo": "Revenue ebay"
        }
      ]
    }
  ],
  "mappings": [
    {
      "accountType": "revenue",
      "externalAccountId": "4000",
      "name": "Sales Revenue"
    }
  ]
}
```

### Xero Commit

Commit journal entries to Xero.

**Endpoint:** `POST /xero-commit`

**Request Body:**
```json
{
  "orgId": "uuid",
  "journals": [
    {
      "date": "2024-01-15",
      "marketplace": "ebay",
      "lines": [
        {
          "account": "4000",
          "debit": 0,
          "credit": 8500,
          "memo": "Revenue ebay"
        }
      ]
    }
  ],
  "accessToken": "xero_access_token",
  "tenantId": "xero_tenant_id"
}
```

**Response:**
```json
{
  "ok": true,
  "exportId": "uuid",
  "results": [
    {
      "journal": { "date": "2024-01-15" },
      "xeroId": "xero_journal_id",
      "success": true
    }
  ]
}
```

### Xero Connect

Handle Xero OAuth connection.

**Endpoint:** `POST /xero-connect`

**Request Body:**
```json
{
  "orgId": "uuid",
  "code": "oauth_authorization_code",
  "state": "optional_state"
}
```

**Response:**
```json
{
  "ok": true,
  "tenantId": "xero_tenant_id",
  "companyName": "Your Xero Company"
}
```

### Xero Callback

Handle Xero OAuth callback.

**Endpoint:** `GET /xero-callback`

**Query Parameters:**
- `code` (string, required) - Authorization code
- `state` (string, optional) - State parameter
- `error` (string, optional) - Error parameter

**Response:**
```json
{
  "code": "oauth_authorization_code",
  "state": "optional_state"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Optional additional details"
}
```

### Common Error Codes

- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error (server error)

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Reporting APIs**: 100 requests per minute per organization
- **Import APIs**: 10 requests per minute per organization
- **Integration APIs**: 50 requests per minute per organization

## Webhooks

The system supports webhooks for real-time notifications:

### Webhook Events

- `sale.created` - New sale recorded
- `expense.created` - New expense recorded
- `invoice.paid` - Invoice payment received
- `sync.completed` - Data sync completed
- `export.completed` - Data export completed

### Webhook Payload

```json
{
  "event": "sale.created",
  "orgId": "uuid",
  "data": {
    "id": "sale_id",
    "marketplace": "ebay",
    "salePriceCents": 8500
  },
  "timestamp": 1640995200000
}
```

## SDKs and Libraries

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://[project-ref].supabase.co',
  'your-anon-key'
);

// Call Edge Function
const { data, error } = await supabase.functions.invoke('pnl-report', {
  body: { orgId: 'uuid', from: 1000, to: 2000 }
});
```

### React Native

```typescript
import { supabase } from './lib/supabase';

// Call Edge Function
const response = await supabase.functions.invoke('csv-sales-import', {
  body: {
    orgId: 'uuid',
    sourceLabel: 'ebay-export',
    rows: salesData
  }
});
```

## Testing

### Postman Collection

A Postman collection is available for testing all API endpoints:

```json
{
  "info": {
    "name": "OmniLister Accounting API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "P&L Report",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/pnl-report?orgId={{org_id}}&from=1640995200000&to=1643673600000",
          "host": ["{{base_url}}"],
          "path": ["pnl-report"],
          "query": [
            {"key": "orgId", "value": "{{org_id}}"},
            {"key": "from", "value": "1640995200000"},
            {"key": "to", "value": "1643673600000"}
          ]
        }
      }
    }
  ]
}
```

### cURL Examples

```bash
# P&L Report
curl -X GET "https://[project-ref].supabase.co/functions/v1/pnl-report?orgId=uuid&from=1640995200000&to=1643673600000" \
  -H "Authorization: Bearer jwt_token"

# Sales Import
curl -X POST "https://[project-ref].supabase.co/functions/v1/csv-sales-import" \
  -H "Authorization: Bearer jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"orgId":"uuid","sourceLabel":"test","rows":[]}'
```
