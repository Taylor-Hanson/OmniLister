<<<<<<< Current (Your changes)
# CrossList Pro - AI-Powered Multichannel Listing Platform

CrossList Pro is a production-ready MVP that allows sellers to compose product listings once and post them to multiple marketplaces automatically. The platform features AI-powered product recognition, voice-to-listing technology, and comprehensive marketplace management.

## Features

### Core Functionality
- **AI Product Recognition**: Instantly identify brand, condition, size, material, and optimal pricing from photos
- **Voice-to-Listing Technology**: Convert speech to structured product listings
- **Background Auto-Posting**: Cloud-based posting without browser dependency
- **Bulk Management**: Handle hundreds of listings with spreadsheet-style interface
- **Real-time Analytics**: Performance tracking across all marketplaces
- **Inventory Sync**: Automatic delisting when items sell on any platform

### Supported Marketplaces
- eBay (API integration)
- Poshmark (API stub with automation fallback)
- Mercari (API stub with automation fallback)
- Facebook Marketplace
- Etsy
- Depop
- Grailed
- Vinted

### AI Features
- GPT-5 powered listing optimization
- Computer vision for product analysis
- Background removal for images
- Price optimization algorithms
- SEO keyword generation

### Pricing Plans
- **Free**: 100 monthly listings, basic AI features
- **Pro ($19.99/month)**: Unlimited listings, advanced AI, priority support
- **Enterprise ($39.99/month)**: Custom integrations, API access, dedicated support

## Technology Stack

### Frontend
- **Next.js 14+** with App Router and React Server Components
- **TypeScript** with strict type checking
- **Tailwind CSS** with shadcn/ui components
- **React Query** for server state management
- **Zustand** for client-side state
- **Progressive Web App** capabilities

### Backend
- **Node.js** with Express.js
- **BullMQ** job queue with Redis
- **Prisma ORM** with PostgreSQL
- **WebSocket** for real-time updates
- **Stripe** for subscription billing

### AI & ML
- **OpenAI GPT-5** for listing generation
- **Computer Vision** for product recognition
- **Speech-to-Text** for voice functionality
- **Custom ML models** for pricing optimization

### Infrastructure
- **Supabase** for database and storage
- **Redis** for caching and job queues
- **Object Storage** for image management
- **WebSocket** for real-time features

## Required Environment Variables

Set the following variables in your environment or Replit Secrets:

### Required APIs
=======
# Marketplace Automation Platform

A comprehensive automation platform for managing listings across multiple marketplaces like eBay, Poshmark, Mercari, and more.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- A PostgreSQL database (we recommend [Neon](https://neon.tech) for free hosting)

### Setup Steps

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd marketplace-automation
   npm install
   ```

2. **Database Setup**
   
   **Option A: Use Neon (Recommended - Free)**
   - Go to [https://neon.tech](https://neon.tech)
   - Create a free account and new project
   - Copy your connection string
   - Edit `.env` file and replace the DATABASE_URL:
   ```bash
   DATABASE_URL=postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

   **Option B: Local PostgreSQL with Docker**
   ```bash
   docker run --name marketplace-postgres \
     -e POSTGRES_DB=marketplace_dev \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=password \
     -p 5432:5432 \
     -d postgres:15
   ```
   Then update `.env`:
   ```bash
   DATABASE_URL=postgresql://postgres:password@localhost:5432/marketplace_dev
   ```

3. **Initialize Database**
   ```bash
   npm run db:push
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Open Application**
   Visit [http://localhost:5000](http://localhost:5000)

### One-Command Setup
```bash
./start.sh
```

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Update database schema
- `npm run db:init` - Initialize database with schema
- `npm run setup` - Full setup (init db + start dev server)

### Environment Variables

Copy `.env.example` to `.env` and configure:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `SESSION_SECRET` - Session signing secret

**Optional (for full features):**
- `OPENAI_API_KEY` - AI-powered features
- `STRIPE_SECRET_KEY` - Payment processing
- Marketplace API keys (eBay, Poshmark, etc.)

## 🏗️ Architecture

### Tech Stack
- **Backend:** Node.js, Express, TypeScript
- **Frontend:** React, TypeScript, Tailwind CSS
- **Database:** PostgreSQL with Drizzle ORM
- **Real-time:** WebSockets
- **Build:** Vite, ESBuild

### Key Features
- **Multi-marketplace Integration:** eBay, Poshmark, Mercari, Depop, Grailed
- **Automated Listing Management:** Cross-post, sync, and update listings
- **Smart Scheduling:** AI-powered optimal posting times
- **Real-time Monitoring:** Live sync status and notifications
- **Bulk Operations:** Batch upload and management
- **Analytics Dashboard:** Performance insights and optimization
- **Webhook Support:** Real-time marketplace event handling

## 📊 Database Schema

The application uses the following main tables:
- `users` - User accounts and settings
- `listings` - Product listings and metadata
- `marketplace_connections` - API integrations
- `automation_rules` - User-defined automation logic
- `sync_jobs` - Cross-platform sync operations
- `webhooks` - Event handling configuration

## 🔧 Troubleshooting

### Database Issues
1. **Connection failed:** Verify DATABASE_URL is correct and database is accessible
2. **Schema errors:** Run `npm run db:push` to update schema
3. **Permission denied:** Check database user permissions

### Application Issues
1. **Port in use:** Change PORT in `.env` or kill process on port 5000
2. **Build errors:** Run `npm run check` to see TypeScript errors
3. **Missing dependencies:** Run `npm install`

### Common Solutions
```bash
# Reset database schema
npm run db:push

# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run check
```

## 🚢 Deployment

### Production Setup
1. Set up production database (Neon, AWS RDS, etc.)
2. Configure production environment variables
3. Set `NODE_ENV=production`
4. Build and deploy:
   ```bash
   npm run build
   npm start
   ```

### Environment Configuration
- Use strong, unique secrets for JWT_SECRET and SESSION_SECRET
- Enable SSL/TLS for database connections
- Configure CORS for your domain
- Set up proper logging and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking: `npm run check`
5. Submit a pull request

### 🔄 Automated PR Testing

This repository includes automated testing with Neon database branches:

- **🗄️ Database Branches**: Each PR gets its own isolated database
- **🧪 Schema Testing**: Migrations are automatically tested
- **🔍 Type Checking**: TypeScript errors are checked on every commit
- **🧹 Auto Cleanup**: Database branches are automatically deleted when PRs close

See [`.github/NEON_SETUP.md`](.github/NEON_SETUP.md) for setup instructions.

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

- Check the [setup guide](setup.md) for detailed configuration
- Review [troubleshooting](setup.md#troubleshooting) for common issues
- Open an issue for bugs or feature requests

## 🎯 Roadmap

- [ ] Additional marketplace integrations
- [ ] Advanced AI-powered pricing optimization
- [ ] Mobile app companion
- [ ] Advanced analytics and reporting
- [ ] Multi-user team support
- [ ] API rate limiting optimization
- [ ] Enhanced webhook event processing
>>>>>>> Incoming (Background Agent changes)
