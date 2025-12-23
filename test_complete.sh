#!/bin/bash

echo "========================================="
echo "Comprehensive Spectate Mode Test"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to check test result
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $1"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $1"
        ((TESTS_FAILED++))
    fi
}

echo "1. Testing Backend Compilation..."
cd /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century
go build -o bin/server cmd/server/main.go 2>&1 > /dev/null
check_result "Backend compiles successfully"

echo ""
echo "2. Running Unit Tests..."

# Test spectator mode
go test ./internal/server/... -run TestSpectatorMode -v 2>&1 | grep -q "PASS: TestSpectatorMode"
check_result "TestSpectatorMode passes"

# Test player joined notification
go test ./internal/server/... -run TestPlayerJoinedNotification -v 2>&1 | grep -q "PASS: TestPlayerJoinedNotification"
check_result "TestPlayerJoinedNotification passes"

# Test list sessions includes spectator count
go test ./internal/server/... -run TestListSessionsIncludesSpectatorCount -v 2>&1 | grep -q "PASS: TestListSessionsIncludesSpectatorCount"
check_result "TestListSessionsIncludesSpectatorCount passes"

echo ""
echo "3. Testing API Endpoints..."

# Start server in background if not running
if ! pgrep -f "bin/server" > /dev/null; then
    echo "   Starting server..."
    ./bin/server > /tmp/server.log 2>&1 &
    SERVER_PID=$!
    sleep 2
    SHOULD_KILL_SERVER=true
else
    echo "   Server already running"
    SHOULD_KILL_SERVER=false
fi

# Test create session
echo "   Testing session creation..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:8080/api/create \
  -H "Content-Type: application/json" \
  -d '{"numPlayers":2,"seed":99999}')

SESSION_ID=$(echo $CREATE_RESPONSE | grep -o '"sessionID":"[^"]*' | cut -d'"' -f4)
if [ -n "$SESSION_ID" ]; then
    check_result "Create session API works"
else
    check_result "Create session API works"
    TESTS_FAILED=$((TESTS_FAILED-1))
    TESTS_FAILED=$((TESTS_FAILED+1))
fi

# Test list sessions
echo "   Testing list sessions..."
LIST_RESPONSE=$(curl -s http://localhost:8080/api/list)
echo $LIST_RESPONSE | grep -q "spectatorCount"
check_result "List sessions includes spectatorCount field"

echo $LIST_RESPONSE | grep -q "$SESSION_ID"
check_result "Created session appears in list"

# Clean up server if we started it
if [ "$SHOULD_KILL_SERVER" = true ]; then
    echo "   Stopping test server..."
    kill $SERVER_PID 2>/dev/null
    wait $SERVER_PID 2>/dev/null
fi

echo ""
echo "4. Checking Frontend Files..."

# Check lobby component has spectate button
grep -q "asSpectator" /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century/web/react-frontend/src/components/Lobby.jsx
check_result "Lobby component has spectate functionality"

grep -q "👁️" /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century/web/react-frontend/src/components/Lobby.jsx
check_result "Lobby component has spectate button UI"

# Check game store has spectator support
grep -q "isSpectator" /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century/web/react-frontend/src/store/gameStore.js
check_result "Game store has isSpectator state"

grep -q "spectatorAssigned" /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century/web/react-frontend/src/store/gameStore.js
check_result "Game store handles spectatorAssigned message"

grep -q "playerJoined" /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century/web/react-frontend/src/store/gameStore.js
check_result "Game store handles playerJoined notification"

echo ""
echo "5. Checking Backend Implementation..."

# Check server.go has spectator support
grep -q "Spectators.*map\[string\]" /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century/internal/server/server.go
check_result "GameSession has Spectators map"

grep -q "AddSpectator" /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century/internal/server/server.go
check_result "AddSpectator method exists"

grep -q "BroadcastPlayerJoined" /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century/internal/server/server.go
check_result "BroadcastPlayerJoined method exists"

# Check handlers.go updated
grep -q "spectate.*true" /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century/internal/server/handlers.go
check_result "WebSocket handler supports spectate parameter"

echo ""
echo "6. Checking Documentation..."

test -f /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century/docs/SPECTATE_MODE.md
check_result "Spectate mode documentation exists"

test -f /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century/docs/IMPLEMENTATION_SUMMARY.md
check_result "Implementation summary exists"

test -f /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century/docs/VISUAL_GUIDE.md
check_result "Visual guide exists"

echo ""
echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    echo ""
    echo "Implementation is complete and verified!"
    echo ""
    echo "Next Steps:"
    echo "1. Start the backend server:"
    echo "   cd /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century"
    echo "   ./bin/server"
    echo ""
    echo "2. Start the frontend server:"
    echo "   cd /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century/web/react-frontend"
    echo "   npm run dev"
    echo ""
    echo "3. Test manually:"
    echo "   - Open http://localhost:3000 in multiple browsers"
    echo "   - Create a game"
    echo "   - Join as player (blue Join button)"
    echo "   - Join as spectator (purple 👁️ button)"
    echo "   - Verify notifications and spectator functionality"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi
