# Century: Golem Edition - Web Game

A beautiful web-based implementation of Century: Golem Edition board game with visual card designs, React frontend, and multiplayer support.

## 🎮 Features

- 🎨 **Modern React UI**: Hearthstone-inspired card game interface with TailwindCSS
- 🎴 **Beautiful Card Images**: Full card images with Vietnamese fantasy names
- 👥 **Multiplayer Support**: Real-time multiplayer via WebSocket
- 🎯 **Room Management**: Create/join rooms with auto-cleanup after 5 minutes
- ✨ **Amazing Animations**: Card flip, hover effects, pulse animations
- 📱 **Responsive Design**: Works on desktop and tablet devices
- 🎲 **Complete Game Logic**: Full Century: Golem Edition mechanics

## 🚀 Quick Start

### Option 1: Docker (Recommended for Production)

```bash
# Build and run with Docker Compose
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Server will be available at: `http://localhost:8080`

### Option 2: Local Development

#### Backend (Go Server)

```bash
# Build the server
go build -o server ./cmd/server

# Run the server
./server -port 8080
```

#### Frontend (React)

```bash
# Navigate to React frontend
cd web/react-frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

React dev server runs on `http://localhost:3000` (proxies to Go backend on 8080)

### Option 3: Production Build (React)

```bash
# Build React frontend
cd web/react-frontend
npm run build

# The built files will be in web/react-frontend/dist
# Update server to serve from dist/ if needed
```

## 📁 Project Structure

```
golem/
├── cmd/
│   ├── game/              # CLI simulation (original)
│   └── server/            # Web server main
├── internal/
│   ├── game/              # Game logic and engine
│   │   ├── cards.go       # Card definitions
│   │   ├── game.go        # Game state
│   │   ├── player.go      # Player logic
│   │   └── ...
│   └── server/            # Web server and WebSocket
│       ├── server.go      # Game session management
│       └── handlers.go     # HTTP/WebSocket handlers
├── web/
│   ├── static/            # Vanilla JS frontend (legacy)
│   │   ├── app.js
│   │   ├── characters.js   # Vietnamese card names
│   │   ├── images/        # Card images and avatars
│   │   └── ...
│   └── react-frontend/    # React + TailwindCSS frontend
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── store/       # Zustand state management
│       │   └── utils/       # Utilities
│       └── ...
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Docker Compose config
└── README.md
```

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t golem-century:latest .
```

### Run Container

```bash
docker run -d \
  --name golem-century \
  -p 8080:8080 \
  --restart unless-stopped \
  golem-century:latest
```

### Docker Compose

```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f golem-century

# Stop
docker-compose down

# Rebuild
docker-compose up -d --build
```

## 🌐 Server Configuration

### Environment Variables

- `PORT` - Server port (default: 8080)

### Ports

- **8080**: HTTP server and WebSocket
- **3000**: React dev server (development only)

### API Endpoints

- `GET /` - Serve frontend
- `GET /api/list` - List available game rooms
- `POST /api/create` - Create new game session
- `GET /api/join?session={id}` - Join existing session
- `WS /ws?session={id}&name={name}&avatar={avatar}` - WebSocket connection

## 🎯 How to Play

### Creating a Game

1. Open `http://localhost:8080` (or `http://localhost:3000` for React dev)
2. Enter your name
3. Choose your character avatar
4. Select number of players (2-4)
5. Click "Create Game"
6. Share the Session ID with friends

### Joining a Game

1. Open the game URL
2. Enter your name and choose avatar
3. Click "Join Room" tab
4. Select a room from the list OR paste Session ID
5. Click "Join"

### Game Actions

- **Play Card**: Click a card in your hand to play it
- **Acquire Card**: Click an affordable action card in market to buy it
- **Claim Point Card**: Click a claimable point card to earn victory points
- **Rest**: Click "Rest" button to return all played cards to hand

### Winning

First player to claim **5 point cards** wins the game!

## 🛠️ Development

### Prerequisites

- Go 1.21+
- Node.js 18+ (for React frontend)
- Docker & Docker Compose (optional)

### Backend Development

```bash
# Run server with hot reload (if using air or similar)
go run ./cmd/server/main.go

# Run tests
go test ./...
```

### Frontend Development

```bash
cd web/react-frontend

# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

### Dependencies

**Backend:**
- `github.com/gorilla/websocket` - WebSocket support

**Frontend:**
- React 18
- TailwindCSS 3
- Framer Motion (animations)
- Zustand (state management)
- Vite (build tool)

## 📦 Deployment Checklist

Before deploying to production:

- [ ] Update `Dockerfile` Go version if needed
- [ ] Set proper `PORT` environment variable
- [ ] Configure CORS if needed (currently allows all origins)
- [ ] Set up reverse proxy (nginx/traefik) for HTTPS
- [ ] Configure domain and DNS
- [ ] Set up SSL certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring/logging
- [ ] Test WebSocket connections
- [ ] Verify all images load correctly
- [ ] Test room cleanup functionality

## 🔧 Configuration

### Server Port

Change port via command line:
```bash
./server -port 9000
```

Or environment variable in Docker:
```yaml
environment:
  - PORT=9000
```

### Room Cleanup

Rooms are automatically deleted after **5 minutes** of inactivity (no players connected).

## 📝 Notes

- Game uses deterministic randomness (seeds) for reproducibility
- All players start with 2 Yellow crystals
- Market cards cost increases with position (0 = free, higher = more expensive)
- React frontend is the recommended UI (modern, animated)
- Vanilla JS frontend in `web/static/` is legacy but still functional
- Card images must be in `web/static/images/` directory
- Vietnamese card names are mapped in `web/static/characters.js` and `web/react-frontend/src/utils/cardNames.js`

## 🐛 Troubleshooting

### Images not loading
- Check that images exist in `web/static/images/`
- Verify symlink in React frontend: `web/react-frontend/public/images -> ../../static/images`
- Check browser console for 404 errors

### WebSocket connection fails
- Ensure server is running on correct port
- Check firewall settings
- Verify WebSocket upgrade is allowed

### Docker build fails
- Check Go version compatibility
- Ensure all dependencies are in `go.mod`
- Verify Node.js version for React build

## 📄 License

This is a personal project implementation of Century: Golem Edition.

Enjoy playing! 🎲✨
