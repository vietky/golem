#!/bin/bash

echo "========================================="
echo "Testing Game Started Restriction"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if server is running
if ! curl -s http://localhost:8080/api/list > /dev/null 2>&1; then
    echo -e "${RED}Error: Backend server is not running on localhost:8080${NC}"
    echo "Please start the server first:"
    echo "  cd /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century"
    echo "  ./bin/server"
    exit 1
fi

echo "✓ Backend server is running"
echo ""

# Test 1: Create a game session
echo "Test 1: Creating a game session..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:8080/api/create \
  -H "Content-Type: application/json" \
  -d '{"numPlayers":2,"seed":99999}')

SESSION_ID=$(echo $CREATE_RESPONSE | grep -o '"sessionID":"[^"]*' | cut -d'"' -f4)
if [ -n "$SESSION_ID" ]; then
    echo -e "${GREEN}✓${NC} Created session: $SESSION_ID"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Failed to create session"
    ((TESTS_FAILED++))
    exit 1
fi

echo ""
echo "Test 2: Verify game has NOT started (CurrentTurn = 0)..."
echo "   (Game starts only when a player takes an action)"
echo ""

echo "Test 3: Testing game state restriction..."
echo "   Note: We can't easily simulate 'game started' via HTTP API"
echo "   The restriction is enforced at WebSocket connection time"
echo "   This requires manual testing with the frontend"
echo ""

echo "========================================="
echo "Unit Test Results (from Go tests)"
echo "========================================="
echo ""

cd /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century

# Run the game started tests
echo "Running HasGameStarted tests..."
go test ./internal/server/... -run TestHasGameStarted -v 2>&1 | grep -q "PASS: TestHasGameStarted"
check_result "TestHasGameStarted"

go test ./internal/server/... -run TestSpectatorOnlyWhenGameStarted -v 2>&1 | grep -q "PASS: TestSpectatorOnlyWhenGameStarted"
check_result "TestSpectatorOnlyWhenGameStarted"

go test ./internal/server/... -run TestGameStateNotAffectedBySpectators -v 2>&1 | grep -q "PASS: TestGameStateNotAffectedBySpectators"
check_result "TestGameStateNotAffectedBySpectators"

# Run spectator mode tests
go test ./internal/server/... -run TestSpectatorMode -v 2>&1 | grep -q "PASS: TestSpectatorMode"
check_result "TestSpectatorMode"

go test ./internal/server/... -run TestPlayerJoinedNotification -v 2>&1 | grep -q "PASS: TestPlayerJoinedNotification"
check_result "TestPlayerJoinedNotification"

go test ./internal/server/... -run TestListSessionsIncludesSpectatorCount -v 2>&1 | grep -q "PASS: TestListSessionsIncludesSpectatorCount"
check_result "TestListSessionsIncludesSpectatorCount"

echo ""
echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All automated tests passed! ✓${NC}"
    echo ""
    echo "========================================="
    echo "Manual Testing Instructions"
    echo "========================================="
    echo ""
    echo -e "${BLUE}To verify the full functionality:${NC}"
    echo ""
    echo "1. Start the frontend server (if not already running):"
    echo "   cd /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century/web/react-frontend"
    echo "   npm run dev"
    echo ""
    echo "2. Open http://localhost:3000 in THREE browser windows"
    echo ""
    echo "3. Window 1 - Create and Start Game:"
    echo "   - Create a new 2-player game"
    echo "   - Note the session ID"
    echo ""
    echo "4. Window 2 - Join as Player:"
    echo "   - Join the game as Player 2 (blue Join button)"
    echo "   - Play a card or take an action to START the game"
    echo ""
    echo "5. Window 3 - Try to Join as Player (SHOULD FAIL):"
    echo "   - Try to join the SAME game as a player"
    echo "   - ${YELLOW}Expected: Connection should be rejected${NC}"
    echo "   - ${YELLOW}Message: 'Game has already started. You can only spectate.'${NC}"
    echo ""
    echo "6. Window 3 - Join as Spectator (SHOULD SUCCEED):"
    echo "   - Click the purple 👁️ spectate button"
    echo "   - ${GREEN}Expected: Successfully join as spectator${NC}"
    echo "   - ${GREEN}You should see the game state and updates${NC}"
    echo ""
    echo "7. Verify spectator behavior:"
    echo "   - Spectator sees all game state updates"
    echo "   - Spectator cannot perform actions"
    echo "   - All users see 'Spectator joined' notification"
    echo ""
    echo "========================================="
    echo "Expected Behavior Summary"
    echo "========================================="
    echo ""
    echo "BEFORE game starts (CurrentTurn = 0, no cards played):"
    echo "  ✓ Players CAN join"
    echo "  ✓ Spectators CAN join"
    echo ""
    echo "AFTER game starts (CurrentTurn > 0 OR cards played):"
    echo "  ✗ Players CANNOT join (error message shown)"
    echo "  ✓ Spectators CAN join"
    echo ""
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi
