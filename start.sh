#!/bin/bash

echo "🚀 Starting Marketplace Automation Platform..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and set your DATABASE_URL"
    echo "🔗 Get a free database at: https://neon.tech"
    echo "📖 See setup.md for detailed instructions"
    echo ""
    exit 1
fi

# Check if DATABASE_URL is set
if ! grep -q "DATABASE_URL=postgresql://" .env; then
    echo "⚠️  DATABASE_URL not properly configured"
    echo "🔗 Get a free database at: https://neon.tech"
    echo "📝 Update your .env file with the connection string"
    echo "📖 See setup.md for detailed instructions"
    echo ""
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Initialize database
echo "🗄️  Initializing database..."
npm run db:push

if [ $? -eq 0 ]; then
    echo "✅ Database initialized successfully"
    echo ""
    echo "🎉 Starting development server..."
    npm run dev
else
    echo "❌ Database initialization failed"
    echo "📖 See setup.md for troubleshooting"
    exit 1
fi