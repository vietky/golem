#!/bin/bash

# WebSocket Connection Testing - Quick Start
# This script demonstrates how to test WebSocket connections

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   WebSocket Testing Quick Start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check backend status
echo "1. Checking backend server..."
if lsof -i :8080 | grep -q LISTEN; then
  echo "   ✅ Backend server is running on port 8080"
else
  echo "   ❌ Backend server is NOT running"
  echo ""
  echo "   Start the server first:"
  echo "   cd /Users/avietidol/codes/golem"
  echo "   go run cmd/server/main.go"
  echo ""
  exit 1
fi
echo ""

# Run quick test
echo "2. Running WebSocket connection test..."
echo ""
cd "$(dirname "$0")/web/react-frontend"
node test-ws-quick.cjs

EXIT_CODE=$?
echo ""

if [ $EXIT_CODE -eq 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "   ✅ WebSocket Test Passed!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Next steps:"
  echo ""
  echo "  • Interactive testing:"
  echo "    node web/react-frontend/test-ws-connection.cjs --name YourName"
  echo ""
  echo "  • Test as spectator:"
  echo "    node web/react-frontend/test-ws-connection.cjs --spectate --session <id>"
  echo ""
  echo "  • Full documentation:"
  echo "    cat web/react-frontend/WEBSOCKET_TESTING.md"
  echo ""
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "   ❌ WebSocket Test Failed"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Troubleshooting:"
  echo ""
  echo "  1. Check server logs:"
  echo "     tail -f /tmp/golem-server.log"
  echo ""
  echo "  2. Verify backend is running:"
  echo "     lsof -i :8080"
  echo ""
  echo "  3. Check for errors in test output above"
  echo ""
fi

exit $EXIT_CODE
