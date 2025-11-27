#!/bin/bash

# Quick redeploy script for Century: Golem Edition
# Usage: ./redeploy.sh

set -e

echo "🚀 Redeploying Century: Golem Edition..."

# Stop old container
echo "📦 Stopping old container..."
docker-compose down || true

# Remove old images (optional, uncomment if you want fresh build)
# echo "🗑️  Removing old images..."
# docker-compose rm -f || true

# Build and start new container
echo "🔨 Building and starting new container..."
docker-compose up -d --build

# Wait a bit for container to start
echo "⏳ Waiting for container to start..."
sleep 5

# Check status
echo "📊 Container status:"
docker-compose ps

# Show logs
echo "📝 Recent logs:"
docker-compose logs --tail=20

echo ""
echo "✅ Deployment complete!"
echo "🌐 Server should be running on port 8081 (or check docker-compose.yml)"
echo ""
echo "Useful commands:"
echo "  View logs:    docker-compose logs -f"
echo "  Stop:         docker-compose down"
echo "  Restart:      docker-compose restart"
echo "  Status:       docker-compose ps"

