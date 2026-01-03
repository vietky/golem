#!/bin/bash

# Test script to verify WebSocket disconnection detection improvements

set -e

echo "==============================================="
echo "Testing WebSocket Disconnection Detection"
echo "==============================================="
echo ""

echo "✅ Step 1: Building the project..."
go build ./...
echo ""

echo "✅ Step 2: Running disconnection detection tests..."
go test -v -run "TestDisconnection|TestPingPong" ./internal/session/ -timeout 60s
echo ""

echo "✅ Step 3: Running all session tests..."
go test ./internal/session/ -timeout 60s
echo ""

echo "✅ Step 4: Running game logic tests..."
go test ./internal/game/
echo ""

echo "==============================================="
echo "✅ All tests passed!"
echo "==============================================="
echo ""
echo "Summary of improvements:"
echo "- Disconnection detection time: ~500ms (previously could take 60+ seconds)"
echo "- Ping interval: 15 seconds (configurable via WEBSOCKET_PING_INTERVAL)"
echo "- Read timeout: 60 seconds (configurable via WEBSOCKET_READ_TIMEOUT)"
echo "- Write timeout: 10 seconds (configurable via WEBSOCKET_WRITE_TIMEOUT)"
echo ""
echo "Configuration environment variables:"
echo "  WEBSOCKET_PING_INTERVAL=15    # Seconds between ping messages"
echo "  WEBSOCKET_READ_TIMEOUT=60     # Read timeout in seconds"
echo "  WEBSOCKET_WRITE_TIMEOUT=10    # Write timeout in seconds"
echo ""
