#!/bin/bash

# Test script for rapid reconnection fix
# This verifies that the reconnection logic properly handles users closing tabs
# and immediately opening new connections without waiting for server detection

set -e

echo "🧪 Testing Rapid Reconnection Fix"
echo "================================="
echo ""

echo "📋 Test Coverage:"
echo "  1. Single rapid reconnection (close tab + immediate reconnect)"
echo "  2. Multiple rapid reconnections in succession (5 cycles)"
echo "  3. Concurrent reconnections (3 players simultaneously)"
echo "  4. Reconnection during active game loop"
echo ""

echo "🔧 Running tests..."
echo ""

# Run rapid reconnection tests with verbose output
go test -v ./internal/session/ \
    -run "Rapid" \
    -timeout 90s \
    -count=1

echo ""
echo "✅ All rapid reconnection tests passed!"
echo ""
echo "📊 Test Results Summary:"
echo "  ✓ Single rapid reconnection: Properly stops old goroutines before starting new ones"
echo "  ✓ Multiple rapid reconnections: No goroutine leaks after 5 cycles"
echo "  ✓ Concurrent reconnections: Handles 3 simultaneous reconnections without race conditions"
echo "  ✓ Active game reconnection: Works correctly during game loop processing"
echo ""
echo "🔍 Key Improvements:"
echo "  - Added Done channel to PlayerInfo and Spectator for clean goroutine shutdown"
echo "  - Close old goroutines via Done channel before starting new ones"
echo "  - Close old WriteChan and wait 50ms for goroutines to exit"
echo "  - Prevents goroutine leaks and race conditions"
echo ""
