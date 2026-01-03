#!/bin/bash

# Verification script for WebSocket Reconnection Implementation
# This script verifies that all components are properly implemented

set -e

echo "🔍 WebSocket Reconnection Implementation Verification"
echo "====================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

# Helper function
check_file() {
    local file=$1
    local description=$2
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $description - $file"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌${NC} $description - $file"
        ((FAILED++))
        return 1
    fi
}

check_content() {
    local file=$1
    local pattern=$2
    local description=$3
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $description"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌${NC} $description"
        ((FAILED++))
        return 1
    fi
}

# Backend checks
echo "📋 Backend Implementation"
echo "------------------------"
check_file "internal/session/session.go" "Session implementation"
check_content "internal/session/session.go" "isReconnection :=" "Reconnection detection logic"
check_content "internal/session/session.go" "existingPlayer, isReconnection :=" "Reconnection handler"
check_file "internal/session/reconnection_test.go" "Reconnection tests"

echo ""
echo "📋 Frontend Implementation"
echo "------------------------"
check_file "web/react-frontend/src/store/gameStore.js" "Game store with reconnection"
check_content "web/react-frontend/src/store/gameStore.js" "isReconnecting:" "Reconnection state"
check_content "web/react-frontend/src/store/gameStore.js" "forceReconnect:" "Force reconnect method"
check_content "web/react-frontend/src/store/gameStore.js" "cancelReconnect:" "Cancel reconnect method"
check_content "web/react-frontend/src/store/gameStore.js" "getReconnectionStatus:" "Status getter"

echo ""
echo "📋 Documentation"
echo "------------------------"
check_file "docs/RECONNECTION.md" "Reconnection documentation"
check_file "RECONNECTION_QUICK_REFERENCE.md" "Quick reference guide"
check_file "IMPLEMENTATION_COMPLETE.md" "Implementation summary"

echo ""
echo "🧪 Running Tests"
echo "------------------------"

# Run the reconnection tests
echo "Running reconnection tests..."
if go test ./internal/session -run Reconnection -timeout 30s -count=1 &>/dev/null; then
    echo -e "${GREEN}✅${NC} All reconnection tests pass"
    ((PASSED++))
else
    echo -e "${RED}❌${NC} Some tests failed"
    ((FAILED++))
fi

# Run all session tests
echo "Running all session tests..."
if go test ./internal/session -timeout 60s -count=1 &>/dev/null; then
    echo -e "${GREEN}✅${NC} All session tests pass"
    ((PASSED++))
else
    echo -e "${RED}❌${NC} Some session tests failed"
    ((FAILED++))
fi

echo ""
echo "📊 Verification Summary"
echo "======================="
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All verification checks PASSED!${NC}"
    echo ""
    echo "🚀 Ready for deployment!"
    echo ""
    echo "Next steps:"
    echo "1. Review docs/RECONNECTION.md for technical details"
    echo "2. Review RECONNECTION_QUICK_REFERENCE.md for quick start"
    echo "3. Run manual tests in browser"
    echo "4. Deploy to production"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some checks failed!${NC}"
    exit 1
fi
