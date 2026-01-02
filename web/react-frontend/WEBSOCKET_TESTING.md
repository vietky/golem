# WebSocket Connection Testing Guide

This guide explains how to test WebSocket connections without using a browser.

## Quick Test

Run the quick test script from the project root to verify WebSocket connectivity:

```bash
./test-websocket.sh
```

This automated script:
1. Checks if the backend server is running
2. Creates a single-player session
3. Opens a WebSocket connection
4. Verifies the connection works and receives game state
5. Closes gracefully
6. Shows a summary with next steps

## Manual Testing

Use the Node.js test script for interactive WebSocket testing:

```bash
cd web/react-frontend
node test-ws-connection.js [options]
```

### Options

- `--host <host>`: WebSocket host (default: `localhost:8080`)
- `--session <id>`: Session ID (default: auto-generated with timestamp)
- `--name <name>`: Player name (default: `TestPlayer`)
- `--avatar <id>`: Avatar ID (default: `1`)
- `--spectate`: Join as spectator instead of player
- `--v2`: Use the V2 WebSocket endpoint

### Examples

**Basic connection:**
```bash
node test-ws-connection.js
```

**Custom session and player:**
```bash
node test-ws-connection.js --session my_game_123 --name Alice --avatar 2
```

**Join as spectator:**
```bash
node test-ws-connection.js --session my_game_123 --name Observer --spectate
```

**Use V2 endpoint:**
```bash
node test-ws-connection.js --v2 --session test_v2
```

**Connect to remote server:**
```bash
node test-ws-connection.js --host game.example.com:8080
```

**Test backend directly (bypass Vite proxy):**
```bash
node test-ws-connection.js --host localhost:8080
```

> **Note**: In development, the frontend connects through the Vite proxy (port 3000), but you can test the backend WebSocket endpoint directly on port 8080 using the test script.

## Interactive Mode

Once connected, you can:

- Type any message and press Enter to send it as JSON
- Type `ping` to send a ping frame
- Type `close` to close the connection gracefully
- Press Ctrl+C to force close

## Error Handling

The script provides detailed error messages and troubleshooting steps:

### Common Errors

**ECONNREFUSED**: Backend server not running
```bash
# Solution: Start the backend server
make run-dev
```

**Session not found**: The specified session doesn't exist
```bash
# Solution: Create a new session or use auto-generated session ID
node test-ws-connection.js  # Uses auto-generated session
```

**Abnormal closure (code 1006)**: Server rejected the connection
```bash
# Check server logs for details
# Server may have rejected due to:
# - Invalid parameters
# - Session full
# - Internal error
```

## Server-Side Logging

The server now includes enhanced logging for WebSocket connections:

### Log Format

```
🔌 WebSocket connection attempt sessionID=... playerID=... remoteAddr=...
✅ WebSocket upgraded successfully
❌ WebSocket rejected: <reason>
```

### Viewing Logs

The server uses Info-level logging for WebSocket connections, so they appear in standard output.

**During development:**
```bash
make run-dev  # Logs appear in terminal
```

**Check log level:**
```bash
# Set LOG_LEVEL environment variable
export LOG_LEVEL=debug  # Show all debug logs
export LOG_LEVEL=info   # Show info and above (default)
```

## Client-Side Error Display

The client now shows detailed error messages:

### Browser Console

All connection attempts, errors, and close events are logged with emoji indicators:

```
🔌 Attempting WebSocket connection...
   Environment: DEV
   Host: localhost:3000
   WS URL: ws://localhost:3000/ws?...
✅ WebSocket opened successfully
❌ WebSocket error: Connection failed
```

### Toast Notifications

Users see friendly error messages:

- "WebSocket connection failed. Check console for details."
- "Connection closed: Normal closure"
- "Connection closed: Server error"

### Close Code Interpretation

The client interprets WebSocket close codes:

- **1000**: Normal closure - Everything OK
- **1001**: Going away - Server shutting down
- **1002**: Protocol error - Invalid WebSocket frame
- **1006**: Abnormal closure - Connection lost unexpectedly
- **1011**: Internal server error - Server encountered an error

## Troubleshooting

### Connection fails immediately

1. **Check if backend is running:**
   ```bash
   curl http://localhost:8080/health
   ```

2. **Check if port 8080 is in use:**
   ```bash
   lsof -i :8080
   ```

3. **Check firewall settings**

### Connection closes immediately after opening

1. **Check server logs** for rejection reason
2. **Verify session exists** (if using existing session)
3. **Check player/spectator limit** for the session

### Messages not received

1. **Check server is sending messages** (server logs)
2. **Verify message format** is valid JSON
3. **Check WebSocket ready state** before sending

### Development vs Production

**Development (Vite dev server):**
- Frontend: `http://localhost:3000`
- WebSocket connects through Vite proxy: `ws://localhost:3000/ws`
- Vite forwards to backend: `ws://localhost:8080/ws`

**Production:**
- Frontend and backend on same host
- WebSocket connects directly: `ws://yourhost/ws`

## Testing Checklist

- [ ] Backend server running on port 8080
- [ ] Quick test script passes: `./test-ws-quick.sh`
- [ ] Manual connection works: `node test-ws-connection.js`
- [ ] Server logs show connection attempts with emoji (🔌)
- [ ] Server logs show upgrade success (✅) or rejection (❌)
- [ ] Client shows error messages in console
- [ ] Client shows toast notifications for errors
- [ ] Connection closes gracefully with code 1000
- [ ] Error codes are interpreted correctly

## Implementation Details

### Client-Side (gameStore.js)

- Environment detection: `import.meta.env.DEV`
- Development mode: Uses `window.location.host` (Vite proxy)
- Production mode: Uses configured API host
- Comprehensive logging with emoji indicators
- Toast notifications for user feedback
- Close code interpretation

### Server-Side (handlers.go)

- Info-level logging for all connection attempts
- Detailed context: sessionID, playerID, remoteAddr, userAgent
- Clear success/failure indicators with emoji
- Error messages sent to client before closing
- Proper error status codes (400, 404, 500)

### Test Script (test-ws-connection.js)

- Built on standard 'ws' library (already in dependencies)
- Interactive mode for manual testing
- Automatic ping/pong handling
- Graceful shutdown on Ctrl+C
- Detailed error messages with troubleshooting steps
- Close code interpretation

## Additional Resources

- [WebSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [ws Library Documentation](https://github.com/websockets/ws)
- [WebSocket Close Codes](https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1)
