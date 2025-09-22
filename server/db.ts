import { config } from 'dotenv';
config(); // Load environment variables from .env file

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use the DATABASE_URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in your .env file");
}

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
