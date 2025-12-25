# Enhanced Lobby System - Implementation Guide

## Overview

The lobby system has been completely revamped to provide a modern, user-friendly experience for creating and joining games in Century: Golem Edition. This implementation includes advanced features like game filtering, AI opponent configuration, and automatic inactivity handling.

## Features Implemented

### 1. **Enhanced Game Browser**
- **Real-time Game List**: Displays all available games with detailed information
- **Auto-refresh**: Game list automatically updates every 10 seconds
- **Search Functionality**: Search games by ID, host name, or player names
- **Status Filters**: Filter games by status (All, Waiting for Players, In Progress)
- **Rich Game Info Display**:
  - Game host name
  - Connected players count
  - Current game status (Waiting/Playing)
  - Game mode (2-5 players)
  - Creation timestamp with relative time display
  - Spectator count
  - Time until deletion (for empty games)

### 2. **Advanced Game Creation**
- **Game Name**: Optional custom name for your game
- **Player Count**: Configure 2-5 player games
- **Turn Timer**: Customizable turn timeout (30s - 5 minutes)
- **AI Configuration**: 
  - Choose AI or human opponents for each player slot
  - AI types available:
    - **Basic AI**: Plays intelligently with strategy
    - **Rest Only AI**: Only performs rest actions (for testing)
  - You are always Player 1 (human)
  - Mix and match AI and human opponents

### 3. **Inactivity Handling**
- **5-Second Auto-Rest**: If a player is inactive for 5 seconds during their turn, an automatic rest action is performed
- **Activity Detection**: Tracks all player actions to reset the inactivity timer
- **Smart Detection**: Only triggers during the player's turn and when connected

### 4. **Responsive Design**
- **Mobile-First**: Optimized for touch devices
- **Tablet Support**: Adaptive layout for medium-sized screens
- **Desktop**: Full-featured experience with enhanced visuals
- **Orientation-Aware**: Adjusts to portrait and landscape modes

### 5. **Waiting Room** (Bonus Feature)
- Shows connected players in real-time
- Visual indicators for player status
- Easy game ID sharing
- Leave game functionality
- Player avatars and names

## File Structure

```
web/react-frontend/src/
├── components/
│   ├── EnhancedLobby.jsx       # New main lobby component
│   ├── WaitingRoom.jsx          # Waiting room for multiplayer
│   └── Lobby.jsx                # Original (still available)
├── store/
│   └── gameStore.js             # Updated with inactivity handling
└── App.jsx                      # Updated to use EnhancedLobby

internal/server/
└── handlers.go                  # Enhanced API endpoints
```

## API Endpoints

### Create Game
```http
POST /api/create
Content-Type: application/json

{
  "numPlayers": 3,
  "gameName": "My Game",
  "turnTimeout": 60,
  "aiPlayers": ["", "basic", "rest"],
  "hostName": "Player Name"
}
```

**Response:**
```json
{
  "sessionID": "My Game",
  "numPlayers": 3,
  "turnTimeout": 60,
  "gameName": "My Game"
}
```

### List Games
```http
GET /api/list?search=query&status=waiting
```

**Query Parameters:**
- `search` (optional): Search term for game ID, host, or player names
- `status` (optional): Filter by status (`all`, `waiting`, `playing`)

**Response:**
```json
{
  "sessions": [
    {
      "sessionID": "My Game",
      "numPlayers": 3,
      "connectedPlayers": 1,
      "spectatorCount": 0,
      "players": ["Player 1"],
      "host": "Player 1",
      "status": "waiting",
      "createdAt": 1703520000,
      "timeUntilDelete": 300
    }
  ]
}
```

## Usage Guide

### Creating a Game

1. **Enter Your Name**: Your name will be displayed to other players
2. **Choose Avatar**: Select your character avatar (1-4)
3. **Switch to Create Tab**: Click "Create Game"
4. **Configure Game**:
   - Enter optional game name
   - Select number of players (2-5)
   - Set turn timeout
   - Configure each player slot:
     - Player 1 is always you (human)
     - Players 2-5 can be Human or AI (Basic/Rest Only)
5. **Click "Create Game & Join"**: Game is created and you automatically join

### Joining a Game

1. **Browse Games Tab**: View all available games
2. **Use Filters**: Search or filter to find games
3. **Join Options**:
   - **Join**: Join as a player (if space available)
   - **Spectate**: Watch the game as a spectator
   - **Copy ID**: Share game ID with friends
4. **Manual Join**: Paste a game ID to join directly

### Inactivity System

The system automatically handles player inactivity:

- **Timer Starts**: When it becomes your turn
- **Activity Tracking**: Any action you take resets the timer
- **Auto-Rest**: After 5 seconds of no action, rest is automatically performed
- **Timer Stops**: When your turn ends

**Actions that reset the timer:**
- Playing a card
- Acquiring a card
- Claiming a point card
- Resting
- Any other game action

## Testing

### Manual Testing

1. **Start Backend**:
   ```bash
   make run
   ```

2. **Start Frontend**:
   ```bash
   cd web/react-frontend
   npm run dev
   ```

3. **Open Browser**: Navigate to `http://localhost:5173`

4. **Test Scenarios**:
   - Create a game with mixed AI/human players
   - Join multiple games in different tabs
   - Test search and filter functionality
   - Verify auto-refresh (wait 10 seconds)
   - Test inactivity timer (create game, wait 5 seconds on your turn)
   - Test mobile responsiveness (resize browser)

### Automated API Testing

Run the test script:
```bash
./test_lobby.sh
```

This tests:
- Game creation with AI
- List endpoint
- Search filtering
- Status filtering
- Multiple game creation

## Configuration

### Environment Variables

**Frontend** (`.env.local`):
```env
VITE_API_HOST=http://localhost:8080
```

**Backend** (config):
```go
DefaultTurnTimeoutInSeconds: 60
```

### Customization

**Auto-refresh Interval** (EnhancedLobby.jsx):
```javascript
const interval = setInterval(fetchRooms, 10000); // 10 seconds
```

**Inactivity Timeout** (gameStore.js):
```javascript
setTimeout(() => {
  // Auto-rest logic
}, 5000); // 5 seconds
```

## Mobile Optimization

### Touch Targets
All interactive elements have minimum 44x44px touch targets for mobile.

### Responsive Breakpoints
- **Mobile**: < 768px (portrait optimized)
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Performance
- Lazy loading for images
- Debounced search input
- Efficient re-rendering with React hooks
- Optimized animations with Framer Motion

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Safari: ✅ Full support
- Firefox: ✅ Full support
- Mobile Safari: ✅ Full support
- Mobile Chrome: ✅ Full support

## Known Limitations

1. **Game Deletion**: Empty games are deleted after 5 minutes of inactivity
2. **Spectator Limit**: No hard limit on spectators (consider adding one)
3. **Search Performance**: Linear search (fine for < 100 games)

## Future Enhancements

- [ ] Player ratings/levels
- [ ] Game password protection
- [ ] Custom AI difficulty levels
- [ ] Game replays from lobby
- [ ] Friends list integration
- [ ] Tournament brackets
- [ ] Chat in waiting room
- [ ] Game settings presets

## Troubleshooting

### Games not appearing
- Check backend is running
- Verify WebSocket connection
- Check browser console for errors
- Ensure CORS is configured

### Auto-refresh not working
- Check console for fetch errors
- Verify API endpoint is accessible
- Check network tab in DevTools

### Inactivity timer not firing
- Ensure you're not in spectator mode
- Check it's actually your turn
- Verify WebSocket connection is active
- Check console logs for timer messages

## Credits

Implemented as part of the Century: Golem Edition multiplayer system.

**Components Used:**
- React 18
- Zustand (State Management)
- Framer Motion (Animations)
- Tailwind CSS (Styling)

---

Last Updated: December 25, 2025
