# Century: Golem Edition - Event-Sourced Game Server

A production-ready, event-sourced WebSocket game server for Century: Golem Edition, built with Go, MongoDB, and Redis.

## Features

✅ **Event-Sourced Architecture** - All game actions are persisted as domain events  
✅ **Real-time WebSocket Communication** - Bidirectional, low-latency game updates  
✅ **Event Replay & Auditing** - Reconstruct game state from event history  
✅ **Client Reconnection** - Automatic catch-up with missed events  
✅ **Distributed Ready** - Redis Pub/Sub for multi-instance scaling  
✅ **MongoDB Persistence** - Durable event storage with idempotent writes  
✅ **Comprehensive Tests** - Unit and integration tests included  
✅ **Docker Compose** - One-command local development setup  

## Architecture

### Event Model

The system implements a complete event-sourcing pattern:

**Client → Server Events (Commands):**
- `PlayCardRequested` - Player wants to play a card
- `AcquireRequested` - Player wants to acquire a merchant card
- `RestRequested` - Player wants to rest (return cards)
- `ClaimRequested` - Player wants to claim a point card
- `EndTurnRequested` - Player ends their turn

**Server Internal Events:**
- `CardPlayed` - Card was successfully played
- `ItemAcquired` - Item was successfully acquired
- `PlayerRested` - Player rested successfully
- `ClaimCompleted` - Point card claimed
- `TurnEnded` - Turn ended and advanced

**Server → Client Events:**
- `GameStateUpdated` - Full game state snapshot
- `PlayerJoined` - New player joined the game
- `PlayerLeft` - Player disconnected

### Tech Stack

- **Language:** Go 1.24+
- **WebSocket:** Gorilla WebSocket
- **Event Store:** MongoDB 7
- **Pub/Sub:** Redis 7
- **Containerization:** Docker & Docker Compose

## Quick Start

### Prerequisites

- Go 1.24+
- Docker & Docker Compose
- Make (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/vietky/golem.git
cd golem
```

2. **Install Go dependencies**
```bash
go mod tidy
```

3. **Create environment file**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start services with Docker Compose**
```bash
docker compose up -d
```

This starts:
- MongoDB (port 27017)
- Redis (port 6379)
- Game Server (port 8080)

### Running Locally (Development)

If you want to run the server outside Docker:

```bash
# Start MongoDB and Redis
docker compose up -d mongodb redis

# Build and run the server
make build
MONGO_URI=mongodb://localhost:27017 REDIS_ADDR=localhost:6379 ./bin/server
```

## API Documentation

### REST Endpoints

#### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "time": "2025-12-03T23:47:47+07:00"
}
```

#### Create Game
```http
POST /api/games
Content-Type: application/json

{
  "gameId": "game-123",
  "numPlayers": 2,
  "seed": 12345
}
```

Response:
```json
{
  "success": true,
  "gameId": "game-123",
  "message": "Game created successfully"
}
```

#### Get Game State
```http
GET /api/games/{gameId}
```

Response:
```json
{
  "success": true,
  "gameId": "game-123",
  "state": {
    "Players": [...],
    "Market": {...},
    "CurrentTurn": 0,
    "Round": 1,
    "GameOver": false
  }
}
```

### WebSocket API

#### Connect
```
ws://localhost:8080/ws?gameId=game-123&playerId=1&lastEventId=0
```

Query Parameters:
- `gameId` (required) - The game session ID
- `playerId` (optional) - Player ID (auto-assigned if not provided)
- `lastEventId` (optional) - Last event ID seen (for reconnection)

## Testing

```bash
# Run all tests
make test

# Run unit tests only (no DB required)
make test-unit

# Run integration tests (requires MongoDB and Redis)
make test-integration
```

## Makefile Commands

```bash
make help           # Show all available commands
make build          # Build the Go binary
make run            # Run the server locally
make up             # Start all services with Docker Compose
make down           # Stop all services
make logs           # View container logs
make test           # Run all tests
make mongo-shell    # Open MongoDB shell
make redis-cli      # Open Redis CLI
```

## Configuration

See `.env.example` for all configuration options.

## Deployment

### Docker Compose (Production)

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f golem-century
```

## Project Structure

```
golem/
├── cmd/server/main_new.go        # Server entry point
├── internal/
│   ├── config/                   # Configuration management
│   ├── events/                   # Event sourcing core
│   │   ├── mongodb/              # MongoDB event store
│   │   └── redis/                # Redis pub/sub
│   ├── game/                     # Game logic
│   └── websocket/                # WebSocket handlers
├── docker-compose.yml            # Docker Compose configuration
├── Makefile                      # Build commands
└── .env.example                  # Example environment file
```

## License

MIT License - See LICENSE file for details
