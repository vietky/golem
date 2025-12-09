#!/bin/bash
set -e

echo "=================================="
echo "Event Store End-to-End Test"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Start services
echo -e "${BLUE}1. Starting MongoDB...${NC}"
docker-compose up -d mongodb
sleep 5

# Wait for MongoDB to be ready
echo -e "${BLUE}2. Waiting for MongoDB to be ready...${NC}"
for i in {1..30}; do
    if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ MongoDB is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ MongoDB failed to start${NC}"
        exit 1
    fi
    sleep 1
done

# Run integration test
echo -e "${BLUE}3. Running integration tests...${NC}"
if go test -v -run Integration ./internal/eventstore/; then
    echo -e "${GREEN}✓ Integration tests passed${NC}"
else
    echo -e "${RED}✗ Integration tests failed${NC}"
    exit 1
fi

# Build server
echo -e "${BLUE}4. Building server...${NC}"
if go build -o /tmp/golem-server ./cmd/server; then
    echo -e "${GREEN}✓ Server built successfully${NC}"
else
    echo -e "${RED}✗ Server build failed${NC}"
    exit 1
fi

# Start server in background
echo -e "${BLUE}5. Starting server...${NC}"
MONGO_URI=mongodb://localhost:27017 \
MONGO_DB=golem_game \
SERVER_PORT=8090 \
/tmp/golem-server -port 8090 &
SERVER_PID=$!
sleep 3

# Check server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${RED}✗ Server failed to start${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Server started (PID: $SERVER_PID)${NC}"

# Create a test game
echo -e "${BLUE}6. Creating test game...${NC}"
GAME_RESPONSE=$(curl -s -X POST http://localhost:8090/api/create \
    -H "Content-Type: application/json" \
    -d '{"numPlayers": 2, "seed": 12345}')

SESSION_ID=$(echo $GAME_RESPONSE | jq -r '.sessionID')
if [ "$SESSION_ID" = "null" ] || [ -z "$SESSION_ID" ]; then
    echo -e "${RED}✗ Failed to create game${NC}"
    echo "Response: $GAME_RESPONSE"
    kill $SERVER_PID
    exit 1
fi
echo -e "${GREEN}✓ Game created: $SESSION_ID${NC}"

# Wait a moment for initial state to be stored
sleep 2

# Query events
echo -e "${BLUE}7. Querying events...${NC}"
EVENTS_RESPONSE=$(curl -s "http://localhost:8090/api/events?gameId=$SESSION_ID")
EVENT_COUNT=$(echo $EVENTS_RESPONSE | jq '.count')

if [ "$EVENT_COUNT" -ge 1 ]; then
    echo -e "${GREEN}✓ Found $EVENT_COUNT events${NC}"
    echo "Sample event:"
    echo $EVENTS_RESPONSE | jq '.events[0] | {sequenceNum, playerId, timestamp}'
else
    echo -e "${RED}✗ No events found${NC}"
    kill $SERVER_PID
    exit 1
fi

# Query snapshot
echo -e "${BLUE}8. Querying snapshot...${NC}"
SNAPSHOT_RESPONSE=$(curl -s "http://localhost:8090/api/snapshot?gameId=$SESSION_ID")
SNAPSHOT_GAME_ID=$(echo $SNAPSHOT_RESPONSE | jq -r '.gameId')

if [ "$SNAPSHOT_GAME_ID" = "$SESSION_ID" ]; then
    echo -e "${GREEN}✓ Snapshot retrieved successfully${NC}"
    echo "Snapshot info:"
    echo $SNAPSHOT_RESPONSE | jq '{gameId, sequenceNum, updatedAt}'
else
    echo -e "${RED}✗ Failed to retrieve snapshot${NC}"
    kill $SERVER_PID
    exit 1
fi

# List games
echo -e "${BLUE}9. Listing games...${NC}"
GAMES_RESPONSE=$(curl -s http://localhost:8090/api/games)
GAMES_COUNT=$(echo $GAMES_RESPONSE | jq '.count')

if [ "$GAMES_COUNT" -ge 1 ]; then
    echo -e "${GREEN}✓ Found $GAMES_COUNT games${NC}"
else
    echo -e "${RED}✗ No games found${NC}"
    kill $SERVER_PID
    exit 1
fi

# Cleanup
echo -e "${BLUE}10. Cleaning up...${NC}"
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null || true
echo -e "${GREEN}✓ Server stopped${NC}"

echo ""
echo -e "${GREEN}=================================="
echo "✓ All tests passed!"
echo "==================================${NC}"
echo ""
echo "Event store is working correctly!"
echo "You can now:"
echo "  1. Start the server: make up"
echo "  2. Run admin interface: make admin-dev"
echo "  3. Access admin UI at: http://localhost:3002"
