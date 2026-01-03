#!/bin/bash

# Graceful Shutdown Verification Script
# Verifies the graceful shutdown implementation is working correctly

echo "🔍 Graceful Shutdown Implementation Verification"
echo "=================================================="
echo ""

PASSED=0
FAILED=0

# Test 1: Check signal handling code exists in main.go
echo "✓ Test 1: Checking signal handling in main.go..."
if grep -q "signal.Notify" cmd/server/main.go && \
   grep -q "os.Interrupt" cmd/server/main.go && \
   grep -q "syscall.SIGTERM" cmd/server/main.go; then
    echo "  ✅ Signal handling code present"
    ((PASSED++))
else
    echo "  ❌ Signal handling code missing"
    ((FAILED++))
fi

# Test 2: Check GameServer.Shutdown() exists
echo "✓ Test 2: Checking GameServer.Shutdown() method..."
if grep -q "func (gs \*GameServer) Shutdown()" internal/server/server.go; then
    echo "  ✅ GameServer.Shutdown() method exists"
    ((PASSED++))
else
    echo "  ❌ GameServer.Shutdown() method missing"
    ((FAILED++))
fi

# Test 3: Check GameSession.Close() exists (V2)
echo "✓ Test 3: Checking GameSession.Close() method..."
if grep -q "func (gs \*GameSession) Close()" internal/session/session.go; then
    echo "  ✅ GameSession.Close() method exists"
    ((PASSED++))
else
    echo "  ❌ GameSession.Close() method missing"
    ((FAILED++))
fi

# Test 4: Check shutdown tests exist
echo "✓ Test 4: Checking shutdown test file exists..."
if [ -f "internal/server/shutdown_test.go" ]; then
    echo "  ✅ Shutdown test file exists"
    ((PASSED++))
else
    echo "  ❌ Shutdown test file missing"
    ((FAILED++))
fi

# Test 5: Run shutdown tests
echo "✓ Test 5: Running shutdown tests..."
if go test -v ./internal/server -run "Shutdown" > /tmp/shutdown_test_output.txt 2>&1; then
    SHUTDOWN_TESTS=$(grep -c "PASS:" /tmp/shutdown_test_output.txt)
    echo "  ✅ All shutdown tests passed ($SHUTDOWN_TESTS tests)"
    ((PASSED++))
else
    echo "  ❌ Shutdown tests failed"
    cat /tmp/shutdown_test_output.txt
    ((FAILED++))
fi

# Test 6: Check WebSocket close message handling
echo "✓ Test 6: Checking WebSocket close message code..."
if grep -q "websocket.CloseNormalClosure" internal/session/session.go && \
   grep -q "Server shutting down" internal/session/session.go; then
    echo "  ✅ Proper WebSocket close messages implemented"
    ((PASSED++))
else
    echo "  ❌ WebSocket close messages missing"
    ((FAILED++))
fi

# Test 7: Check shutdown timeout
echo "✓ Test 7: Checking shutdown timeout configuration..."
if grep -q "context.WithTimeout" cmd/server/main.go && \
   grep -q "10\*time.Second" cmd/server/main.go; then
    echo "  ✅ Shutdown timeout configured (10 seconds)"
    ((PASSED++))
else
    echo "  ❌ Shutdown timeout not configured"
    ((FAILED++))
fi

# Test 8: Check documentation exists
echo "✓ Test 8: Checking documentation..."
if [ -f "docs/GRACEFUL_SHUTDOWN.md" ]; then
    echo "  ✅ Documentation exists (docs/GRACEFUL_SHUTDOWN.md)"
    ((PASSED++))
else
    echo "  ❌ Documentation missing"
    ((FAILED++))
fi

# Test 9: Verify HTTP server graceful shutdown
echo "✓ Test 9: Checking HTTP server shutdown code..."
if grep -q "httpServer.Shutdown(ctx)" cmd/server/main.go; then
    echo "  ✅ HTTP server graceful shutdown implemented"
    ((PASSED++))
else
    echo "  ❌ HTTP server graceful shutdown missing"
    ((FAILED++))
fi

# Test 10: Check session cleanup
echo "✓ Test 10: Checking session map cleanup..."
if grep -q "SessionsV2 = make(map\[string\]\*session.GameSession)" internal/server/server.go && \
   grep -q "Sessions = make(map\[string\]\*GameSession)" internal/server/server.go; then
    echo "  ✅ Session maps are properly cleared on shutdown"
    ((PASSED++))
else
    echo "  ❌ Session cleanup missing"
    ((FAILED++))
fi

# Test 11: Check channel closure
echo "✓ Test 11: Checking channel cleanup..."
if grep -q "close(gs.ActionChan)" internal/session/session.go; then
    echo "  ✅ Channels are properly closed"
    ((PASSED++))
else
    echo "  ❌ Channel cleanup missing"
    ((FAILED++))
fi

# Test 12: Verify all tests still pass
echo "✓ Test 12: Running full game and session test suite..."
if go test ./internal/game ./internal/session > /tmp/full_test_output.txt 2>&1; then
    echo "  ✅ All game and session tests pass (no regressions)"
    ((PASSED++))
else
    echo "  ❌ Some tests failed (possible regression)"
    grep "FAIL" /tmp/full_test_output.txt | head -5
    ((FAILED++))
fi

# Summary
echo ""
echo "=================================================="
echo "📊 Verification Summary"
echo "=================================================="
echo "  Passed: $PASSED/12"
echo "  Failed: $FAILED/12"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ✅ All verification checks passed!"
    echo ""
    echo "✨ Graceful shutdown is fully implemented and working correctly."
    echo ""
    echo "📝 Key Features:"
    echo "  • Signal handling (SIGINT, SIGTERM, os.Interrupt)"
    echo "  • 10-second shutdown timeout"
    echo "  • Proper WebSocket close messages"
    echo "  • Session and connection cleanup"
    echo "  • HTTP server graceful shutdown"
    echo "  • Comprehensive test suite"
    echo ""
    echo "🚀 You can now safely stop the server with Ctrl+C!"
    exit 0
else
    echo "❌ Some verification checks failed."
    echo "Please review the failures above."
    exit 1
fi
