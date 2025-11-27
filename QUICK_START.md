# 🚀 Quick Start Guide

## Option 1: Quick Start Script (Easiest)

```bash
./run.sh
```

This will:
- Build and start Go backend (port 8080)
- Start React frontend (port 3000)
- Open http://localhost:3000 to play

## Option 2: Manual Start

### Backend (Go Server)

```bash
# Build server
go build -o server cmd/server/main.go

# Run server
./server -port 8080
```

Server runs on: `http://localhost:8080`

### Frontend (React)

```bash
# Navigate to React directory
cd web/react-frontend

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

Frontend runs on: `http://localhost:3000`

## Option 3: Docker (Production)

```bash
# Build and start with Docker Compose
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Server runs on: `http://localhost:8081` (mapped from container port 8080)

## Option 4: Quick Commands

### Start Backend Only
```bash
go run ./cmd/server/main.go
```

### Start Frontend Only
```bash
cd web/react-frontend && npm run dev
```

### Stop All Servers
```bash
# Stop Go server
pkill -f "./server"

# Stop React dev server
pkill -f "vite"
```

## 📋 Prerequisites

- **Go 1.21+** - [Install Go](https://golang.org/dl/)
- **Node.js 18+** - [Install Node.js](https://nodejs.org/)
- **npm** - Comes with Node.js

## 🎮 After Starting

1. Open browser: `http://localhost:3000` (React) or `http://localhost:8080` (Vanilla JS)
2. Create or join a game
3. Play!

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 8080
lsof -ti:8080

# Kill it
kill $(lsof -ti:8080)

# Or use different port
./server -port 9000
```

### React Dependencies Missing
```bash
cd web/react-frontend
rm -rf node_modules package-lock.json
npm install
```

### Go Dependencies Missing
```bash
go mod download
go mod tidy
```

## 📝 Development

### Backend Development
```bash
# Run with hot reload (if using air)
go install github.com/cosmtrek/air@latest
air
```

### Frontend Development
```bash
cd web/react-frontend
npm run dev  # Already has hot reload
```

### Build for Production
```bash
# Build React
cd web/react-frontend
npm run build

# Build Go server
go build -o server cmd/server/main.go
```

## 🐳 Docker Commands

```bash
# Build image
docker build -t golem-century:latest .

# Run container
docker run -d -p 8080:8080 golem-century:latest

# View logs
docker logs -f golem-century-server

# Stop container
docker stop golem-century-server
```

