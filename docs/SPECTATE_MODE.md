# Spectate Mode and Player Notifications

## Overview
This update adds spectator mode functionality and player join notifications to the Century: Golem Edition multiplayer game.

## Features Added

### 1. Spectate Mode
Players can now join game rooms as spectators to watch the game without participating.

#### Backend Changes
- **GameSession Structure**: Added `Spectators` and `SpectatorNames` maps to track spectator connections
- **WebSocket Handler**: Updated to support `spectate=true` query parameter
- **Broadcast Function**: Modified to send game state updates to both players and spectators
- **Session Cleanup**: Updated to consider spectators when determining if a room is empty

#### Frontend Changes
- **Lobby Component**: Added spectate button (👁️) next to join button in room list
- **Game Store**: 
  - Added `isSpectator` and `spectatorId` state
  - Updated `connectWebSocket` to accept `asSpectator` parameter
  - Modified state handling to show all players as opponents for spectators
  - Disabled action sending for spectators
- **Room Display**: Shows spectator count with 👁️ icon

#### API Changes
- **WebSocket Connection**: 
  ```
  ws://server/ws?session=SESSION_ID&name=NAME&avatar=AVATAR&spectate=true
  ```
- **List Sessions Response**: Now includes `spectatorCount` field
  ```json
  {
    "sessions": [{
      "sessionID": "session_123",
      "numPlayers": 2,
      "connectedPlayers": 1,
      "spectatorCount": 2,
      "players": ["Player 1"],
      "status": "open"
    }]
  }
  ```

### 2. Player Join Notifications
All users (players and spectators) now receive notifications when someone joins the room.

#### Backend Changes
- **BroadcastPlayerJoined**: New method that broadcasts join events to all connected users
- Automatically called when a player or spectator connects

#### Frontend Changes
- **Message Handling**: Added handler for `playerJoined` message type
- Displays join notification in action log
- Different messages for players vs spectators:
  - Player: "Player Name joined the game"
  - Spectator: "Spectator Name is now spectating"

#### Message Format
```json
{
  "type": "playerJoined",
  "playerID": 1,
  "playerName": "John Doe",
  "avatar": "3",
  "isSpectator": false,
  "connectedPlayers": 2,
  "spectatorCount": 1
}
```

## Usage

### Joining as Spectator
1. Navigate to the lobby
2. View available rooms in the "Join" tab
3. Click the 👁️ (eye) button to spectate
4. You'll see all game state updates but cannot perform actions

### Joining as Player
1. Navigate to the lobby
2. View available rooms in the "Join" tab
3. Click the "Join" button to play
4. All users in the room will be notified of your join

## Testing

### Automated Tests
Run the spectate mode tests:
```bash
go test ./internal/server/... -run "TestSpectator|TestPlayerJoined|TestListSessions" -v
```

### Manual Testing
1. Open http://localhost:3000 in three browser windows
2. Window 1: Create a new game room
3. Window 2: Join as a player (blue "Join" button)
4. Window 3: Join as a spectator (purple 👁️ button)
5. Verify:
   - All windows receive "Player joined" notifications
   - Spectator sees game state updates
   - Spectator cannot perform actions
   - Room list shows correct spectator count

### API Testing
Use the provided test script:
```bash
bash test_spectate.sh
```

## Technical Details

### State Management
- **Players**: Can perform actions, have a player ID (1-N)
- **Spectators**: Cannot perform actions, have a unique spectator ID (spectator_timestamp)
- Both receive all game state updates via WebSocket broadcast

### Connection Lifecycle
1. **Connect**: WebSocket upgrade with spectate parameter
2. **Assignment**: Server assigns player ID or spectator ID
3. **State Sync**: Initial game state sent to new connection
4. **Notification**: All users notified of join
5. **Updates**: All state changes broadcast to everyone
6. **Disconnect**: Connection removed from appropriate map

### Performance Considerations
- Spectators don't affect game logic or player limits
- Empty rooms (no players or spectators) are cleaned up after 5 minutes
- Broadcast function efficiently sends to all connections in one pass

## Future Enhancements
Potential improvements for spectate mode:
- Spectator chat
- Replay controls for spectators
- Spectator-only UI elements (e.g., see all player hands)
- Kick/ban spectators (for room creators)
- Spectator limits per room
