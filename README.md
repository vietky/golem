# Golem

## Development Setup
- update .env.* in `web/react-frontend/` as needed.
- for backend development, use `cp .env.example .env` for environment variables in the root directory.

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
- scp -r web/react-frontend/public/* root@<nginx-server-ip>:/opt/nginx/apps/assets/
