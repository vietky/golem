#!/bin/bash

# Comprehensive WebSocket Connection Test
# Tests the full flow from session creation to WebSocket connection

# Don't exit on error - we want to see all test results
# set -e

echo "=========================================="
echo "WebSocket Connection Test Suite"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

test_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

test_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

test_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Test 1: Backend Server
echo "Test 1: Backend Server"
echo "-----------------------------------"
if lsof -i :8080 | grep -q LISTEN; then
    test_pass "Backend server running on port 8080"
else
    test_fail "Backend server NOT running on port 8080"
    echo "Start with: make server"
    exit 1
fi
echo ""

# Test 2: Vite Dev Server
echo "Test 2: Vite Dev Server"
echo "-----------------------------------"
if lsof -i :3000 | grep -q LISTEN; then
    test_pass "Vite dev server running on port 3000"
else
    test_fail "Vite dev server NOT running on port 3000"
    echo "Start with: npm run dev"
    exit 1
fi
echo ""

# Test 3: Environment Configuration
echo "Test 3: Environment Configuration"
echo "-----------------------------------"
ENV_FILE="web/react-frontend/.env.local"
if [ -f "$ENV_FILE" ]; then
    test_pass ".env.local exists"
    if grep -q "VITE_API_HOST=http://localhost:8080" "$ENV_FILE"; then
        test_pass "VITE_API_HOST configured correctly"
    else
        test_fail "VITE_API_HOST not set to http://localhost:8080"
    fi
else
    test_fail ".env.local not found"
fi
echo ""

# Test 4: Create Session via API
echo "Test 4: Session Creation"
echo "-----------------------------------"
SESSION_RESPONSE=$(curl -s -X POST http://localhost:8080/api/single \
    -H "Content-Type: application/json" \
    -d '{"playerName": "TestPlayer", "avatar": "1", "numAI": 1}')

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"sessionID":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
    test_fail "Failed to create session"
    echo "Response: $SESSION_RESPONSE"
    exit 1
else
    test_pass "Session created: $SESSION_ID"
fi
echo ""

# Test 5: WebSocket Connection (using websocat if available)
echo "Test 5: WebSocket Connection Test"
echo "-----------------------------------"
if command -v websocat &> /dev/null; then
    test_info "Testing direct WebSocket connection to backend..."
    
    # Test with timeout
    WS_URL="ws://localhost:8080/ws?session=${SESSION_ID}&name=TestPlayer&avatar=1"
    test_info "Connecting to: $WS_URL"
    
    # Try to connect and send a message (with timeout)
    echo '{"type":"ping"}' | timeout 3 websocat "$WS_URL" > /tmp/ws_test_output.txt 2>&1 &
    WS_PID=$!
    sleep 1
    
    if kill -0 $WS_PID 2>/dev/null; then
        test_pass "WebSocket connection established"
        kill $WS_PID 2>/dev/null || true
    else
        test_fail "WebSocket connection failed"
        cat /tmp/ws_test_output.txt
    fi
else
    test_info "websocat not installed - skipping direct WebSocket test"
    test_info "Install with: brew install websocat (macOS) or cargo install websocat"
fi
echo ""

# Test 6: Proxy Configuration
echo "Test 6: Vite Proxy Configuration"
echo "-----------------------------------"
VITE_CONFIG="web/react-frontend/vite.config.js"
if grep -q "'/ws':" "$VITE_CONFIG"; then
    test_pass "WebSocket proxy configured in vite.config.js"
    if grep -q "ws: true" "$VITE_CONFIG"; then
        test_pass "WebSocket upgrade enabled in proxy"
    else
        test_fail "WebSocket upgrade not enabled"
    fi
else
    test_fail "WebSocket proxy not configured"
fi
echo ""

# Test 7: GameStore Configuration
echo "Test 7: GameStore WebSocket Logic"
echo "-----------------------------------"
GAME_STORE="web/react-frontend/src/store/gameStore.js"
if grep -q "connectWebSocket" "$GAME_STORE"; then
    test_pass "connectWebSocket function exists"
    if grep -q "import.meta.env.DEV" "$GAME_STORE"; then
        test_pass "Development mode detection implemented"
    else
        test_info "No development mode detection (may connect to wrong host)"
    fi
else
    test_fail "connectWebSocket function not found"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
else
    echo -e "${GREEN}Failed: 0${NC}"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Open http://localhost:3000/test-websocket.html in browser"
    echo "2. Click 'Create Single Player Session'"
    echo "3. Click 'Connect to WebSocket'"
    echo "4. Verify connection is successful"
    echo ""
    echo "Or test the full app:"
    echo "1. Open http://localhost:3000"
    echo "2. Click 'Single Player'"
    echo "3. Check browser console for WebSocket logs"
    echo ""
    echo "Expected WebSocket URL (via proxy):"
    echo "ws://localhost:3000/ws?session=${SESSION_ID}&name=Player&avatar=4"
    echo ""
    echo "This proxies to backend:"
    echo "ws://localhost:8080/ws?session=${SESSION_ID}&name=Player&avatar=4"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo "Please fix the issues above and try again"
    exit 1
fi
