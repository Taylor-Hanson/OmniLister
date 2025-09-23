import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { expoDrizzleMigrate } from 'drizzle-orm/expo-sqlite/migrator';
import { schema } from './schema';

export const sqlite = SQLite.openDatabaseSync('app.db'); // persistent
export const db = drizzle(sqlite, { schema });

export async function migrate() {
  try {
    await expoDrizzleMigrate(db, { migrationsFolder: 'src/db/migrations' });
    console.log('Database migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
    // For development, we can continue without migration
  }
}
