import { config } from 'dotenv';
config(); // Load environment variables from .env file

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync } from 'fs';
import * as schema from '../shared/schema.js';

async function testDatabase() {
  console.log('🧪 Testing database connection...');
  
  const dbPath = join(process.cwd(), 'data', 'marketplace.db');
  
  if (!existsSync(dbPath)) {
    console.error('❌ Database file not found. Run "npm run db:init" first.');
    process.exit(1);
  }
  
  try {
    // Create SQLite database connection
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    
    const db = drizzle(sqlite, { schema });
    
    // Test a simple query
    const result = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('📊 Found tables:', result.map(r => r.name));
    
    // Close the connection
    sqlite.close();
    
    console.log('✅ Database connection test successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDatabase();
