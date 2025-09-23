# CrossList Pro - AI-Powered Multichannel Listing Platform

## Overview

Crosslist Pro is a production-ready MVP that enables sellers to compose product listings once and automatically post them to multiple marketplaces. The platform combines AI-powered product recognition, voice-to-listing technology, automated background posting, and industry-leading analytics to streamline the reselling process across platforms like eBay, Poshmark, Mercari, Facebook Marketplace, Etsy, Depop, Grailed, and Vinted.

The application is designed as a comprehensive crosslisting solution that addresses the core pain points of multi-platform sellers: time-consuming manual listing creation, inventory management across platforms, the complexity of optimizing listings for different marketplace requirements, and the need for deep business insights to maximize profitability.

**New Automation Suite**: The platform now includes a powerful automation engine that eliminates daily manual tasks across Poshmark, Mercari, Depop, and Grailed marketplaces. Features include auto-share closet, auto-follow/unfollow users, auto-send offers to likers, bundle offers, scheduled sharing cycles, and marketplace-specific automations. The system incorporates safety compliance with rate limiting, circuit breakers, and human-like behavior patterns to avoid detection.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design system
- **State Management**: React Query for server state management and built-in React state for local UI state
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with custom styling for accessibility and consistency
- **File Uploads**: Uppy for handling image uploads with drag-and-drop functionality

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Job Queue**: BullMQ with Redis for background job processing and marketplace posting
- **Authentication**: Simple Bearer token authentication with user sessions
- **WebSocket**: Real-time updates for job status and notifications using native WebSocket
- **File Storage**: Object storage service abstraction for handling product images

### Database Design
- **Users**: Authentication, subscription plans (free/pro/enterprise), and Stripe integration
- **Marketplace Connections**: OAuth tokens and settings for each marketplace
- **Listings**: Product information with AI-generated fields and image storage
- **Listing Posts**: Track posting status across marketplaces with external IDs
- **Jobs**: Background job tracking with progress updates and retry logic
- **Audit Logs**: Activity tracking for user actions and system events
- **Analytics Tables**: Comprehensive tracking including sales metrics, inventory analytics, marketplace performance, predictive forecasts, and competition analysis
- **Automation Tables**: 
  - automationRules: Store automation configurations per marketplace
  - automationSchedules: Manage cron and interval schedules
  - automationLogs: Track execution history and performance
  - poshmarkShareSettings: Poshmark-specific settings (share order, parties, peak hours)
  - offerTemplates: Customizable offer message templates with discount tiers

### AI Integration Architecture
- **Product Analysis**: GPT-5 integration for analyzing product images and generating optimized listings
- **Voice Processing**: Speech-to-text conversion for voice-to-listing functionality
- **Background Removal**: Image processing pipeline for product photo enhancement
- **Price Optimization**: Algorithm-based pricing suggestions using market data

### Job Processing System
- **Queue Management**: BullMQ handles marketplace posting jobs with retry logic
- **Status Tracking**: Real-time job progress updates via WebSocket connections
- **Idempotency**: Prevents duplicate postings using listing+marketplace keys
- **Error Handling**: Comprehensive error tracking with user notifications

### Marketplace Integration Strategy
- **Primary Integration**: eBay official API with OAuth2 authentication
- **API Stubs**: Poshmark and Mercari with placeholder implementations
- **Fallback System**: Playwright automation behind feature flags for platforms without APIs
- **Connection Management**: Token refresh and health checking for all integrations

### Analytics System Architecture
- **Real-time Performance Tracking**: Sales velocity, conversion rates, and revenue metrics
- **Predictive Analytics**: 30-day forecasting using moving averages and trend analysis
- **Competition Analysis**: Market positioning and pricing optimization
- **Smart Insights**: AI-powered pattern recognition and recommendations
- **Comprehensive Profit Calculator**: True profit with all fees and costs included
- **Cross-platform Comparison**: Performance scoring and optimization across marketplaces
- **Inventory Analytics**: Aging reports, turnover rates, and dead stock identification
- **Export Capabilities**: CSV and JSON export for all analytics data

### Automation System Architecture
- **Central Orchestrator**: AutomationService manages all marketplace engines and coordinates automation tasks
- **Marketplace Engines**: Dedicated engines for Poshmark, Mercari, Depop, and Grailed with platform-specific automation logic
- **Safety Mechanisms**: Comprehensive safety service with rate limiting, circuit breakers, daily/hourly limits, and blackout periods
- **Human-like Behavior**: Randomized delays (2-10 seconds), action variations, and natural patterns to avoid detection
- **Scheduler Service**: Cron-based and interval scheduling with automatic activation/deactivation
- **Queue Integration**: Background job processing via BullMQ with automatic retries and error handling
- **Real-time Monitoring**: WebSocket updates for automation status and comprehensive logging system

## Key Features

### Automation Features by Marketplace

#### Poshmark Automation
- **Auto-Share Closet**: Share individual items or entire closet with configurable intervals
- **Party Sharing**: Automatically share to Poshmark parties during peak hours
- **Follow/Unfollow**: Build followers with smart targeting and daily limits
- **Offers to Likers**: Send personalized offers with discount tiers
- **Bundle Offers**: Create bundle deals for multiple items
- **Sharing Cycles**: Continuous or scheduled sharing patterns

#### Mercari Automation
- **Auto-Offers**: Send competitive offers based on market pricing
- **Auto-Relist**: Automatically relist stale items with optimized pricing
- **Smart Promote**: Boost visibility during peak shopping hours

#### Depop Automation
- **Auto-Bump**: Keep listings fresh with regular bumps
- **Auto-Refresh**: Update listings to maintain visibility
- **Price Drops**: Strategic pricing to attract buyers

#### Grailed Automation
- **Auto-Bump**: Maintain listing position in search results
- **Price Optimization**: Dynamic pricing based on market trends
- **Cross-platform Sync**: Coordinate pricing across platforms

### Safety & Compliance Features
- **Rate Limiting**: Per-marketplace API limits with automatic throttling
- **Circuit Breakers**: Automatic pause on repeated failures
- **Human-like Patterns**: Randomized delays and action variations
- **Blackout Periods**: Configurable quiet hours to avoid suspicion
- **Emergency Stop**: One-click shutdown of all automations
- **Compliance Monitoring**: Real-time tracking of limit compliance

## External Dependencies

### Core Services
- **PostgreSQL**: Primary database for application data storage
- **Redis**: Job queue backend and session storage
- **Stripe**: Subscription billing and payment processing
- **OpenAI GPT-5**: AI-powered product analysis and listing optimization

### Marketplace APIs
- **eBay API**: Official integration for listing creation and management
- **Poshmark API**: Stubbed implementation ready for official API
- **Mercari API**: Stubbed implementation with automation fallback
- **Facebook Marketplace**: Browser automation integration
- **Etsy API**: Marketplace connection for handmade/vintage items
- **Depop API**: Social marketplace for fashion items
- **Grailed API**: Menswear marketplace integration
- **Vinted API**: Second-hand fashion marketplace

### Third-Party Libraries
- **Uppy**: File upload and image management
- **Playwright**: Browser automation for marketplaces without APIs
- **React Query**: Server state synchronization
- **shadcn/ui**: Component library built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework
- **Wouter**: Lightweight React router
- **Drizzle ORM**: Type-safe database queries
- **BullMQ**: Job queue processing

### Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundling for production
- **Replit**: Development environment and deployment platform