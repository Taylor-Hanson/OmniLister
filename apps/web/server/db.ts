import { config } from 'dotenv';
config(); // Load environment variables from .env file

import * as schema from "../shared/schema.ts";

// Check if we should use SQLite for development
const USE_SQLITE = process.env.USE_SQLITE === 'true' || !process.env.DATABASE_URL;

let pool: any;
let db: any;

async function initializeDatabase() {
  if (USE_SQLITE) {
    // Use SQLite for development
    console.log("🗄️  Using SQLite database for development");
    
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    const Database = (await import('better-sqlite3')).default;
    const { join } = await import('path');
    const { mkdirSync, existsSync } = await import('fs');
    
    // Create data directory path
    const dbPath = join(process.cwd(), 'data', 'marketplace.db');
    
    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    
    // Create SQLite database connection
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    
    db = drizzle(sqlite, { schema });
    pool = sqlite;
    
    console.log("✅ SQLite database connection established");
  } else {
    // Use Neon for production
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const ws = await import("ws");
    
    neonConfig.webSocketConstructor = ws.default;
    
    const DATABASE_URL = process.env.DATABASE_URL;
    
    console.log(`🗄️  Connecting to Neon database: ${DATABASE_URL?.replace(/\/\/.*@/, '//***:***@')}`);
    
    try {
      pool = new Pool({ connectionString: DATABASE_URL });
      db = drizzle({ client: pool, schema });
      console.log("✅ Neon database connection established");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      throw error;
    }
  }
}

// Initialize database immediately
(async () => {
  await initializeDatabase();
})();

export { pool, db };
