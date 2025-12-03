# Golem Century - Event-Sourced WebSocket Game Server

A production-ready, event-sourced WebSocket server implementation for Century: Golem Edition card game, built with Go, MongoDB, and Redis.

## 🎯 Features

- **Event-Sourced Architecture**: All game actions are persisted as events with full replay capability
- **Real-time WebSocket Communication**: Multiplayer game sessions with live updates
- **Client Reconnection**: Automatic event replay from last known state
- **Distributed-Ready**: Redis Pub/Sub for multi-instance scalability
- **Persistent Event Store**: MongoDB for durable event storage
- **SOLID Principles**: Clean architecture with clear interfaces and separation of concerns
- **Comprehensive Testing**: Unit tests, integration tests, and event replay tests

## 📋 Requirements

- Go 1.21+
- Docker & Docker Compose
- MongoDB 7.0+
- Redis 7.0+

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/vietky/golem.git
cd golem
cp .env.example .env
```

### 2. Start Services

```bash
# Start all services (MongoDB, Redis, Game Server)
make up

# View logs
make logs

# Check status
make status
```

### 3. Create a Game

```bash
curl -X POST http://localhost:3001/api/games \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "game-123",
    "numPlayers": 2,
    "seed": 12345
  }'
```

### 4. Connect via WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3001/ws?gameId=game-123&playerId=1');

ws.onopen = () => {
  console.log('Connected!');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Play a card
ws.send(JSON.stringify({
  type: 'playCard',
  data: { cardIndex: 0 }
}));
```

## 🏗️ Architecture

### Event-Sourced Design

The system uses event sourcing where every action is stored as an immutable event:

```
Client Request → Event Store → Game Engine → State Update → Broadcast
                      ↓
                 Event Log (MongoDB)
                      ↓
                Event Replay Capability
```

### Event Types

**Client → Server (Requests):**
- `PlayCardRequested`
- `AcquireRequested`
- `RestRequested`
- `ClaimRequested`
- `EndTurnRequested`

**Server Internal:**
- `CardPlayed`
- `ItemAcquired`
- `PlayerRested`
- `ClaimCompleted`
- `TurnEnded`

**Server → Client:**
- `GameStateUpdated`

### Directory Structure

```
golem/
├── cmd/
│   └── server/
│       └── main_new.go          # Main server entry point
├── internal/
│   ├── config/                  # Configuration management
│   ├── events/                  # Event types and interfaces
│   │   ├── mongodb/            # MongoDB event store implementation
│   │   └── redis/              # Redis pub/sub implementation
│   ├── game/                    # Game logic and rules
│   └── websocket/               # WebSocket hub and handlers
├── docker-compose.yml           # Docker services configuration
├── Makefile                     # Build and deployment commands
└── .env.example                 # Environment variables template
```

## 🔧 Configuration

Configuration is managed via environment variables (`.env` file):

```bash
# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8080

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017
MONGO_DB=golem_game

# Redis Configuration
REDIS_ADDR=localhost:6379
REDIS_DB=0

# Game Configuration
MAX_PLAYERS=5
CARAVAN_CAPACITY=10
POINT_CARDS_TO_WIN=5
```

## 🧪 Testing

```bash
# Run all tests
make test

# Run unit tests only
make test-unit

# Run integration tests (requires MongoDB and Redis)
make test-integration
```

### Test Coverage

- **Event Store Tests**: Event persistence, retrieval, and idempotency
- **Handler Tests**: WebSocket message handling and game actions
- **Integration Tests**: Full event sourcing workflow with real databases
- **Reconnection Tests**: Event replay from last known state

## 📡 WebSocket API

### Connection

```
ws://localhost:3001/ws?gameId={gameId}&playerId={playerId}&lastEventId={lastEventId}
```

Parameters:
- `gameId`: Game session identifier
- `playerId`: Player identifier (1-based)
- `lastEventId`: (Optional) Last seen event ID for reconnection

### Message Format

**Client → Server:**
```json
{
  "type": "playCard|acquire|rest|claim",
  "data": {
    "cardIndex": 0,
    "multiplier": 1
  }
}
```

**Server → Client:**
```json
{
  "type": "gameState|event|replayStart|replayComplete",
  "data": { ... },
  "eventId": 123,
  "error": ""
}
```

## 🔄 Event Replay

The system supports event replay for:
- **Client Reconnection**: Automatically replay missed events
- **Debugging**: Replay game history
- **Auditing**: Verify game actions

### Replay Events Manually

```bash
# Replay events for a specific game
make replay GAME_ID=game-123
```

### Programmatic Replay

```go
events, err := eventStore.GetEvents(ctx, gameID, fromEventID)
for _, event := range events {
    // Process event
}
```

## 🔌 Handler Pattern

All handlers follow a strict request/response pattern:

```go
type PlayCardRequest struct {
    PlayerID   int `json:"playerId"`
    CardIndex  int `json:"cardIndex"`
    Multiplier int `json:"multiplier"`
}

type PlayCardResponse struct {
    Success bool   `json:"success"`
    EventID int64  `json:"eventId"`
    Error   string `json:"error"`
}

func HandlePlayCard(req PlayCardRequest) PlayCardResponse {
    // Implementation
}
```

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3001/health
```

### Database Access

```bash
# MongoDB shell
make mongo-shell

# Redis CLI
make redis-cli
```

### View Events

```javascript
// In MongoDB shell
db.events.find({ gameId: "game-123" }).sort({ _id: 1 })
```

## 🐳 Docker Deployment

### Local Development

```bash
make up          # Start all services
make logs        # View logs
make down        # Stop all services
```

### Production Deployment

```bash
# Build production image
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 🔐 Security

- **JWT Authentication**: Optional JWT token validation (set `JWT_ENABLED=true`)
- **Origin Validation**: Configure allowed origins in production
- **Input Validation**: All client inputs are validated server-side
- **Turn Validation**: Server enforces turn order and valid actions

## 🎮 Game Rules

The server implements Century: Golem Edition rules:
- 2-5 players
- Play cards, acquire merchants, claim point cards, rest
- First to 5 point cards triggers final round
- Caravan capacity: 10 crystals
- Full rule validation on server

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow SOLID principles and handler patterns
4. Add tests for new features
5. Submit a pull request

## 📝 Development Commands

```bash
make help              # Show all available commands
make dev               # Run with hot reload (requires air)
make run               # Run server locally
make test              # Run tests
make build             # Build binary
make docker-build      # Build Docker image
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB is running
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb
```

### Redis Connection Issues
```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

### WebSocket Connection Issues
- Verify game exists: `curl http://localhost:3001/api/games/{gameId}`
- Check server logs: `make logs`
- Ensure ports are not blocked by firewall

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Based on Century: Golem Edition board game
- Built with Go, MongoDB, Redis, and WebSocket
- Event sourcing pattern inspired by CQRS/ES architecture
