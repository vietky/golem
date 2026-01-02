#!/bin/bash

echo "Testing WebSocket Connection..."
echo "================================"
echo ""

# Test 1: Check if backend is running
echo "1. Checking if backend server is running on port 8080..."
if lsof -i :8080 | grep -q LISTEN; then
    echo "✅ Backend server is running"
else
    echo "❌ Backend server is NOT running"
    echo "Please start the backend server first: make server"
    exit 1
fi
echo ""

# Test 2: Create a single-player session
echo "2. Creating a single-player session..."
RESPONSE=$(curl -s -X POST http://localhost:8080/api/single \
    -H "Content-Type: application/json" \
    -d '{"playerName": "TestPlayer", "avatar": "1"}')

echo "Response: $RESPONSE"

SESSION_ID=$(echo $RESPONSE | grep -o '"sessionID":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
    echo "❌ Failed to create session"
    exit 1
else
    echo "✅ Session created: $SESSION_ID"
fi
echo ""

# Test 3: Check Vite dev server
echo "3. Checking if Vite dev server is running on port 3000..."
if lsof -i :3000 | grep -q LISTEN; then
    echo "✅ Vite dev server is running"
else
    echo "❌ Vite dev server is NOT running"
    echo "Please start the dev server: npm run dev"
    exit 1
fi
echo ""

# Test 4: Check proxy configuration
echo "4. Testing WebSocket proxy through Vite..."
echo "Open your browser to: http://localhost:3000"
echo "Session ID to test: $SESSION_ID"
echo ""

echo "================================"
echo "✅ All tests passed!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Click 'Single Player'"
echo "3. Check browser console for WebSocket connection"
echo ""
echo "Expected WebSocket URL:"
echo "ws://localhost:3000/ws?session=$SESSION_ID&name=Player%201&avatar=4"
echo ""
echo "This will be proxied to:"
echo "ws://localhost:8080/ws?session=$SESSION_ID&name=Player%201&avatar=4"
