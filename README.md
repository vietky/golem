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