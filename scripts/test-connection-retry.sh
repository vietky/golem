#!/bin/bash

# Test script for connection retry logic
# This script tests:
# 1. Connection timeout (5 seconds)
# 2. Retry button appears after timeout
# 3. Error messages are displayed
# 4. Manual retry works

set -e

API_HOST="http://localhost:8080"
WS_HOST="ws://localhost:8080"

echo "🔧 Connection Retry Test Suite"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Verify server is running
echo "📝 Test 1: Checking if server is running..."
if curl -s "$API_HOST/api/list" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Server is running${NC}"
else
  echo -e "${RED}✗ Server is not running${NC}"
  echo "Please start the server with: make run-dev"
  exit 1
fi
echo ""

# Test 2: Create a test session
echo "📝 Test 2: Creating test session..."
SESSION_RESPONSE=$(curl -s -X POST "$API_HOST/api/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "numPlayers": 2,
    "creatorName": "TestPlayer"
  }')

SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.sessionID')
echo "Session ID: $SESSION_ID"

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
  echo -e "${RED}✗ Failed to create session${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Session created successfully${NC}"
echo ""

# Test 3: Instructions for manual testing
echo "📝 Manual Testing Instructions:"
echo "================================"
echo ""
echo "1. Open browser to: http://localhost:8080"
echo "2. Select 'Multiplayer' mode"
echo "3. Enter session ID: $SESSION_ID"
echo "4. Click 'Join as Player'"
echo ""
echo "Test Scenarios to Verify:"
echo "-------------------------"
echo ""
echo "✅ Scenario 1: Normal Connection"
echo "   - Should connect within 5 seconds"
echo "   - Should show 'Connected to game server' toast"
echo "   - Should enter waiting room"
echo ""
echo "✅ Scenario 2: Server Down (Connection Timeout)"
echo "   - Stop the server (Ctrl+C in server terminal)"
echo "   - Try to connect with session ID: $SESSION_ID"
echo "   - Should show spinner for ~5 seconds"
echo "   - Should show 'Connection Failed' with error icon"
echo "   - Should display 'Connection timeout' message"
echo "   - Should show 'Retry Connection' button"
echo "   - Click retry button"
echo "   - Restart server, retry should succeed"
echo ""
echo "✅ Scenario 3: Mid-Game Disconnection"
echo "   - Start a game with 2 players"
echo "   - Stop the server while playing"
echo "   - Should attempt to reconnect automatically"
echo "   - After 2-3 failed attempts, should show retry button"
echo "   - Restart server and click retry"
echo "   - Should reconnect and continue game"
echo ""
echo "✅ Scenario 4: Invalid Session"
echo "   - Try connecting with invalid session ID: 'invalid123'"
echo "   - Should timeout after 5 seconds"
echo "   - Should show error message"
echo "   - Should show retry button"
echo ""
echo "✅ Scenario 5: Back to Menu"
echo "   - After 3+ failed reconnection attempts"
echo "   - 'Back to Menu' button should appear"
echo "   - Click it to return to main menu"
echo ""
echo "Expected Behavior Summary:"
echo "-------------------------"
echo "✓ Connection attempts timeout after 5 seconds"
echo "✓ Error messages are clear and helpful"
echo "✓ Retry button appears when connection fails"
echo "✓ Auto-reconnect only happens for delays < 5s"
echo "✓ Manual retry works after timeout"
echo "✓ Server down scenario is handled gracefully"
echo "✓ User can return to menu after multiple failures"
echo ""
echo "📊 Key Implementation Details:"
echo "-----------------------------"
echo "• Connection timeout: 5 seconds"
echo "• Auto-reconnect threshold: < 5 seconds delay"
echo "• Retry button shown: after timeout or 2+ failed attempts"
echo "• Back to menu shown: after 3+ failed attempts"
echo "• Error states tracked: connectionError in gameStore"
echo "• Manual retry: forceReconnect() method"
echo ""
echo -e "${GREEN}Test setup complete!${NC}"
echo "Open http://localhost:8080 in your browser to test"
