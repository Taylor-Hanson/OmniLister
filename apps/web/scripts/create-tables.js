import { config } from 'dotenv';
config(); // Load environment variables from .env file

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync } from 'fs';

async function createTables() {
  console.log('🗄️  Creating database tables...');
  
  const dbPath = join(process.cwd(), 'data', 'marketplace.db');
  
  if (!existsSync(dbPath)) {
    console.error('❌ Database file not found. Run "npm run db:init" first.');
    process.exit(1);
  }
  
  try {
    // Create SQLite database connection
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    
    // Create users table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        plan TEXT DEFAULT 'free',
        subscriptionStatus TEXT,
        listingCredits INTEGER DEFAULT 0,
        listingsUsedThisMonth INTEGER DEFAULT 0,
        billingCycleStart TEXT,
        onboardingCompleted BOOLEAN DEFAULT FALSE,
        optimizationSettings TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);
    
    // Create listings table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS listings (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        subtitle TEXT,
        price REAL NOT NULL,
        quantity INTEGER DEFAULT 1,
        images TEXT,
        condition TEXT,
        conditionDescription TEXT,
        conditionId INTEGER,
        category TEXT,
        brand TEXT,
        size TEXT,
        color TEXT,
        material TEXT,
        listingFormat TEXT DEFAULT 'FIXED_PRICE',
        listingDuration INTEGER DEFAULT 7,
        status TEXT DEFAULT 'draft',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (id)
      )
    `);
    
    // Create marketplace_connections table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS marketplace_connections (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        marketplace TEXT NOT NULL,
        credentials TEXT NOT NULL,
        isActive BOOLEAN DEFAULT TRUE,
        lastSyncAt TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (id)
      )
    `);
    
    console.log('✅ Database tables created successfully!');
    
    // Close the connection
    sqlite.close();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create tables:', error);
    process.exit(1);
  }
}

// Run the table creation
createTables();
