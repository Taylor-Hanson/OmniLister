import { config } from 'dotenv';
config(); // Load environment variables from .env file

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import * as schema from '../shared/schema.ts';

async function initializeDatabase() {
  console.log('🗄️  Initializing SQLite database...');
  
  // Create data directory path
  const dbPath = join(process.cwd(), 'data', 'marketplace.db');
  
  // Ensure data directory exists
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    console.log('📁 Created data directory');
  }
  
  // Create SQLite database connection
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  
  const db = drizzle(sqlite, { schema });
  
  console.log('✅ Database initialized successfully');
  console.log(`📍 Database location: ${dbPath}`);
  
  // Close the connection
  sqlite.close();
  
  return true;
}

// Run the initialization
initializeDatabase()
  .then(() => {
    console.log('🎉 Database initialization complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  });
