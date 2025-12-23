#!/bin/bash
# Test script to verify spectators can see player state when joining mid-game

echo "=== Testing Spectator Mid-Game Join ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Start the server
echo "Starting server..."
go run cmd/server/main.go &
SERVER_PID=$!
sleep 2

# Check if server started
if ! lsof -ti:8080 > /dev/null 2>&1; then
    echo -e "${RED}❌ Server failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Server started${NC}"

# Run the spectate integration test
echo ""
echo "Running spectate integration test..."
go test -v ./internal/server -run TestSpectateIntegration

# Capture exit code
TEST_EXIT=$?

# Kill the server
echo ""
echo "Cleaning up..."
kill $SERVER_PID 2>/dev/null
lsof -ti:8080 | xargs kill -9 2>/dev/null

if [ $TEST_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed${NC}"
fi

exit $TEST_EXIT
