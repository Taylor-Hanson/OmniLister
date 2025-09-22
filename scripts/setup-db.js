#!/usr/bin/env node

/**
 * Database Setup Script
 * This script sets up a local development database
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DB_NAME = 'marketplace_automation_dev';
const DB_USER = 'dev_user';
const DB_PASSWORD = 'dev_password';

console.log('🚀 Setting up development database...\n');

// Create data directory if it doesn't exist
const dataDir = join(process.cwd(), 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory');
}

// Function to check if PostgreSQL is available
function isPostgresAvailable() {
  try {
    execSync('which psql', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Function to check if Docker is available
function isDockerAvailable() {
  try {
    execSync('which docker', { stdio: 'ignore' });
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Setup PostgreSQL with Docker
function setupPostgresWithDocker() {
  console.log('🐳 Setting up PostgreSQL with Docker...');
  
  try {
    // Stop and remove existing container if it exists
    try {
      execSync('docker stop marketplace-postgres', { stdio: 'ignore' });
      execSync('docker rm marketplace-postgres', { stdio: 'ignore' });
    } catch {
      // Container doesn't exist, that's fine
    }

    // Start PostgreSQL container
    const dockerCmd = `docker run --name marketplace-postgres \\
      -e POSTGRES_DB=${DB_NAME} \\
      -e POSTGRES_USER=${DB_USER} \\
      -e POSTGRES_PASSWORD=${DB_PASSWORD} \\
      -p 5432:5432 \\
      -v $(pwd)/data/postgres:/var/lib/postgresql/data \\
      -d postgres:15`;

    execSync(dockerCmd);
    console.log('✅ PostgreSQL container started');

    // Wait for PostgreSQL to be ready
    console.log('⏳ Waiting for PostgreSQL to be ready...');
    let attempts = 0;
    while (attempts < 30) {
      try {
        execSync(`docker exec marketplace-postgres pg_isready -U ${DB_USER}`, { stdio: 'ignore' });
        break;
      } catch {
        attempts++;
        execSync('sleep 1');
      }
    }

    if (attempts >= 30) {
      throw new Error('PostgreSQL failed to start within 30 seconds');
    }

    console.log('✅ PostgreSQL is ready');
    return `postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}`;

  } catch (error) {
    console.error('❌ Failed to setup PostgreSQL with Docker:', error.message);
    return null;
  }
}

// Setup local PostgreSQL
function setupLocalPostgres() {
  console.log('🗄️  Setting up local PostgreSQL...');
  
  try {
    // Create database and user
    execSync(`createdb ${DB_NAME}`, { stdio: 'ignore' });
    console.log('✅ Database created');
    return `postgresql://localhost:5432/${DB_NAME}`;
  } catch (error) {
    console.error('❌ Failed to setup local PostgreSQL:', error.message);
    console.log('💡 Try running: brew install postgresql (on macOS) or apt-get install postgresql (on Ubuntu)');
    return null;
  }
}

// Setup SQLite as fallback
function setupSQLite() {
  console.log('📁 Setting up SQLite as fallback...');
  
  const sqlitePath = join(dataDir, 'marketplace.db');
  console.log(`✅ SQLite database will be created at: ${sqlitePath}`);
  return `file:${sqlitePath}`;
}

// Main setup logic
async function main() {
  let databaseUrl = null;

  // Try Docker PostgreSQL first
  if (isDockerAvailable()) {
    databaseUrl = setupPostgresWithDocker();
  }
  
  // Try local PostgreSQL if Docker failed
  if (!databaseUrl && isPostgresAvailable()) {
    databaseUrl = setupLocalPostgres();
  }
  
  // Fall back to SQLite
  if (!databaseUrl) {
    console.log('⚠️  PostgreSQL not available, using SQLite for development');
    databaseUrl = setupSQLite();
  }

  // Update .env file
  console.log('📝 Updating .env file...');
  const fs = await import('fs/promises');
  const envPath = join(process.cwd(), '.env');
  
  try {
    let envContent = await fs.readFile(envPath, 'utf-8');
    envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL=${databaseUrl}`);
    await fs.writeFile(envPath, envContent);
    console.log('✅ Updated .env file');
  } catch (error) {
    console.error('❌ Failed to update .env file:', error.message);
  }

  console.log('\n🎉 Database setup complete!');
  console.log(`📊 Database URL: ${databaseUrl}`);
  console.log('\n📋 Next steps:');
  console.log('1. Run: npm run db:push');
  console.log('2. Run: npm run dev');
}

main().catch(console.error);