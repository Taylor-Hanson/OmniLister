# CrossList Pro - AI-Powered Multichannel Listing Platform

## Overview

CrossList Pro is a production-ready MVP that enables sellers to compose product listings once and automatically post them to multiple marketplaces. The platform combines AI-powered product recognition, voice-to-listing technology, and automated background posting to streamline the reselling process across platforms like eBay, Poshmark, Mercari, Facebook Marketplace, Etsy, Depop, Grailed, and Vinted.

The application is designed as a comprehensive crosslisting solution that addresses the core pain points of multi-platform sellers: time-consuming manual listing creation, inventory management across platforms, and the complexity of optimizing listings for different marketplace requirements.

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