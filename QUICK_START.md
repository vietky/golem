# 🎮 Golem Century - Quick Start Guide

## Prerequisites

- Docker & Docker Compose installed
- Go 1.24+ (for local development)
- Make (optional, for convenience)

## 🚀 Quick Start (5 minutes)

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone the repository
cd /path/to/golem

# 2. Create environment file
cp .env.example .env

# 3. Start all services
docker-compose up -d

# 4. Check health
curl http://localhost:3001/api/health

# 5. Open in browser
open http://localhost:3001
```

That's it! The game is now running on http://localhost:3001

### Option 2: Local Development

```bash
# 1. Setup environment
make setup-local

# 2. Run server
make dev
```

## 🎯 What Just Happened?

Your setup includes:

- ✅ **Game Server** on http://localhost:3001
- ✅ **Redis** for event sourcing (port 6379)
- ✅ **PostgreSQL** for data persistence (port 5432)
- ✅ **Event sourcing** enabled
- ✅ **Offline player handling** active
- ✅ **Real-time synchronization** ready

## 🎲 Play the Game

1. **Open browser**: http://localhost:3001
2. **Create game**: Click "Create Session"
3. **Share session ID**: Send to friends
4. **Join game**: Players join with session ID
5. **Play**: Game starts when all players join

## 📊 Monitor Your Game

### View Logs
```bash
# All services
docker-compose logs -f

# Just game server
docker-compose logs -f golem-century

# Just Redis
docker-compose logs -f redis
```

### Check Health
```bash
curl http://localhost:3001/api/health | jq
```

### List Active Sessions
```bash
curl http://localhost:3001/api/list | jq
```

## 🔧 Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart game server
docker-compose restart golem-century

# View real-time logs
docker-compose logs -f

# Check status
docker-compose ps

# Clean everything (including data)
docker-compose down -v
```

## 🧪 Test Features

### Test Offline Player Handling

1. Start a 2-player game
2. Player 1 disconnects (close browser/tab)
3. Player 2 continues playing
4. AI automatically plays for Player 1
5. Player 1 reconnects - catches up automatically

### Test Event Replay

Events are automatically recorded in Redis Streams. View them:

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# List all event streams
KEYS game:events:*

# View events for a session
XREAD COUNT 100 STREAMS game:events:session_xyz 0
```

### Test Database Persistence

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U golem_user -d golem_db

# View active sessions
SELECT * FROM game_sessions;

# View player stats
SELECT * FROM player_stats;
```

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
docker info

# Check ports are free
lsof -i :3001
lsof -i :6379
lsof -i :5432

# Restart Docker
# (Mac) Docker Desktop → Restart
```

### Game Server Errors

```bash
# View logs
docker-compose logs golem-century

# Check dependencies
docker-compose ps

# Restart server
docker-compose restart golem-century
```

### Redis Connection Issues

```bash
# Test Redis
docker-compose exec redis redis-cli ping

# Should return: PONG

# Restart Redis
docker-compose restart redis
```

### PostgreSQL Connection Issues

```bash
# Test PostgreSQL
docker-compose exec postgres psql -U golem_user -d golem_db -c "SELECT 1;"

# Should return: 1

# Restart PostgreSQL
docker-compose restart postgres
```

## 📚 Next Steps

- Read `IMPLEMENTATION_README.md` for detailed architecture
- Check `golem.md` for game rules and requirements
- Review `IMPLEMENTATION_COMPLETE.md` for implementation details
- Explore the code in `internal/` directory

## 🆘 Need Help?

1. Check logs: `docker-compose logs -f`
2. Check health: `curl http://localhost:3001/api/health`
3. Restart services: `docker-compose restart`
4. Clean start: `docker-compose down -v && docker-compose up -d`

## 🎉 Enjoy!

You're all set! Start playing and explore the features:

- **Event Sourcing**: All actions are recorded
- **Offline Handling**: Players can disconnect and rejoin
- **Real-time Sync**: All players see updates instantly
- **Persistent Stats**: Game history saved to PostgreSQL

Have fun! 🎮
