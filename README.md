# Golem

## Development Setup
- update .env.* in `web/react-frontend/` as needed.
- for backend development, use `cp .env.example .env` for environment variables in the root directory.

## Features

### Firebase Authentication
Secure Google OAuth authentication powered by Firebase. Only authenticated users can join games, and only registered users can rejoin their sessions. See [docs/FIREBASE_AUTH.md](docs/FIREBASE_AUTH.md) for detailed setup instructions.

**Optional feature** - works without configuration for local development.

### Fast Disconnection Detection
The server now detects disconnected players in ~500ms (previously 60+ seconds) using WebSocket ping/pong. See [docs/DISCONNECTION_DETECTION.md](docs/DISCONNECTION_DETECTION.md) for details.

Configuration:
```bash
export WEBSOCKET_PING_INTERVAL=15    # Seconds between ping messages (default 15)
export WEBSOCKET_READ_TIMEOUT=60     # Read timeout in seconds (default 60)
export WEBSOCKET_WRITE_TIMEOUT=10    # Write timeout in seconds (default 10)
```

### Telegram Notifications
Get notified when new game rooms are created! See [docs/TELEGRAM_NOTIFICATIONS.md](docs/TELEGRAM_NOTIFICATIONS.md) for setup instructions.

```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="your_chat_id"
```

## backend
- local: `go run cmd/server/main.go`
- release: `make be-release`

## frontend
- dev: `cd web/react-frontend && npm run dev`
- build: `cd web/react-frontend && npm run build`
- release: `cd web/react-frontend && npm run release`

## dev
- `DEFAULT_TURN_TIMEOUT_SECONDS=3 go run ./cmd/server/main.go`

## export mongodb data
- mongodump --host 127.0.0.1 --port 27017 --db golem_game --out /data/golem_game
- docker cp golem-mongodb:/data/golem_game ./golem_game
- tar -czvf /opt/nginx/apps/images/golem-data.tar.gz ./golem_game

## copy assets to nginx server
- `scp -r web/react-frontend/static/* root@157.66.101.66:/opt/nginx/apps/assets/`
