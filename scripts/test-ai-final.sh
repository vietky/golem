#!/bin/bash

set -e

echo "=== AI Single Player Test ==="
echo

# Kill any existing server
pkill -f "bin/server" 2>/dev/null || true
sleep 1

# Start server in background
echo "[1/4] Starting server..."
cd /Users/avietidol/codes/golem
./bin/server > /tmp/server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to start
echo "[2/4] Waiting for server to be ready..."
sleep 3

# Check if server is running
if ! ps -p $SERVER_PID > /dev/null; then
    echo "❌ Server failed to start!"
    cat /tmp/server.log
    exit 1
fi

echo "[3/4] Running AI test..."
cd /Users/avietidol/codes/golem/web/react-frontend
node test-ai-improved.cjs

TEST_RESULT=$?

# Cleanup
echo "[4/4] Cleaning up..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

if [ $TEST_RESULT -eq 0 ]; then
    echo
    echo "✅ TEST PASSED"
    exit 0
else
    echo
    echo "❌ TEST FAILED"
    echo
    echo "=== Server Logs ==="
    tail -50 /tmp/server.log
    exit 1
fi
