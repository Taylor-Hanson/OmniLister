#!/usr/bin/env node

/**
 * Database Initialization Script
 * This script initializes the database with the schema
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🚀 Initializing database schema...\n');

// Check if .env file exists
const envPath = join(process.cwd(), '.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  if (!envContent.includes('DATABASE_URL=')) {
    console.error('❌ DATABASE_URL not found in .env file');
    console.log('💡 Please set up your DATABASE_URL in the .env file');
    console.log('📖 See setup.md for detailed instructions');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ .env file not found');
  console.log('💡 Please create a .env file with your database configuration');
  console.log('📖 See setup.md for detailed instructions');
  process.exit(1);
}

try {
  // Run drizzle push to create/update schema
  console.log('📊 Pushing schema to database...');
  execSync('npm run db:push', { stdio: 'inherit' });
  
  console.log('\n✅ Database initialization complete!');
  console.log('🎉 Your database is ready to use');
  console.log('\n📋 Next steps:');
  console.log('1. Run: npm run dev');
  console.log('2. Open: http://localhost:5000');
  
} catch (error) {
  console.error('\n❌ Database initialization failed');
  console.error('Error:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Check that your DATABASE_URL is correct');
  console.log('2. Ensure your database server is running');
  console.log('3. Verify network connectivity to your database');
  console.log('📖 See setup.md for detailed troubleshooting');
  process.exit(1);
}