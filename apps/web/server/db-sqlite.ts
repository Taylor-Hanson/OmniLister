import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "../shared/schema.ts";
import { join } from 'path';

// Create data directory path
const dbPath = join(process.cwd(), 'data', 'marketplace.db');

// Ensure data directory exists
import { mkdirSync, existsSync } from 'fs';
const dataDir = join(process.cwd(), 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Create SQLite database connection
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
export { sqlite as pool };
