#!/bin/bash
# Quick Start Script for Event Store

echo "🎮 Golem Century - Event Store Quick Start"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✓ Docker is running"

# Check if .env exists, if not copy from .env.example
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "✓ .env created"
fi

# Start MongoDB
echo ""
echo "🚀 Starting MongoDB..."
docker-compose up -d mongodb

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to be ready..."
for i in {1..30}; do
    if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        echo "✓ MongoDB is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ MongoDB failed to start"
        exit 1
    fi
    sleep 1
done

# Build the server
echo ""
echo "🔨 Building server..."
if go build -o ./bin/golem-server ./cmd/server; then
    echo "✓ Server built successfully"
else
    echo "❌ Server build failed"
    exit 1
fi

# Start the server
echo ""
echo "🚀 Starting game server on port 8080..."
echo "   (Press Ctrl+C to stop)"
echo ""

# Export environment variables
export MONGO_URI=mongodb://localhost:27017
export MONGO_DB=golem_game
export SERVER_PORT=8080

./bin/golem-server -port 8080
