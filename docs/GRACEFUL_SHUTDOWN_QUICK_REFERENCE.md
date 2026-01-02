# Graceful Shutdown - Quick Reference

## TL;DR
Server now properly handles Ctrl+C and kill signals. Just press Ctrl+C to stop the server cleanly.

## Usage

### Stop Server
```bash
# Press Ctrl+C in the terminal where server is running
# OR send SIGTERM/SIGINT
kill -TERM <pid>
kill -INT <pid>
```

### What Happens
1. Signal received (SIGINT, SIGTERM, or os.Interrupt)
2. All game sessions closed
3. WebSocket close frames sent to all clients
4. HTTP server stops accepting new connections
5. In-flight requests complete (up to 10s timeout)
6. Server exits cleanly

### Verify Implementation
```bash
./verify-graceful-shutdown.sh
```

## Testing

### Run Shutdown Tests
```bash
go test -v ./internal/server -run "Shutdown"
```

### Manual Test
```bash
# Terminal 1: Start server
go run cmd/server/main.go

# Terminal 2: Verify running
curl http://localhost:8080/api/list

# Terminal 1: Press Ctrl+C
# Should see clean shutdown logs
```

## Implementation Files

| File | Purpose |
|------|---------|
| [cmd/server/main.go](cmd/server/main.go) | Signal handler, shutdown coordinator |
| [internal/server/server.go](internal/server/server.go) | `GameServer.Shutdown()` |
| [internal/session/session.go](internal/session/session.go) | `GameSession.Close()` |
| [internal/server/shutdown_test.go](internal/server/shutdown_test.go) | Test suite |
| [docs/GRACEFUL_SHUTDOWN.md](docs/GRACEFUL_SHUTDOWN.md) | Full documentation |

## Configuration

| Setting | Value | Location |
|---------|-------|----------|
| Shutdown timeout | 10 seconds | `cmd/server/main.go` |
| WebSocket close timeout | 5 seconds | `internal/session/session.go` |
| Close code | 1000 (Normal) | `websocket.CloseNormalClosure` |

## Signals Handled

- `SIGINT` - Ctrl+C
- `SIGTERM` - Kill command, Docker stop, systemd stop
- `os.Interrupt` - OS-specific interrupt

## Logs

Typical shutdown sequence:
```
INFO  Shutdown signal received  {"signal": "interrupt"}
INFO  Shutting down game sessions...
INFO  Starting graceful shutdown of game server
INFO  Closing game session {"sessionID": "...", "players": 2}
INFO  Game server shutdown complete
INFO  Shutting down HTTP server...
INFO  Server shutdown complete
```

## Production

Works out of the box with:
- ✅ Docker (`docker stop`)
- ✅ Kubernetes (pod termination)
- ✅ systemd (`systemctl stop`)
- ✅ Manual kill signals

## Force Kill (If Needed)

If graceful shutdown hangs:
```bash
# Find process
lsof -ti :8080

# Force kill
lsof -ti :8080 | xargs kill -9
```

## Tests Coverage

5 automated tests:
1. ✅ Empty server shutdown
2. ✅ Shutdown with multiple sessions
3. ✅ Shutdown with active connections
4. ✅ Session cleanup verification
5. ✅ HTTP server graceful stop

Run: `go test -v ./internal/server -run "Shutdown"`

## Troubleshooting

### Server doesn't stop
- Wait 10 seconds for timeout
- Check logs for errors
- Use force kill as last resort

### Tests failing
- Ensure MongoDB is not required
- Check no other process on port 8080
- Run `go test -v` for details

### WebSocket clients not disconnecting
- Clients should detect close frame
- Check client-side error handling
- Verify WebSocket close code (1000)

## Related Features

- **Reconnection**: Clients can reconnect after shutdown - see [RECONNECTION.md](../RECONNECTION.md)
- **Concurrency**: Thread-safe shutdown - see [WEBSOCKET_CONCURRENCY_FIX.md](../WEBSOCKET_CONCURRENCY_FIX.md)
- **Error Handling**: Proper error propagation - see [WEBSOCKET_ERROR_HANDLING_COMPLETE.md](../WEBSOCKET_ERROR_HANDLING_COMPLETE.md)
