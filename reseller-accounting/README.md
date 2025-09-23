# OmniLister Reseller Accounting Module

A production-ready React Native (Expo) app for reseller accounting with offline-first architecture, comprehensive financial tracking, and enterprise integrations.

## Features

### Core Accounting
- **Inventory & COGS Management** - Track purchase prices, extra costs, and lock COGS at sale time
- **Sales Tracking** - Unified model for all marketplaces with fees, shipping, taxes, and payouts
- **Expense Management** - Categorized expenses with receipt attachment and mileage tracking
- **Tax Compliance** - Track collected tax, marketplace remittance, and seller-owed amounts
- **P&L Reports** - Period-based profit & loss with detailed breakdowns
- **Invoicing** - On-device invoice builder with PDF generation and payment tracking

### Advanced Features
- **Offline-First** - Local SQLite database with background sync
- **CSV Import/Export** - Robust data import with validation and idempotency
- **QuickBooks Integration** - OAuth connection with journal entry export
- **Xero Integration** - OAuth connection with journal entry export
- **PDF Generation** - Client-side and server-side PDF creation
- **Push Notifications** - Critical job outcomes and sync status
- **Multi-User Support** - Role-based access control with audit logging

### Technical Architecture
- **React Native (Expo SDK 52)** - Cross-platform mobile development
- **TypeScript** - Type-safe development
- **Zustand** - State management
- **TanStack Query** - Server state management
- **Drizzle ORM** - Local SQLite database
- **Supabase** - Backend services (Postgres, Auth, Storage, Edge Functions)
- **Victory Native** - Charts and data visualization
- **Expo Print** - PDF generation
- **PapaParse** - CSV parsing

## Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI
- Supabase account
- iOS Simulator or Android Emulator

### Installation

1. **Clone and install dependencies:**
```bash
cd reseller-accounting
npm install
```

2. **Set up environment variables:**
```bash
cp env.example .env
# Edit .env with your Supabase credentials
```

3. **Set up Supabase:**
```bash
# Install Supabase CLI
npm install -g supabase

# Login and link to your project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy database schema
supabase db push

# Deploy Edge Functions
supabase functions deploy
```

4. **Start the development server:**
```bash
npm start
```

5. **Run on device/simulator:**
```bash
# iOS
npm run ios

# Android
npm run android
```

## Project Structure

```
reseller-accounting/
├── app/                    # Expo Router app structure
│   ├── (tabs)/            # Tab navigation screens
│   ├── auth/              # Authentication screens
│   └── _layout.tsx        # Root layout
├── src/
│   ├── db/                # Database schema and client
│   ├── lib/               # Core utilities (CSV, PDF, Supabase)
│   ├── state/             # Zustand stores
│   ├── utils/             # Helper functions (money, COGS, validation)
│   └── types/             # TypeScript type definitions
├── supabase/
│   ├── functions/         # Edge Functions
│   └── migrations/        # Database migrations
└── package.json
```

## Key Components

### Database Schema
- **Items** - Inventory with COGS tracking
- **Sales** - Marketplace transactions with locked COGS
- **Expenses** - Categorized business expenses
- **Invoices** - Customer invoicing system
- **Account Mappings** - GL account configuration
- **Integration Tokens** - OAuth token storage
- **Audit Logs** - Financial mutation tracking

### Edge Functions
- **pnl-report** - P&L calculations with trends
- **tax-summary** - Sales tax by jurisdiction
- **csv-import** - Data import with validation
- **pdf-invoice** - Server-side PDF generation
- **qb-* / xero-*** - Accounting software integration

### Mobile Screens
- **Dashboard** - KPIs and trend charts
- **Inventory** - Item management with COGS
- **Sales** - Transaction tracking and import
- **Expenses** - Expense management with receipts
- **Reports** - P&L, tax, and export options
- **Invoices** - Customer invoicing system
- **Settings** - Integrations and data management

## Data Flow

1. **Local-First** - All data stored locally in SQLite
2. **Background Sync** - Periodic sync with Supabase
3. **Conflict Resolution** - Server-wins for financial records
4. **Audit Trail** - All mutations logged for compliance
5. **Export Options** - CSV, PDF, and accounting software

## Security & Compliance

- **Row Level Security** - Multi-tenant data isolation
- **JWT Authentication** - Secure API access
- **Audit Logging** - Financial mutation tracking
- **Input Validation** - Zod schemas for data integrity
- **Secure Storage** - Encrypted local storage
- **Server-Side Secrets** - API keys never exposed to client

## Testing

```bash
# Run unit tests
npm test

# Run component tests
npm run test:components

# Run E2E tests (requires device)
npm run test:e2e
```

## Deployment

### Mobile App
```bash
# Build for production
eas build --platform all

# Submit to app stores
eas submit --platform all
```

### Backend
```bash
# Deploy Edge Functions
supabase functions deploy

# Deploy database changes
supabase db push
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the Edge Functions README

## Roadmap

- [ ] Advanced inventory valuation (FIFO, Average Cost)
- [ ] Multi-currency support
- [ ] Advanced tax calculations
- [ ] Bank/PayPal live sync
- [ ] OCR receipt processing
- [ ] Advanced analytics and forecasting
- [ ] White-label platform options
