# Visual Guide: Spectate Mode & Player Notifications

## UI Changes

### Lobby - Room List (Before)
```
┌─────────────────────────────────────────┐
│  Room: game_123                         │
│  👥 2/4                                 │
│  Players: Alice, Bob                    │
│  [📋] [Join]                            │
└─────────────────────────────────────────┘
```

### Lobby - Room List (After)
```
┌─────────────────────────────────────────┐
│  Room: game_123                         │
│  👥 2/4  👁️ 3                          │  ← Spectator count added
│  Players: Alice, Bob                    │
│  [📋] [👁️] [Join]                       │  ← Spectate button added
└─────────────────────────────────────────┘
```

## User Flows

### Flow 1: Player Joins Game
```
Player 1 (Browser 1)          Server                Player 2 (Browser 2)
      |                          |                          |
      | Create Game             |                          |
      |------------------------>|                          |
      |                          |                          |
      | Join as Player          |                          |
      |<------------------------|                          |
      | "You joined!"           |                          |
      |                          |                          |
      |                          |<------------------------|
      |                          | Join as Player          |
      |                          |                          |
      |<------------------------|------------------------>|
      | "Bob joined!"           |      "You joined!"       |
      | (notification)          |      (notification)       |
```

### Flow 2: Spectator Joins Game
```
Player (Browser 1)            Server               Spectator (Browser 2)
      |                          |                          |
      | Playing game...         |                          |
      |<----------------------->|                          |
      |                          |                          |
      |                          |<------------------------|
      |                          | Join as Spectator       |
      |<------------------------|                          |
      | "Charlie is spectating" |                          |
      |                          |------------------------>|
      |                          |  Game state + "Spectator"|
      |                          |                          |
      | Make move              |                          |
      |------------------------>|                          |
      |                          |------------------------>|
      |                          |  Game state update      |
      |                          | (spectator sees move)    |
```

### Flow 3: Spectator Cannot Act
```
Spectator (Browser)           Server
      |                          |
      | Try to play card        |
      |------------------------>| ❌ Rejected
      |                          |
      | (Action blocked by      |
      |  frontend store)         |
```

## Message Flow

### Player Join Sequence
```
1. WebSocket Connect
   ↓
2. playerAssigned message
   {
     "type": "playerAssigned",
     "playerID": 2
   }
   ↓
3. state message (initial)
   {
     "type": "state",
     "currentTurn": 0,
     "players": [...],
     "market": {...}
   }
   ↓
4. playerJoined broadcast (to all)
   {
     "type": "playerJoined",
     "playerID": 2,
     "playerName": "Bob",
     "isSpectator": false,
     "connectedPlayers": 2,
     "spectatorCount": 0
   }
```

### Spectator Join Sequence
```
1. WebSocket Connect (?spectate=true)
   ↓
2. spectatorAssigned message
   {
     "type": "spectatorAssigned",
     "spectatorID": "spectator_123...",
     "isSpectator": true
   }
   ↓
3. state message (initial)
   {
     "type": "state",
     "currentTurn": 0,
     "players": [...],  ← All shown as opponents
     "market": {...}
   }
   ↓
4. playerJoined broadcast (to all)
   {
     "type": "playerJoined",
     "playerID": 0,
     "playerName": "Spectator",
     "isSpectator": true,
     "connectedPlayers": 2,
     "spectatorCount": 1
   }
```

## State Differences

### Player View
```javascript
{
  playerId: 2,
  isSpectator: false,
  myPlayer: {
    id: 2,
    name: "Bob",
    hand: [...],      // Can see own hand
    resources: {...}
  },
  opponents: [
    { id: 1, name: "Alice", hand: [...] }  // Can't see opponent hand
  ]
}
```

### Spectator View
```javascript
{
  spectatorId: "spectator_1234...",
  isSpectator: true,
  myPlayer: null,      // No player representation
  opponents: [
    { id: 1, name: "Alice", hand: [...] },  // All players are opponents
    { id: 2, name: "Bob", hand: [...] }
  ]
}
```

## Button States

### Join Button Logic
```
if (room.connectedPlayers >= room.numPlayers) {
  // Button disabled - room full
  <button disabled>Join</button>
} else {
  // Button enabled - can join
  <button onClick={() => joinGame(id, false)}>Join</button>
}
```

### Spectate Button Logic
```
// Always enabled - spectators don't count toward player limit
<button onClick={() => joinGame(id, true)}>👁️</button>
```

## Action Blocking

### Player Can Act
```javascript
sendAction(actionType, cardIndex, ...) {
  if (isSpectator) {
    console.log("Spectators cannot perform actions");
    return;  // ❌ Blocked
  }
  
  ws.send(JSON.stringify({
    type: "action",
    actionType: actionType,
    ...
  }));  // ✅ Sent
}
```

## Visual Indicators

### Room Badge Colors
```
👥 2/4  ← Green badge for players (existing)
👁️ 3   ← Blue badge for spectators (new)
```

### Button Colors
```
[📋]    ← White/transparent (copy button)
[👁️]   ← Purple gradient (spectate button - new)
[Join]  ← Blue gradient (join button - existing)
```

### Disabled State
```
[Join] ← Grayed out when room full (new behavior)
       ← Tooltip shows "Room is full"
```

## Notification Examples

### Action Log Messages

**Player joins:**
```
"Bob joined the game"
```

**Spectator joins:**
```
"Charlie is now spectating"
```

**Turn change (for spectator):**
```
"Alice's turn"
```

**Turn change (for player):**
```
"Your turn!"  (only shown to current player)
```
