#!/bin/bash

# Test script for single player AI functionality
# This script tests that AI players are properly initialized and take actions

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Single Player AI Test...${NC}\n"

# Start the server in background
echo "Starting server..."
./bin/server &
SERVER_PID=$!
sleep 2

# Function to cleanup
cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    kill $SERVER_PID 2>/dev/null || true
}
trap cleanup EXIT

# Test 1: Create single player session
echo -e "${YELLOW}Test 1: Creating single player session with 3 AI opponents...${NC}"
SESSION_RESPONSE=$(curl -s -X POST http://localhost:8080/api/single \
  -H "Content-Type: application/json" \
  -d '{
    "numAI": 3,
    "turnTimeout": 5
  }')

echo "Response: $SESSION_RESPONSE"

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"sessionID":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}✓ Session created: $SESSION_ID${NC}\n"

# Test 2: Connect to the session via WebSocket
echo -e "${YELLOW}Test 2: Connecting to WebSocket and verifying AI players...${NC}"

# Create a simple Node.js test script
cat > /tmp/test-ai-ws.js << 'EOF'
const WebSocket = require('ws');

const sessionId = process.argv[2];
const wsUrl = `ws://localhost:8080/ws?session=${sessionId}&name=TestPlayer&avatar=1&client_id=test-client-123`;

console.log('Connecting to:', wsUrl);

const ws = new WebSocket(wsUrl);
let messageCount = 0;
let hasAIPlayers = false;
let aiActionsObserved = 0;

ws.on('open', () => {
  console.log('✓ WebSocket connected');
});

ws.on('message', (data) => {
  messageCount++;
  const msg = JSON.parse(data.toString());
  
  console.log(`\nMessage ${messageCount} (type: ${msg.type})`);
  
  if (msg.type === 'game_state') {
    if (msg.players) {
      console.log('\nPlayers in game:');
      msg.players.forEach((player, idx) => {
        const isAI = player.isAI || false;
        console.log(`  Player ${idx + 1}: ${player.name} (AI: ${isAI})`);
        if (isAI) hasAIPlayers = true;
      });
      
      // Check current turn
      if (msg.currentTurn !== undefined) {
        console.log(`Current turn: Player ${msg.currentTurn + 1}`);
        const currentPlayer = msg.players[msg.currentTurn];
        if (currentPlayer && currentPlayer.isAI) {
          aiActionsObserved++;
          console.log('  → AI player is taking turn');
        }
      }
    }
  }
  
  // After observing enough, exit with success
  if (messageCount > 10 || aiActionsObserved >= 2) {
    if (hasAIPlayers && aiActionsObserved > 0) {
      console.log('\n✓ SUCCESS: AI players detected and observed taking actions!');
      process.exit(0);
    } else if (!hasAIPlayers) {
      console.log('\n✗ FAIL: No AI players detected!');
      process.exit(1);
    }
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('WebSocket closed');
  if (!hasAIPlayers) {
    console.log('\n✗ FAIL: Connection closed before verifying AI players');
    process.exit(1);
  }
});

// Timeout after 30 seconds
setTimeout(() => {
  if (hasAIPlayers && aiActionsObserved > 0) {
    console.log('\n✓ Test completed successfully');
    process.exit(0);
  } else {
    console.log('\n✗ FAIL: Timeout - did not observe expected AI behavior');
    process.exit(1);
  }
}, 30000);
EOF

# Run the Node.js test
if command -v node &> /dev/null; then
    node /tmp/test-ai-ws.js "$SESSION_ID"
    TEST_RESULT=$?
    
    if [ $TEST_RESULT -eq 0 ]; then
        echo -e "\n${GREEN}✓ All tests passed!${NC}"
        echo -e "${GREEN}AI players are properly initialized and taking actions${NC}"
    else
        echo -e "\n${RED}✗ Tests failed!${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Node.js not found, skipping WebSocket test${NC}"
    echo "Please install Node.js to run the full test suite"
fi

echo -e "\n${GREEN}Single Player AI Test Complete!${NC}"
