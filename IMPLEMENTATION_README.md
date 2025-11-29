# Golem Century - Implementation Guide

## Overview

This is a multiplayer card game server implementation following event sourcing and CQRS patterns with Redis Streams and PostgreSQL for persistence.

## Architecture

### Core Components

1. **Event Sourcing with Redis Streams**
   - All game actions and state changes are captured as events
   - Events are stored in Redis Streams for replay and synchronization
   - Enables debugging, auditing, and state reconstruction

2. **Real-time Synchronization with Redis Pub/Sub**
   - State changes are broadcast to all connected clients
   - Players receive instant notifications of game updates
   - Supports reconnection and catch-up mechanisms

3. **PostgreSQL Persistence**
   - Long-term storage of game sessions and player data
   - Player statistics and leaderboards
   - Enables complex queries and analytics

4. **Offline Player Handling**
   - AI automatically plays for disconnected players
   - Game continues without interruption
   - Players can reconnect and catch up on missed events

## System Requirements

- Go 1.24+
- Redis 7+
- PostgreSQL 15+
- Docker & Docker Compose (for containerized deployment)

## Configuration

All configuration is managed through environment variables. Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

### Key Configuration Options

- **Server**: `PORT`, `HOST`
- **Redis**: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- **PostgreSQL**: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- **Game Settings**: `GAME_MAX_SESSIONS`, `GAME_SESSION_TIMEOUT`

## Running the Application

### Local Development

```bash
# Start dependencies (Redis + PostgreSQL)
docker-compose up -d redis postgres

# Wait for services to be ready
sleep 10

# Run the server
go run cmd/server/main.go

# Or with custom port
go run cmd/server/main.go -port 8080
```

### Docker Compose (Full Stack)

```bash
# Build and start all services
docker-compose up --build

# Or in detached mode
docker-compose up -d

# View logs
docker-compose logs -f golem-century

# Stop all services
docker-compose down

# Clean up volumes
docker-compose down -v
```

## API Endpoints

### HTTP Endpoints

- `POST /api/create` - Create a new game session
- `GET /api/join?session={id}` - Join an existing session
- `GET /api/list` - List active game sessions
- `GET /api/health` - Health check endpoint
- `POST /api/catchup` - Catch up on missed events (for reconnection)

### WebSocket Endpoint

- `WS /ws?session={id}&player={id}&name={name}&avatar={avatar}` - Connect to game session

## Event Sourcing

### Event Types

- `game_start` - Game session started
- `player_connect` - Player connected
- `player_disconnect` - Player disconnected
- `player_action` - Player performed an action
- `state_change` - Game state updated
- `turn_change` - Turn advanced to next player
- `game_end` - Game completed

### Event Flow

1. Player performs action → Event recorded in Redis Stream
2. Action executed → Game state updated
3. State change event recorded → Broadcast to all clients via Pub/Sub
4. Clients update UI based on new state

### Replay and Recovery

```go
// Replay all events for a session
events, err := eventManager.ReplayEvents(ctx)

// Get events since a specific point (for catch-up)
events, err := eventManager.GetEventsSinceForPlayer(ctx, lastEventID)

// Get events since timestamp
events, err := eventManager.GetEventsSince(ctx, sessionID, timestamp)
```

## Offline Player Handling

When a player disconnects:

1. Connection tracker marks player as offline
2. Game loop detects offline player on their turn
3. AI automatically makes decisions for offline player
4. All actions are recorded as events
5. Player can reconnect and catch up via `/api/catchup` endpoint

## Testing

### Unit Tests

```bash
# Test Redis event store
go test ./internal/redis/... -v

# Test database layer
go test ./internal/database/... -v

# Test server logic
go test ./internal/server/... -v
```

### Integration Tests

```bash
# Run all integration tests
go test ./internal/server/... -v -run Integration

# Test offline player handling
go test ./internal/server/... -v -run TestOfflinePlayer

# Test reconnection and catch-up
go test ./internal/server/... -v -run TestPlayerReconnection
```

### Coverage

```bash
# Generate coverage report
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

## Database Schema

### Game Sessions Table

```sql
CREATE TABLE game_sessions (
    id VARCHAR(255) PRIMARY KEY,
    num_players INTEGER NOT NULL,
    seed BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    winner_id INTEGER,
    game_state JSONB
);
```

### Players Table

```sql
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

### Player Stats Table

```sql
CREATE TABLE player_stats (
    player_id INTEGER PRIMARY KEY,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    average_points NUMERIC(10,2) DEFAULT 0,
    last_played TIMESTAMP NOT NULL
);
```

## Redis Configuration

### Persistence

- **AOF (Append Only File)**: Enabled with `everysec` fsync
- **RDB (Snapshotting)**: Enabled with configurable intervals
- Data durability is ensured through both mechanisms

### Streams Configuration

```conf
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000
```

## Deployment

### Ansible Deployment

```bash
# Update .env with deployment configuration
# Set ANSIBLE_HOST, ANSIBLE_USER, etc.

# Deploy to remote server
make deploy

# Check deployment status
make status-remote

# View remote logs
make logs-remote
```

### Environment-Specific Configuration

Set `ENVIRONMENT` variable:
- `development` - Local development
- `production` - Production deployment

## Monitoring

### Health Checks

```bash
# Check service health
curl http://localhost:8080/api/health

# Response includes:
# - Overall status
# - Redis connection status
# - PostgreSQL connection status
# - Active sessions count
```

### Logs

```bash
# View application logs
docker-compose logs -f golem-century

# View Redis logs
docker-compose logs -f redis

# View PostgreSQL logs
docker-compose logs -f postgres
```

## Coding Conventions

Following SOLID principles and project conventions:

1. **Interfaces for all services** - Database, Redis, Event Store, etc.
2. **Request/Response objects** - All handlers use typed request/response
3. **Environment variables** - No hardcoded values
4. **Idempotent operations** - Safe to retry/replay
5. **Error handling** - Proper error propagation and logging

## Troubleshooting

### Redis Connection Issues

```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping

# View Redis logs
docker-compose logs redis
```

### PostgreSQL Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test PostgreSQL connection
docker-compose exec postgres psql -U golem_user -d golem_db -c "SELECT 1;"

# View PostgreSQL logs
docker-compose logs postgres
```

### Application Crashes

```bash
# View application logs
docker-compose logs golem-century

# Restart application
docker-compose restart golem-century

# Check health endpoint
curl http://localhost:3001/api/health
```

## Future Enhancements

- [ ] Implement Lua scripts for atomic Redis operations
- [ ] Add clustering for high availability
- [ ] Implement Redis replication
- [ ] Add monitoring with RedisInsight
- [ ] Implement rate limiting
- [ ] Add WebSocket authentication
- [ ] Implement player matchmaking
- [ ] Add game replay viewer
- [ ] Implement tournament mode

## License

See LICENSE file for details.

## Support

For issues and questions, please create an issue in the repository.
