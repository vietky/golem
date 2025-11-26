# Century: Golem Edition - Web Game

A beautiful web-based implementation of Century: Golem Edition board game with visual card designs and multiplayer support.

## Features

- 🎮 **Full Game Implementation**: Complete game mechanics with engine building, resource trading, and point cards
- 🎨 **Beautiful UI**: CSS-based card designs with crystal icons and visual effects
- 👥 **Multiplayer Support**: Play with friends locally via web browser
- 🤖 **AI Players**: Includes AI opponents for testing
- 📱 **Responsive Design**: Works on desktop and tablet devices

## Quick Start

### 1. Build the Server

```bash
go build ./cmd/server
```

### 2. Run the Server

```bash
./server -port 8080
```

Or use the default port:
```bash
./server
```

### 3. Open in Browser

Open your browser and navigate to:
```
http://localhost:8080
```

## How to Play

### Creating a Game

1. Enter your name
2. Select number of players (2-4)
3. Click "Create New Game"
4. Share the Session ID with friends (they can join using "Join Existing Game")

### Joining a Game

1. Enter your name
2. Enter the Session ID from the game creator
3. Click "Join Existing Game"

### Game Actions

- **Play Card**: Click on a card in your hand to play it
- **Acquire Card**: Click on an action card in the market to buy it (if you have enough resources)
- **Claim Point Card**: Click on a point card in the market to claim it (if you have the required crystals)
- **Rest**: Click the "Rest" button to return all played cards to your hand

### Card Types

- **Action Cards** (Merchant Cards):
  - **Produce**: Gain crystals directly
  - **Upgrade**: Convert lower crystals to higher ones
  - **Trade**: Exchange crystals for better ones

- **Point Cards**: Claim these by spending the required crystals to earn victory points

### Winning

The game ends when any player claims **5 point cards**. The player with the most victory points wins!

## Project Structure

```
golem_century/
├── cmd/
│   ├── game/          # CLI simulation (original)
│   └── server/         # Web server
├── internal/
│   ├── game/           # Game logic and engine
│   └── server/         # Web server and WebSocket handling
└── web/
    └── static/         # Frontend (HTML, CSS, JavaScript)
```

## Development

### Running CLI Version

```bash
go run ./cmd/game -players 3 -seed 42
```

### Building Everything

```bash
# Build CLI version
go build ./cmd/game

# Build web server
go build ./cmd/server
```

## Dependencies

- Go 1.21+
- `github.com/gorilla/websocket` - WebSocket support

## Features Implemented

✅ Complete game engine with all mechanics  
✅ Resource management (Yellow, Green, Blue, Pink crystals)  
✅ Action cards (Produce, Upgrade, Trade)  
✅ Point cards with victory conditions  
✅ Market system with position-based pricing  
✅ Player turn system  
✅ AI players with heuristic strategies  
✅ Web-based UI with card images  
✅ Real-time multiplayer via WebSocket  
✅ Beautiful CSS-based card designs  
✅ Crystal icons and visual effects  

## Notes

- The game uses deterministic randomness (seeds) for reproducibility
- All players start with 2 Yellow crystals
- Market cards cost increases with position (0 = free, higher = more expensive)
- Players can rest to return played cards to hand

Enjoy playing Century: Golem Edition! 🎲✨

