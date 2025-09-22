import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use a default PostgreSQL URL for development if not set
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/marketplace_dev';

console.log(`🗄️  Connecting to database: ${DATABASE_URL.replace(/\/\/.*@/, '//***:***@')}`);

let pool, db;

try {
  pool = new Pool({ connectionString: DATABASE_URL });
  db = drizzle({ client: pool, schema });
  console.log("✅ Database connection established");
} catch (error) {
  console.error("❌ Database connection failed:", error);
  throw error;
}

export { pool, db };
