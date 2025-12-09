# Century: Golem Edition - React Frontend

A modern React + TailwindCSS frontend for Century: Golem Edition, inspired by Hearthstone's card game UI.

## Run
- `make dev`
- `make fe-build-local`
- `make fe-run-local`

## Features

- 🎮 **Hearthstone-inspired UI** with beautiful card designs
- 🎨 **TailwindCSS** for modern styling
- ⚡ **React 18** with functional components
- 🎯 **Zustand** for state management
- 🎬 **Framer Motion** for smooth animations
- 🎴 **Drag & Drop** card interactions
- 📱 **Responsive** design

## Installation

```bash
cd web/react-frontend
npm install
```

## Development

```bash
npm run dev
```

The app will run on `http://localhost:3000`

## Build

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── Card.jsx           # Individual card component
│   ├── PlayerHand.jsx     # Player's hand area
│   ├── OpponentArea.jsx   # Opponent display (top)
│   ├── MarketArea.jsx     # Market cards display
│   ├── ResourcePanel.jsx   # Player resources
│   ├── ActionLog.jsx      # Action history
│   ├── Lobby.jsx          # Lobby screen
│   ├── CrystalIcon.jsx    # Crystal icon component
│   └── CrystalStack.jsx   # Stack of crystals
├── store/
│   └── gameStore.js      # Zustand store for game state
├── App.jsx                # Main app component
├── main.jsx               # Entry point
└── index.css              # Global styles
```

## Game Logic Integration

The frontend connects to the Go backend via WebSocket:
- `/ws?session={sessionId}&name={playerName}&avatar={avatar}`
- Receives game state updates
- Sends player actions

## Color Scheme

- Yellow: `#FFD966`
- Green: `#6AA84F`
- Blue: `#3C78D8`
- Pink: `#E06666`

## Animations

- Card hover: Scale + glow effect
- Card flip: 3D rotation
- Fly to hand: Card acquisition animation
- Points flash: Victory points animation

