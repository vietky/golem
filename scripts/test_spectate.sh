#!/bin/bash

# Test script to verify spectate mode functionality

echo "Testing Spectate Mode Implementation"
echo "====================================="

# Test 1: Create a game session
echo ""
echo "Test 1: Creating a game session..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:8080/api/create \
  -H "Content-Type: application/json" \
  -d '{"numPlayers":2,"seed":12345}')

SESSION_ID=$(echo $CREATE_RESPONSE | grep -o '"sessionID":"[^"]*' | cut -d'"' -f4)
echo "Created session: $SESSION_ID"

# Test 2: List sessions and check for spectator support
echo ""
echo "Test 2: Listing sessions to verify spectator count..."
LIST_RESPONSE=$(curl -s http://localhost:8080/api/list)
echo "Response: $LIST_RESPONSE"

# Check if spectatorCount field exists
if echo "$LIST_RESPONSE" | grep -q "spectatorCount"; then
    echo "✓ Spectator count field is present in API response"
else
    echo "✗ Spectator count field is missing"
fi

echo ""
echo "====================================="
echo "Backend API tests completed!"
echo ""
echo "Manual testing steps:"
echo "1. Open http://localhost:3000 in two browser windows"
echo "2. In window 1: Create a new game room"
echo "3. In window 2: Join the room as a player (blue Join button)"
echo "4. Open a third browser window"
echo "5. In window 3: Click the spectate button (👁️) to watch"
echo "6. Verify that:"
echo "   - Spectator can see the game state"
echo "   - Spectator count shows in room list"
echo "   - When players join, all users see 'Player X joined' notification"
echo "   - Spectators cannot perform actions"
echo "   - Game state updates are broadcast to all users"
