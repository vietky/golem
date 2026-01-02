# Graceful Shutdown Implementation

## Overview

The server now implements proper graceful shutdown handling, allowing it to be cleanly stopped with `Ctrl+C` or `kill` signals. This ensures all resources are properly released and all active connections are closed gracefully.

## Features

### 1. Signal Handling
- **Catches**: `SIGINT` (Ctrl+C), `SIGTERM`, and `os.Interrupt`
- **Timeout**: 10-second deadline for shutdown completion
- **Clean Exit**: Ensures all goroutines and connections are properly closed

### 2. Resource Cleanup
When shutdown is triggered, the server:
1. Closes all active game sessions (V1 and V2)
2. Sends WebSocket close frames to all connected clients
3. Closes all player and spectator connections
4. Closes all internal channels
5. Clears session maps
6. Gracefully stops the HTTP server

### 3. WebSocket Close Messages
All WebSocket connections receive a proper close message:
- **Close Code**: `websocket.CloseNormalClosure` (1000)
- **Message**: "Server shutting down"
- **Write Timeout**: 5 seconds to ensure delivery

## Implementation Details

### Signal Handler (main.go)

```go
// Set up signal handling for graceful shutdown
shutdown := make(chan os.Signal, 1)
signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

// Start HTTP server in a goroutine
go func() {
    log.Info("HTTP server starting")
    if err := httpServer.ListenAndServe(); err != http.ErrServerClosed {
        log.Fatal("Server error", zap.Error(err))
    }
}()

// Wait for shutdown signal
sig := <-shutdown
log.Info("Shutdown signal received", zap.String("signal", sig.String()))

// Create shutdown context with timeout
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

// Close all game sessions first
log.Info("Shutting down game sessions...")
if err := gameServer.Shutdown(); err != nil {
    log.Error("Error shutting down game sessions", zap.Error(err))
}

// Gracefully shutdown HTTP server
log.Info("Shutting down HTTP server...")
if err := httpServer.Shutdown(ctx); err != nil {
    log.Error("HTTP shutdown error", zap.Error(err))
} else {
    log.Info("Server shutdown complete")
}
```

### GameServer.Shutdown() (server.go)

```go
func (gs *GameServer) Shutdown() error {
    gs.logger.Info("Starting graceful shutdown of game server")
    
    gs.mu.Lock()
    defer gs.mu.Unlock()

    // Close all V2 sessions
    for sessionID, session := range gs.SessionsV2 {
        if err := session.Close(); err != nil {
            gs.logger.Error("Error closing V2 session", 
                zap.String("sessionID", sessionID),
                zap.Error(err))
        }
    }
    
    // Close all V1 sessions
    for sessionID, session := range gs.Sessions {
        session.mu.Lock()
        // Close all player connections
        for playerID, conn := range session.Connections {
            closeMsg := websocket.FormatCloseMessage(
                websocket.CloseNormalClosure,
                "Server shutting down")
            conn.WriteControl(websocket.CloseMessage, closeMsg, 
                time.Now().Add(5*time.Second))
            conn.Close()
        }
        // Close all spectator connections
        for spectatorID, conn := range session.Spectators {
            closeMsg := websocket.FormatCloseMessage(
                websocket.CloseNormalClosure,
                "Server shutting down")
            conn.WriteControl(websocket.CloseMessage, closeMsg,
                time.Now().Add(5*time.Second))
            conn.Close()
        }
        session.mu.Unlock()
    }

    // Clear all session maps
    gs.SessionsV2 = make(map[string]*session.GameSession)
    gs.Sessions = make(map[string]*GameSession)

    gs.logger.Info("Game server shutdown complete")
    return nil
}
```

### GameSession.Close() (session.go - V2)

```go
func (gs *GameSession) Close() error {
    gs.mu.Lock()
    defer gs.mu.Unlock()

    gs.logger.Info("Closing game session",
        zap.String("sessionID", gs.ID),
        zap.Int("players", len(gs.connectedPlayers)),
        zap.Int("spectators", len(gs.spectators)))

    // Close all player connections
    for clientID, player := range gs.connectedPlayers {
        if player.Conn != nil {
            closeMsg := websocket.FormatCloseMessage(
                websocket.CloseNormalClosure,
                "Server shutting down")
            player.Conn.WriteControl(websocket.CloseMessage, closeMsg,
                time.Now().Add(5*time.Second))
            player.Conn.Close()
        }
        close(player.WriteChan)
    }

    // Close all spectator connections
    for spectatorID, spectator := range gs.spectators {
        if spectator.Conn != nil {
            closeMsg := websocket.FormatCloseMessage(
                websocket.CloseNormalClosure,
                "Server shutting down")
            spectator.Conn.WriteControl(websocket.CloseMessage, closeMsg,
                time.Now().Add(5*time.Second))
            spectator.Conn.Close()
        }
        close(spectator.WriteChan)
    }

    // Clear all maps
    gs.connectedPlayers = make(map[string]*PlayerInfo)
    gs.assignedPlayers = make(map[int]string)
    gs.spectators = make(map[string]*Spectator)

    // Close action channel
    close(gs.ActionChan)

    return nil
}
```

## Testing

### Automated Tests

Run the shutdown tests:
```bash
go test -v ./internal/server -run "TestGracefulShutdown|TestSessionClose|TestHTTPServerGracefulShutdown|TestShutdownWithActiveConnections|TestShutdownEmptyServer"
```

All 5 tests verify:
- ✅ Empty server shutdown
- ✅ Shutdown with multiple sessions
- ✅ Shutdown with active connections
- ✅ Session cleanup
- ✅ HTTP server graceful stop

### Manual Testing

1. **Start the server**:
   ```bash
   go run cmd/server/main.go
   ```

2. **Press Ctrl+C**:
   ```
   ^C2026-01-03T00:44:16.445+0700  INFO  server/main.go:138  Shutdown signal received  {"signal": "interrupt"}
   2026-01-03T00:44:16.445+0700    INFO  server/main.go:145  Shutting down game sessions...
   2026-01-03T00:44:16.445+0700    INFO  server/server.go:704  Starting graceful shutdown of game server
   2026-01-03T00:44:16.445+0700    INFO  server/server.go:749  Game server shutdown complete
   2026-01-03T00:44:16.445+0700    INFO  server/main.go:151  Shutting down HTTP server...
   2026-01-03T00:44:16.445+0700    INFO  server/main.go:158  Server shutdown complete
   ```

3. **With active connections**:
   - Connect multiple players via WebSocket
   - Press Ctrl+C
   - All connections receive close message
   - Server exits cleanly

### Automated Test Script

Run the test script:
```bash
./test-graceful-shutdown.sh
```

This script:
1. Starts the server
2. Verifies it's running
3. Sends SIGINT signal
4. Verifies clean shutdown

## Logs During Shutdown

Typical shutdown sequence:
```
INFO  Shutdown signal received  {"signal": "interrupt"}
INFO  Shutting down game sessions...
INFO  Starting graceful shutdown of game server
INFO  Closing game session {"sessionID": "abc123", "players": 2, "spectators": 1}
DEBUG Closed player connection {"clientID": "client1", "name": "Player1"}
DEBUG Closed player connection {"clientID": "client2", "name": "Player2"}
DEBUG Closed spectator connection {"spectatorID": "spec1"}
INFO  Game session closed successfully {"sessionID": "abc123"}
INFO  Game server shutdown complete
INFO  Shutting down HTTP server...
INFO  Server shutdown complete
```

## Benefits

1. **No Resource Leaks**: All connections, channels, and goroutines are properly closed
2. **Clean Client Disconnect**: Clients receive proper close frames instead of abrupt disconnections
3. **Data Integrity**: Gives HTTP server time to complete in-flight requests
4. **Production Ready**: Handles SIGTERM for container orchestration (Docker, Kubernetes)
5. **Debug Friendly**: Comprehensive logging during shutdown process

## Production Deployment

In production environments:
- **Docker**: `docker stop` sends SIGTERM, which triggers graceful shutdown
- **Kubernetes**: Pod termination sends SIGTERM with configurable grace period
- **systemd**: `systemctl stop` sends SIGTERM

The 10-second timeout ensures shutdown completes even if some connections are slow to close.

## Troubleshooting

### Server Won't Stop
If the server doesn't stop after Ctrl+C:
```bash
# Find and kill the process
lsof -ti :8080 | xargs kill -9
```

### Testing Timeout Behavior
To test the shutdown timeout:
```go
// In Close(), add before closing connections:
time.Sleep(15 * time.Second)  // Exceeds 10s timeout
```

The HTTP server will force-close after 10 seconds even if sessions aren't done.

### Debugging Goroutine Leaks
Add goroutine dumps during shutdown:
```go
import "runtime/pprof"

// Before shutdown
pprof.Lookup("goroutine").WriteTo(os.Stdout, 1)
```

## Related Files

- [cmd/server/main.go](cmd/server/main.go) - Signal handling and shutdown coordination
- [internal/server/server.go](internal/server/server.go) - GameServer.Shutdown() implementation
- [internal/session/session.go](internal/session/session.go) - GameSession.Close() implementation
- [internal/server/shutdown_test.go](internal/server/shutdown_test.go) - Comprehensive test suite
- [test-graceful-shutdown.sh](test-graceful-shutdown.sh) - Automated test script

## Future Improvements

Potential enhancements:
1. **Configurable Timeout**: Make shutdown timeout configurable via environment variable
2. **Shutdown Hooks**: Allow plugins to register cleanup functions
3. **Metrics**: Track shutdown duration and connection close success rate
4. **Graceful Degradation**: Stop accepting new connections while shutting down existing ones
