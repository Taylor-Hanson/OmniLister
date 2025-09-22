#!/usr/bin/env node

/**
 * Database Connection Test
 * This script tests the database connection without starting the full app
 */

import { config } from 'dotenv';
config(); // Load environment variables

console.log('🔍 Testing database connection...\n');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.log('💡 Please set DATABASE_URL in your .env file');
  process.exit(1);
}

if (DATABASE_URL.includes('placeholder')) {
  console.error('❌ DATABASE_URL is still using placeholder values');
  console.log('💡 Please update DATABASE_URL in your .env file with a real connection string');
  console.log('🔗 Get a free database at: https://neon.tech');
  process.exit(1);
}

console.log(`🗄️  Testing connection to: ${DATABASE_URL.replace(/\/\/.*@/, '//***:***@')}`);

try {
  // Test connection using the same method as the app
  const { Pool } = await import('@neondatabase/serverless');
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  // Simple connection test
  const client = await pool.connect();
  const result = await client.query('SELECT NOW() as current_time, version() as version');
  client.release();
  
  console.log('✅ Database connection successful!');
  console.log(`⏰ Server time: ${result.rows[0].current_time}`);
  console.log(`🗄️  Database: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
  
  await pool.end();
  
  console.log('\n🎉 Your database is ready!');
  console.log('📋 Next steps:');
  console.log('1. Run: npm run db:push');
  console.log('2. Run: npm run dev');
  
} catch (error) {
  console.error('\n❌ Database connection failed');
  console.error('Error:', error.message);
  
  if (error.message.includes('password authentication failed')) {
    console.log('\n🔧 Authentication Error:');
    console.log('- Check your username and password in DATABASE_URL');
    console.log('- Verify your database credentials are correct');
  } else if (error.message.includes('connection refused')) {
    console.log('\n🔧 Connection Error:');
    console.log('- Check that your database server is running');
    console.log('- Verify the host and port in DATABASE_URL');
  } else if (error.message.includes('does not exist')) {
    console.log('\n🔧 Database Error:');
    console.log('- The specified database does not exist');
    console.log('- Create the database or check the database name in DATABASE_URL');
  }
  
  console.log('\n📖 For more help, see setup.md');
  process.exit(1);
}