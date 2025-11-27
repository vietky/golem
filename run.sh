#!/bin/bash

# Quick start script for Century: Golem Edition
# This script runs both backend and frontend

set -e

echo "🚀 Starting Century: Golem Edition..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.21+"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

# Build Go server
echo "🔨 Building Go server..."
go build -o server cmd/server/main.go

# Start Go server in background
echo "🌐 Starting Go server on port 8080..."
./server > /tmp/go-server.log 2>&1 &
GO_PID=$!
echo "✅ Go server started (PID: $GO_PID)"

# Wait a bit for server to start
sleep 2

# Check if server is running
if ! curl -s http://localhost:8080/ > /dev/null; then
    echo "⚠️  Server might not be ready yet, but continuing..."
fi

# Start React frontend
echo "⚛️  Starting React frontend..."
cd web/react-frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🎮 Starting React dev server on port 3000..."
npm run dev &
REACT_PID=$!
echo "✅ React dev server started (PID: $REACT_PID)"

cd ../..

echo ""
echo "✨ All servers are running!"
echo ""
echo "📊 Server Status:"
echo "   ✅ Go backend:    http://localhost:8080 (PID: $GO_PID)"
echo "   ✅ React frontend: http://localhost:3000 (PID: $REACT_PID)"
echo ""
echo "🎮 Open http://localhost:3000 in your browser to play!"
echo ""
echo "📝 Logs:"
echo "   Go server:    tail -f /tmp/go-server.log"
echo "   React server: Check terminal output"
echo ""
echo "🛑 To stop servers:"
echo "   kill $GO_PID $REACT_PID"
echo "   or: pkill -f './server' && pkill -f 'vite'"
echo ""

# Wait for user interrupt
trap "echo ''; echo '🛑 Stopping servers...'; kill $GO_PID $REACT_PID 2>/dev/null; exit" INT TERM

wait

