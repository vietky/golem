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

### Component Organization
- **`components/mobile/`**: Mobile-specific components (< 768px width)
  - `CompactGameBoard.jsx`: Main game board for mobile with waiting mode support
  - `CompactPlayerHand.jsx`: Player hand display optimized for mobile
  - `MobileNavBar.jsx`: Navigation bar for mobile portrait mode
  - `MobileHistoryButton.jsx`: History/chat button for mobile
- **`components/desktop/`**: Desktop/tablet components (≥ 768px width)
  - `WebGameLayout.jsx`: Main game layout for desktop with grid-based design
  - `FantasyGameLayout.jsx`: Fantasy-themed layout variant
- **`components/`**: Shared components used by both mobile and desktop
  - `CompactCard.jsx`, `PlayerCard.jsx`, `DepositModal.jsx`, etc.

**IMPORTANT**: When making UI changes, you MUST update BOTH mobile and desktop versions:
- Mobile waiting mode: `components/mobile/CompactGameBoard.jsx`
- Desktop waiting mode: `components/desktop/WebGameLayout.jsx`
- The app switches layouts at 768px breakpoint (controlled in `SinglePlayerApp.jsx`)
- Always test UI changes on both mobile (< 768px) and desktop (≥ 768px) viewports

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

### Kubernetes (k3s) Deployment

The application is deployed on k3s with the following architecture:

#### Namespace Organization
- **Single namespace**: All components (MongoDB, Redis, Application) are in the `golem` namespace
- This simplifies management and RBAC policies

#### Ingress Controller
- **NGINX Ingress Controller** is used for:
  - HTTP/HTTPS routing
  - SSL termination with cert-manager
  - WebSocket support
  - Path-based routing for API endpoints
- Install with: `make k3s-install-ingress`

#### Git-Based Deployment
- Source code is NOT copied during deployment
- Server must have git repository at `/opt/jenkins/repos/golem`
- Deployment pulls latest code from this repository
- Setup: `git clone <your-repo-url> /opt/jenkins/repos/golem`

#### Deployment Commands
```bash
# Setup (one-time)
make k3s-setup-registry      # Setup local Docker registry
make k3s-install-ingress     # Install NGINX Ingress Controller

# Deploy
make k3s-deploy              # Build and deploy backend from git repo
make k3s-frontend-test       # Deploy frontend to test environment
make k3s-frontend-prod       # Deploy frontend to production

# Monitoring
make k3s-status              # Check all resources in golem namespace
make k3s-logs                # View application logs
make k3s-logs-db             # View MongoDB logs
make k3s-logs-cache          # View Redis logs
```

#### Access URLs
- **Backend API**: https://game.anhtran.dev/api/golem (via Ingress)
- **WebSocket**: wss://game.anhtran.dev/ws (via Ingress)
- **Frontend (test)**: https://game.anhtran.dev/golem-test
- **Frontend (prod)**: https://game.anhtran.dev/golem

Uses Ansible for deployment to remote servers. Docker images: `Dockerfile` (backend), `Dockerfile.fe` (frontend-only). Production uses single image serving both.

## File Naming Conventions

- Tests: `*_test.go` (standard Go convention)
- Integration tests: `*_integration_test.go` (require external dependencies)
- Documentation: Uppercase markdown files in root/subdirs (`SPECTATE_MODE.md`, `WEBSOCKET_FIX.md`)

## Deployment Topology
- Support docker compose for local development and k3s for production deployment
- Use environment variables for configuration management
- Separate services for backend, frontend, and database for scalability
- Implement health checks and monitoring for all services
- Observability: centralized tracing, logging and metrics collection for performance tracking and debugging
- Use CI/CD pipelines for automated testing and deployment
- All credentials are put temporarily in user local `secrets/` folder which is gitignored, and mounted as Kubernetes configmaps and secrets in production
- Ansible playbooks should detect changes in secrets and redeploy the affected services automatically. If there is no secret folder, ansible should skip the secret deployment step
- All Kubernetes deployment charts are in `deployment/` folder
- There should be clear separation between staging, and production environments with different configurations and resource allocations
  - staging: golem-staging namespace
  - production: golem namespace
- **Single Namespace**: All components (MongoDB, Redis, Application) belong to the `golem` namespace for simplified management
- Use local docker registry on k3s server (localhost:5000) to speed up image pulling during deployment
- **NGINX Ingress Controller** is used for routing and SSL termination in production (later, might migrate to Gateway API when it matures)
- **Git-based deployment**: Source code is NOT copied to server during deployment. Instead, git repository at `/opt/jenkins/repos/golem` is used to pull latest code, saving bandwidth and time

## Coding Standards
- use logger both on backend and frontend for debugging and monitoring
- include context in backend logs for traceability
- log every significant event (player joins, game starts, errors, etc.) with appropriate log levels
- make sure all code (frontend and backend) is compiled without warnings or errors
- all sh files are located in `/scripts/` directory for consistency
- all markdown documentation files are located in `/docs/` directory
- only README.md are allowed in the root directory
- when writing integration tests, set a reasonable timeout (5-10 seconds) to avoid hanging tests, automatically fail tests that exceed the timeout limit
- when fixing bugs, add regression tests to prevent future occurrences of the same issues
- all secrets (API keys, tokens, credentials) must be stored in environment variables or secure vaults, never hard-coded in the source code or committed to version control
- folder secrets/ is added to .gitignore for storing sensitive files like Firebase service account JSON and .env files
- use snake case for json response fields and camel case for Go struct fields
- NEVER hard-code any configuration values, always use environment variables or config files

## UI/UX Guidelines 
- for frontend, mobile responsiveness is a must
- ensure accessibility standards are met in UI components
- Performance Optimization
- frontend: lazy load assets, optimize rendering with React best practices
- backend: efficient DB queries, minimize blocking operations
- Security Best Practices
- sanitize and validate all user inputs on backend
- minimize data transferred over network, use HTTPS in production

## Non-Functional Requirements
- Scalability: design backend to handle increasing number of concurrent sessions and players
- Maintainability: write clean, modular code with proper documentation for easy future enhancements (both frontend and backend) - follow SOLID principles
- Reliability: implement error handling and recovery mechanisms to ensure smooth gameplay experience
- Usability: design intuitive UI/UX for players and spectators, conduct user testing to gather feedback and improve the interface
- Performance: optimize both frontend and backend for low latency and fast response times during gameplay
- Testability: ensure code is easily testable with unit and integration tests, maintain high test coverage
- Extensibility: design system to easily accommodate new features, game modes, and AI strategies in the future
- Documentation: maintain comprehensive documentation for developers and users, including API references, setup guides, and gameplay instructions
- Security: implement robust security measures to protect user data and prevent cheating or exploits in the game
- Follow IaC best practices for deployment and infrastructure management

## Testing Strategies
- always apply SOLID principles in game logic for easy unit testing
- tests include normal cases, edge cases, and error handling
- only stop when all the issues are fixed and tests pass successfully
- always test and verify after making any changes until the requirements are fully met
