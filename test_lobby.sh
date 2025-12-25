#!/bin/bash

# Test script for the enhanced lobby features

echo "🧪 Testing Enhanced Lobby Features"
echo "===================================="
echo ""

API_BASE="${API_BASE:-http://localhost:8080}"

echo "1. Testing game creation with AI players..."
RESPONSE=$(curl -s -X POST "$API_BASE/api/create" \
  -H "Content-Type: application/json" \
  -d '{
    "numPlayers": 3,
    "gameName": "Test Game with AI",
    "turnTimeout": 60,
    "aiPlayers": ["", "basic", "rest"],
    "hostName": "Test Host"
  }')

echo "Response: $RESPONSE"
SESSION_ID=$(echo $RESPONSE | grep -o '"sessionID":"[^"]*"' | cut -d'"' -f4)
echo "Created session: $SESSION_ID"
echo ""

echo "2. Testing game list endpoint..."
SESSIONS=$(curl -s "$API_BASE/api/list")
echo "Sessions response: $SESSIONS"
echo ""

echo "3. Testing search filter..."
FILTERED=$(curl -s "$API_BASE/api/list?search=Test")
echo "Filtered sessions: $FILTERED"
echo ""

echo "4. Testing status filter..."
WAITING=$(curl -s "$API_BASE/api/list?status=waiting")
echo "Waiting games: $WAITING"
echo ""

echo "5. Creating another game for testing..."
RESPONSE2=$(curl -s -X POST "$API_BASE/api/create" \
  -H "Content-Type: application/json" \
  -d '{
    "numPlayers": 2,
    "gameName": "Quick Match",
    "turnTimeout": 30,
    "hostName": "Quick Player"
  }')

echo "Response: $RESPONSE2"
echo ""

echo "6. Listing all games again..."
ALL_SESSIONS=$(curl -s "$API_BASE/api/list")
echo "All sessions: $ALL_SESSIONS"
echo ""

echo "✅ Test complete!"
echo ""
echo "Next steps:"
echo "1. Start the backend server: make run"
echo "2. Start the frontend: cd web/react-frontend && npm run dev"
echo "3. Open browser and test the lobby UI"
