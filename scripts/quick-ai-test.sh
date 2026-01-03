#!/bin/bash

echo "=============================="
echo "Simple AI Test"
echo "=============================="

# Create session
echo "1. Creating single player session..."
RESPONSE=$(curl -s -X POST http://localhost:8080/api/single \
  -H "Content-Type: application/json" \
  -d '{"numAI": 3, "turnTimeout": 2}')

echo "Response: $RESPONSE"

SESSION_ID=$(echo $RESPONSE | grep -o '"sessionID":"[^"]*"' | cut -d'"' -f4)
echo "Session ID: $SESSION_ID"

# Let's use wscat or a simple script
echo ""
echo "2. Now connect via WebSocket at:"
echo "   ws://localhost:8080/ws?session=$SESSION_ID&name=TestPlayer&avatar=1"
echo ""
echo "You should see AI players taking turns automatically!"
