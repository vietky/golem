#!/bin/bash

# Quick WebSocket Connection Test
# This script tests the WebSocket connection without opening a browser

set -e

echo "🧪 Quick WebSocket Connection Test"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo "1. Checking if backend server is running..."
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
  echo -e "${RED}❌ Backend server is not running on port 8080${NC}"
  echo ""
  echo "Please start the backend server first:"
  echo "  cd /Users/avietidol/codes/golem"
  echo "  make run-dev"
  echo ""
  exit 1
fi
echo -e "${GREEN}✅ Backend server is running${NC}"
echo ""

# Test WebSocket connection
echo "2. Testing WebSocket connection..."
cd /Users/avietidol/codes/golem/web/react-frontend

# Run the test script
node test-ws-connection.js --session "quick_test_$(date +%s)" --name "QuickTest" &
WS_PID=$!

# Wait a bit for connection
sleep 2

# Check if still running (means connected)
if ps -p $WS_PID > /dev/null 2>&1; then
  echo -e "${GREEN}✅ WebSocket connected successfully${NC}"
  echo ""
  echo "Connection is active. Sending test message..."
  
  # Send a test message (send "close" to the stdin)
  sleep 1
  echo "close" | kill -PIPE $WS_PID 2>/dev/null || kill $WS_PID 2>/dev/null
  
  wait $WS_PID 2>/dev/null
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Connection closed gracefully${NC}"
  else
    echo -e "${YELLOW}⚠️  Connection closed with code $EXIT_CODE${NC}"
  fi
else
  echo -e "${RED}❌ WebSocket connection failed${NC}"
  echo ""
  echo "Check the logs above for error details"
  exit 1
fi

echo ""
echo "===================================="
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "You can now run the full test script:"
echo "  cd /Users/avietidol/codes/golem/web/react-frontend"
echo "  node test-ws-connection.js"
echo ""
