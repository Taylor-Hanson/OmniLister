# Database & Environment Setup Guide

This guide will help you set up the database and environment configuration for the Marketplace Automation application.

## Quick Setup (Recommended)

### Option 1: Use Neon Database (Free & Easy)

1. **Get a free database from Neon:**
   - Go to [https://neon.tech](https://neon.tech)
   - Sign up for a free account
   - Create a new project
   - Copy your connection string

2. **Update your environment:**
   ```bash
   # Edit the .env file and replace the DATABASE_URL with your Neon connection string
   DATABASE_URL=postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

3. **Initialize the database:**
   ```bash
   npm run db:push
   ```

4. **Start the application:**
   ```bash
   npm run dev
   ```

### Option 2: Local PostgreSQL Setup

If you prefer to run PostgreSQL locally:

#### Using Docker (Recommended)
```bash
# Start PostgreSQL container
docker run --name marketplace-postgres \
  -e POSTGRES_DB=marketplace_dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15

# Update .env file
DATABASE_URL=postgresql://postgres:password@localhost:5432/marketplace_dev
```

#### Using Local Installation
```bash
# macOS (with Homebrew)
brew install postgresql
brew services start postgresql
createdb marketplace_dev

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb marketplace_dev

# Update .env file
DATABASE_URL=postgresql://postgres:password@localhost:5432/marketplace_dev
```

## Environment Variables

The application requires several environment variables. Most have sensible defaults for development:

### Required Variables
- `DATABASE_URL` - Your database connection string
- `JWT_SECRET` - Secret for JWT tokens (auto-generated for dev)
- `SESSION_SECRET` - Secret for sessions (auto-generated for dev)

### Optional Variables (for full functionality)
- `OPENAI_API_KEY` - For AI-powered features
- `STRIPE_SECRET_KEY` - For payment processing
- Marketplace API keys (eBay, Poshmark, etc.) - For integrations

## Database Schema

The application uses Drizzle ORM with the following main tables:
- `users` - User accounts and profiles
- `listings` - Product listings
- `marketplace_connections` - API connections to marketplaces
- `automation_rules` - User-defined automation rules
- `sync_jobs` - Cross-platform sync operations
- `webhooks` - Webhook configurations and events

## Troubleshooting

### Database Connection Issues

1. **"DATABASE_URL must be set" error:**
   - Make sure your `.env` file exists and has a valid `DATABASE_URL`
   - Check that the database server is running

2. **Connection refused errors:**
   - Verify your database server is running
   - Check the host, port, username, and password in your DATABASE_URL
   - For Neon: ensure your connection string includes `?sslmode=require`

3. **Schema/table not found errors:**
   - Run `npm run db:push` to create/update the database schema

### Application Startup Issues

1. **Port already in use:**
   - Change the `PORT` in your `.env` file
   - Or kill the process using the port: `lsof -ti:5000 | xargs kill -9`

2. **Missing dependencies:**
   - Run `npm install` to ensure all dependencies are installed

## Development Commands

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run check
```

## Production Deployment

For production deployment:

1. Set up a production database (Neon, AWS RDS, etc.)
2. Update environment variables with production values
3. Set `NODE_ENV=production`
4. Use strong, unique secrets for JWT_SECRET and SESSION_SECRET
5. Configure proper CORS settings
6. Set up SSL/TLS certificates

## Security Notes

- The default development secrets are NOT secure for production
- Always use environment variables for sensitive configuration
- Keep your `.env` file out of version control (it's in .gitignore)
- Regularly rotate API keys and database passwords
