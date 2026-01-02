# Century: Golem Edition - AI Agent Guide

## Project Overview
Multiplayer turn-based card game inspired by Century: Golem Edition. Go backend with React frontend, WebSocket-based real-time gameplay, MongoDB event sourcing, and AI opponent support.

## Architecture

### Core Components
- **`internal/game/`**: Pure game logic (engine, rules, cards, resources). No I/O, fully testable
- **`internal/session/`**: WebSocket session management, player/spectator connections, turn timers
- **`internal/server/`**: HTTP handlers, WebSocket upgrade, CORS, admin API
- **`internal/eventstore/`**: Event sourcing with MongoDB for game replay/state reconstruction
- **`cmd/server/main.go`**: Entry point - initializes logger, config, event store, server

### Key Architectural Patterns
1. **Event Sourcing**: All game actions stored as events in MongoDB (`eventstore.StoreEvent`). Snapshots created periodically for performance
2. **Channel-based Concurrency**: Each GameSession has `ActionChan` (player actions) and `BroadcastChan` (state updates). See `session.go` worker goroutines
3. **Player vs Client ID**: Players have in-game IDs (1-indexed), clients have unique device IDs. Mapping in `session.connectedPlayers` and `session.assignedPlayers`
4. **Spectator Support**: Spectators receive game state but cannot send actions. Tracked separately in `session.spectators`

## Development Workflows

### Running Locally
```bash
# Backend only (requires MongoDB on localhost:27017)
go run cmd/server/main.go

# With custom turn timeout (for testing)
DEFAULT_TURN_TIMEOUT_SECONDS=3 go run ./cmd/server/main.go

# Full stack with Docker
docker-compose up -d

# Frontend dev server
cd web/react-frontend && npm run dev
```

### Testing
```bash
make test              # All tests
make test-unit         # Unit tests only
make test-integration  # Integration tests (requires MongoDB)
go test -v ./internal/game/...  # Game logic only
```

### Building
```bash
make be-release        # Backend binary to bin/server
cd web/react-frontend && npm run build  # Frontend to web/react/
```

## Project-Specific Conventions

### Game Logic Isolation
- **NEVER** mix I/O (WebSocket, HTTP, DB) with `internal/game/` package
- Game state mutations happen ONLY through `GameState.ExecuteAction(action)`
- Engine runs pure AI simulations (`engine.Run()`) - used for testing/validation

### Resource Management
```go
// Resources are simple structs with counts per color
type Resources struct {
    Yellow, Green, Blue, Pink int
}
// Capacity check: player.Resources.Total() <= 10 after action
```

### WebSocket Message Protocol
Messages are JSON with `type` field:
- `game_state`: Full state broadcast (players, market, resources)
- `action`: Player action (PlayCard, AcquireCard, ClaimPointCard, Rest, Discard)
- `player_joined`: Notification when player/spectator joins
- `chat`: Chat message (max 10 by default, see `Config.MaxChatMessages`)
- `error`: Error response to client

### Turn Timer System
- Configured via `DEFAULT_TURN_TIMEOUT_SECONDS` env var (default 60s)
- `session.TurnStartTime` tracks current turn start
- Timer goroutine in `session.StartGame()` broadcasts `turn_timeout` when exceeded
- Frontend shows countdown based on `turnStartTime` field in game state

### Event Store Usage
```go
// Store action events
session.EventStore.StoreEvent(StoreEventRequest{
    GameID: sessionID,
    EventType: "action",
    EventData: actionJSON,
})

// Retrieve for replay/admin
events := eventStore.GetEvents(GetEventsRequest{GameID: id})
```

## Frontend Integration Points

### WebSocket Connection
```javascript
// Players connect with client_id for reconnection
ws://localhost:8080/ws?session=SESSION_ID&name=NAME&avatar=1&client_id=UUID

// Spectators add spectate=true
ws://localhost:8080/ws?session=SESSION_ID&name=NAME&spectate=true
```

### State Management (Zustand)
- `web/react-frontend/src/store/gameStore.js`: Centralized state
- `playerID` determines which player is "you" vs opponents
- `isSpectator` flag disables action buttons

### Card System
- Cards defined in `internal/game/cards.go` (CreateDefaultActionCards, CreateDefaultPointCards)
- Frontend renders from server state, not local definitions
- Card images: `web/static/images/cards/` (served at `/static/images/`)

## Common Pitfalls

1. **Player ID Off-by-One**: Game uses 1-indexed player IDs, arrays are 0-indexed. Use `playerID - 1` for array access
2. **Event Store Optional**: Server starts even if MongoDB fails (logs warning). Check `eventStore != nil` before use
3. **CORS**: `upgrader.CheckOrigin` returns true for all origins in development. Restrict in production
4. **Goroutine Leaks**: Every session spawns worker goroutines. Ensure `session.Close()` is called on cleanup
5. **Frontend Build Path**: Server serves from `web/react/` (Vite build output), NOT `web/react-frontend/dist/`

## Configuration

All config via environment variables (see `internal/config/config.go`):
- `MONGO_URI`, `MONGO_DB`: Event store connection (optional, fallback to in-memory)
- `DEFAULT_TURN_TIMEOUT_SECONDS`: Turn timer duration
- `MAX_CHAT_MESSAGES`: Chat history limit per session
- `SERVER_PORT`: Default 8080

## Admin/Debug Tools

```bash
# List active sessions
curl http://localhost:8080/api/list | jq

# Get event history for session
curl "http://localhost:8080/api/events?gameId=SESSION_ID" | jq

# Get session state
curl "http://localhost:8080/admin/sessions/state?sessionID=SESSION_ID" | jq
```

## AI Opponent

- Implemented in `internal/game/ai.go` as `AIStrategy` interface
- Single-player mode creates AI player at session creation
- AI runs synchronously in action processing (no separate goroutine)
- Decisions based on simple heuristics (prioritize point cards, resource building)

## Deployment

Uses Ansible for deployment to remote servers:
```bash
make deploy  # Generates inventory from .env, creates archive, deploys via Ansible
```

Docker images: `Dockerfile` (backend), `Dockerfile.fe` (frontend-only). Production uses single image serving both.

## File Naming Conventions

- Tests: `*_test.go` (standard Go convention)
- Integration tests: `*_integration_test.go` (require external dependencies)
- Documentation: Uppercase markdown files in root/subdirs (`SPECTATE_MODE.md`, `WEBSOCKET_FIX.md`)


## Testing Strategies
- always apply SOLID principles in game logic for easy unit testing
- tests include normal cases, edge cases, and error handling
- always test and verify after refactoring or adding features yourself

## Coding Standards
- use logger both on backend and frontend for debugging and monitoring
- include context in backend logs for traceability

## UI/UX Guidelines 
- for frontend, mobile responsiveness is a must
- ensure accessibility standards are met in UI components
- Performance Optimization
- frontend: lazy load assets, optimize rendering with React best practices
- backend: efficient DB queries, minimize blocking operations
- Security Best Practices
- sanitize and validate all user inputs on backend
- minimize data transferred over network, use HTTPS in production
