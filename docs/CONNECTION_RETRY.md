# Connection Retry Implementation

## Overview

This document describes the connection retry logic implemented for the Golem Century game frontend. The system provides better user experience by handling connection failures gracefully with timeout detection, error messages, and manual retry capability.

## Features Implemented

### 1. Connection Timeout (5 seconds)

**Problem Solved:** The "Connecting..." message would display indefinitely when the server is down or unreachable.

**Solution:** Added a 5-second timeout for all connection attempts:

```javascript
// In gameStore.js - connectWebSocket()
const connectionTimeoutId = setTimeout(() => {
  const currentWs = get().ws;
  const isConnected = get().connected;
  
  if (!isConnected && currentWs) {
    logger.error('⏱️ Connection timeout after 5 seconds');
    currentWs.close();
    set({ 
      connectionError: 'Connection timeout. The server may be down or unreachable.',
      isConnecting: false,
    });
    showToast('Connection timeout. Please try again.', 'error');
  }
}, 5000);
```

### 2. Error State Management

**New State Fields in gameStore:**
- `connectionTimeoutId`: Tracks timeout timer for cleanup
- `connectionError`: Stores error message to display to user
- `isConnecting`: Tracks if currently attempting to connect

**Error Sources:**
1. **Connection Timeout** - No response after 5 seconds
2. **WebSocket Error** - Network error or invalid URL
3. **Server Close** - Server rejects connection or crashes
4. **Invalid Session** - Session doesn't exist

### 3. Smart Auto-Reconnect

**Behavior Change:** Only auto-reconnect if delay is < 5 seconds

```javascript
// Only auto-reconnect if delay is less than 5 seconds
// For longer delays, require manual retry
if (reconnectDelay <= 5000) {
  const timeoutId = setTimeout(() => {
    logger.info(`🔄 Reconnecting now (attempt ${newAttempts})...`);
    get().connectWebSocket(sessionId, ...);
  }, reconnectDelay);
  set({ reconnectTimeoutId: timeoutId });
} else {
  // Wait is too long, show manual retry option
  logger.info(`⏸️ Waiting for manual retry (delay would be ${Math.round(reconnectDelay / 1000)}s)`);
  set({ 
    isReconnecting: false,
    connectionError: errorMessage || 'Connection lost. Please retry manually.',
  });
}
```

**Reconnection Timeline:**
- Attempt 1: Auto-reconnect after 1s ✅
- Attempt 2: Auto-reconnect after 1.5s ✅
- Attempt 3: Auto-reconnect after 2.25s ✅
- Attempt 4: Auto-reconnect after 3.375s ✅
- Attempt 5: Auto-reconnect after ~5s ✅
- Attempt 6+: Manual retry required ⚠️ (delay > 5s)

### 4. Retry Button UI

**When Shown:**
- Connection error occurred
- Reconnecting with 2+ failed attempts
- Auto-reconnect delay exceeds 5 seconds

**Location:** [SinglePlayerApp.jsx](web/react-frontend/src/SinglePlayerApp.jsx#L280-L340)

**Visual Components:**
1. **Error Icon** - Red circle with warning icon
2. **Error Title** - "Connection Failed" or "Reconnecting (N/10)"
3. **Error Message** - Specific error from `connectionError` state
4. **Retry Button** - Purple button to trigger `forceReconnect()`
5. **Back to Menu** - Shown after 3+ failed attempts

### 5. Server Error Messages

**Server-Provided Errors (via close reason):**
```javascript
ws.onclose = (event) => {
  const displayMessage = event.reason || errorMessage;
  showToast(displayMessage + ' - attempting to reconnect...', 'warning');
  set({ connectionError: displayMessage });
}
```

**Backend Close Codes:**
- `1000`: Normal closure (no reconnect)
- `1006`: Abnormal closure / connection lost
- `1011`: Internal server error
- Custom reasons from server rejections

## User Experience Flow

### Scenario 1: Normal Connection
1. User clicks "Join Game"
2. Spinner shows "Connecting..."
3. Connection succeeds within 1-2 seconds
4. Toast: "Connected to game server"
5. Enter game/waiting room

### Scenario 2: Server Down (Initial Connection)
1. User clicks "Join Game"
2. Spinner shows "Connecting..."
3. After 5 seconds, timeout triggers
4. Show error icon and "Connection Failed"
5. Display: "Connection timeout. The server may be down or unreachable."
6. Show "Retry Connection" button
7. User clicks retry → repeat process

### Scenario 3: Mid-Game Disconnection
1. Playing game, server crashes
2. WebSocket `onclose` fires
3. Auto-reconnect attempt 1 (1s delay)
4. Auto-reconnect attempt 2 (1.5s delay)
5. Show "Reconnecting (2/10)" with retry button
6. User can click retry or wait for auto-reconnect
7. After 3 attempts, show "Back to Menu" option

### Scenario 4: Long Reconnection Queue
1. Network unstable, multiple failures
2. Attempts 1-5: Auto-reconnect (delays < 5s)
3. Attempt 6+: Delay would be > 5s
4. Stop auto-reconnect, show retry button
5. User must manually retry

## Code Changes Summary

### Frontend Files Modified

**`web/react-frontend/src/store/gameStore.js`** (~100 lines)
- Added `connectionTimeoutId`, `connectionError`, `isConnecting` state
- Implemented 5-second timeout in `connectWebSocket()`
- Enhanced error handling in `ws.onerror` and `ws.onclose`
- Added smart auto-reconnect logic (only if delay < 5s)
- Clear timeouts properly on success/failure

**`web/react-frontend/src/SinglePlayerApp.jsx`** (~60 lines)
- Import connection state from gameStore
- Conditional UI rendering based on connection status
- Error icon and message display
- Retry button with `forceReconnect()` callback
- Back to menu after 3+ failures
- Responsive design for mobile/desktop

### New Files

**`scripts/test-connection-retry.sh`**
- Manual testing guide
- Test scenarios documentation
- Expected behavior checklist

**`docs/CONNECTION_RETRY.md`** (this file)
- Complete implementation documentation
- Usage examples
- Troubleshooting guide

## Testing Instructions

### Automated Tests
```bash
# Run frontend build
make fe-build-local

# Start backend server
go run cmd/server/main.go

# Run test guide
./scripts/test-connection-retry.sh
```

### Manual Testing Scenarios

#### Test 1: Normal Connection
1. Start server
2. Open http://localhost:8080
3. Join a game
4. **Expected:** Connect within 1-2 seconds

#### Test 2: Server Down (Timeout)
1. Stop server
2. Try to join game
3. **Expected:** 
   - Spinner for ~5 seconds
   - Error icon appears
   - "Connection timeout" message
   - Retry button shown

#### Test 3: Invalid Session
1. Start server
2. Use invalid session ID
3. **Expected:**
   - Timeout after 5 seconds
   - Error message displayed
   - Retry button available

#### Test 4: Mid-Game Reconnection
1. Start game with 2 players
2. Stop server mid-game
3. **Expected:**
   - Auto-reconnect attempts 1-2
   - Retry button appears
4. Restart server
5. Click retry
6. **Expected:** Reconnect and continue game

#### Test 5: Multiple Failures
1. Try connecting with server down
2. Retry 3+ times
3. **Expected:**
   - "Reconnecting (N/10)" counter
   - "Back to Menu" button appears after 3 attempts

## Configuration

### Timeouts
```javascript
// Connection timeout (5 seconds)
const CONNECTION_TIMEOUT = 5000;

// Auto-reconnect threshold (5 seconds)
const AUTO_RECONNECT_THRESHOLD = 5000;

// Max reconnect attempts
const MAX_RECONNECT_ATTEMPTS = 10;
```

### Customization

To change timeout values, edit `gameStore.js`:

```javascript
// In connectWebSocket()
const connectionTimeoutId = setTimeout(() => {
  // ... timeout logic
}, 5000); // Change this value

// In ws.onclose()
if (reconnectDelay <= 5000) { // Change this threshold
  // Auto-reconnect
}
```

## Error Messages Reference

| Scenario | Error Message | Action |
|----------|--------------|--------|
| Connection timeout | "Connection timeout. The server may be down or unreachable." | Show retry button |
| WebSocket error | "Failed to connect to server. Please check your connection." | Show retry button |
| Server close 1006 | "Connection lost" | Auto-reconnect or retry |
| Server close 1011 | "Server error" | Auto-reconnect or retry |
| Max attempts | "Failed to reconnect after 10 attempts. Please refresh the page." | No retry, suggest refresh |
| Manual retry needed | "Connection lost. Please retry manually." | Show retry button |

## Browser Console Logs

**Connection Lifecycle:**
```
🔌 Attempting WebSocket connection...
   URL: ws://localhost:8080/ws?session=...
   Session: SESSION_ID
   Player: PlayerName (avatar: 1)
   Spectator: false

✅ WebSocket connected successfully
   Ready state: 1
```

**Timeout:**
```
⏱️ Connection timeout after 5 seconds
```

**Error:**
```
❌ WebSocket error occurred: Error: ...
   Ready state: 3
   URL attempted: ws://localhost:8080/ws?session=...
```

**Disconnection:**
```
🔌 WebSocket disconnected
   Code: 1006
   Reason: Connection lost
   Clean: false

🔄 Attempting to reconnect... (attempt 1/10)
   Waiting 1 seconds before retry...
```

**Manual Retry Required:**
```
⏸️ Waiting for manual retry (delay would be 8s)
```

## Troubleshooting

### Issue: Timeout occurs but server is running

**Cause:** CORS or network configuration issue

**Solution:**
1. Check browser console for CORS errors
2. Verify server is accessible: `curl http://localhost:8080/api/list`
3. Check firewall settings
4. Verify WebSocket upgrade succeeds

### Issue: Retry button doesn't appear

**Cause:** Timeout not triggering properly

**Debug:**
```javascript
// In browser console
useGameStore.getState().connectionError // Should show error
useGameStore.getState().isConnecting // Should be false
useGameStore.getState().connected // Should be false
```

### Issue: Auto-reconnect happens too many times

**Cause:** Delay calculation might be wrong

**Debug:**
```javascript
// In browser console
const status = useGameStore.getState().getReconnectionStatus();
console.log(status);
// {
//   isReconnecting: true/false,
//   reconnectAttempts: N,
//   reconnectDelay: Xms,
//   canRetry: true/false
// }
```

### Issue: "Back to Menu" doesn't work

**Cause:** State not properly reset

**Solution:**
- The button calls `setInGame(false)` and `setGameMode(null)`
- This should return to mode selection screen
- If stuck, refresh the page

## Performance Considerations

### Timeout Cleanup
- All timeouts are properly cleared on unmount
- `connectionTimeoutId` cleared on success or failure
- `reconnectTimeoutId` cleared when cancelled

### Memory Leaks Prevention
- WebSocket connections closed before creating new ones
- Event listeners removed on cleanup
- Timers cancelled before component unmount

### Network Impact
- Only one connection attempt at a time
- Exponential backoff reduces server load
- Max 10 reconnection attempts prevents infinite loops

## Future Improvements

1. **Configurable Timeouts**
   - Allow users to set timeout duration
   - Environment variable for default timeout

2. **Connection Quality Indicator**
   - Show latency/ping time
   - Indicate weak connection before failure

3. **Offline Detection**
   - Use `navigator.onLine` API
   - Don't attempt connection if offline

4. **Persistent Error Log**
   - Save connection errors to localStorage
   - Help with debugging recurring issues

5. **Retry Strategy Selection**
   - Let users choose: aggressive vs conservative retry
   - Power users can set custom backoff parameters

## Related Documentation

- [RECONNECTION.md](./RECONNECTION.md) - Original reconnection implementation
- [RECONNECTION_QUICK_REFERENCE.md](./RECONNECTION_QUICK_REFERENCE.md) - Quick reference guide
- [WEBSOCKET_FIX.md](./WEBSOCKET_FIX.md) - WebSocket concurrency fixes

## Conclusion

The connection retry system provides:
- ✅ 5-second timeout for all connection attempts
- ✅ Clear error messages from server and client
- ✅ Manual retry button when needed
- ✅ Smart auto-reconnect for short delays only
- ✅ Graceful handling of server down scenarios
- ✅ User-friendly UI with error states
- ✅ "Back to Menu" option after multiple failures

Users no longer experience infinite "Connecting..." states and have clear options to resolve connection issues.
