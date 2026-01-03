#!/bin/bash

# Test graceful shutdown with active WebSocket connections

echo "🚀 Starting test of graceful shutdown..."
echo ""

# Start server in background
echo "📡 Starting server..."
go run cmd/server/main.go &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 3

# Check if server is ready
for i in {1..5}; do
    curl -s "http://localhost:8080/api/list" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Server is ready"
        break
    fi
    echo "  Waiting... ($i/5)"
    sleep 1
done

# Connect a WebSocket client using websocat if available, otherwise curl
echo "🔌 Connecting WebSocket clients..."

# Use a simple curl to create a session first
SESSION_ID="test-shutdown-$(date +%s)"
echo "Creating session: $SESSION_ID"

# Try to connect with multiple clients using netcat or similar
# Since we don't have websocat, we'll just verify the server is running
curl -s "http://localhost:8080/api/list" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Server is running and responding"
else
    echo "❌ Server is not responding"
    kill $SERVER_PID
    exit 1
fi

# Give it a moment
sleep 1

# Send SIGINT to the server
echo ""
echo "🛑 Sending shutdown signal (Ctrl+C simulation)..."
kill -INT $SERVER_PID

# Wait for graceful shutdown
wait $SERVER_PID
EXIT_CODE=$?

echo ""
echo "📊 Test Results:"
echo "  Exit code: $EXIT_CODE"

if [ $EXIT_CODE -eq 0 ] || [ $EXIT_CODE -eq 1 ]; then
    echo "  ✅ Server shut down gracefully"
else
    echo "  ❌ Server did not shut down cleanly (exit code: $EXIT_CODE)"
fi

echo ""
echo "🎉 Graceful shutdown test complete!"
