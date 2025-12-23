# Lobby System Bug Fixes

## Overview
This document describes the fixes applied to the lobby system to resolve AI player duplication, improve naming, add player shuffling, and enhance UI visibility.

## Issues Fixed

### 1. AI Player Duplication Bug ✅
**Problem**: Adding Smart AI resulted in duplicating a second player that couldn't be played.

**Root Cause**: The game engine had a single `AI` field that was overwritten for each AI player during game start. This meant only the last AI player's strategy was stored.

**Solution**:
- Added `AIStrategies map[int]game.AIStrategy` to `GameSession` struct in [server.go](internal/server/server.go)
- Modified `StartGame()` in [lobby.go](internal/server/lobby.go) to store each AI player's strategy with their player ID as the key
- Updated `executeAITurn()` in [server.go](internal/server/server.go) to look up the correct AI strategy for each player from the map

**Files Changed**:
- `internal/server/server.go` - Added AIStrategies field and initialized it in NewGameSession
- `internal/server/lobby.go` - Modified StartGame to populate AIStrategies map
- `internal/server/server.go` - Updated executeAITurn to use per-player AI strategy

### 2. AI Player Naming Enhancement ✅
**Problem**: AI players had generic names like "AI Bot 1" or "Passive AI 1".

**Requirement**: AI players should have a prefix with AI type and a random name.

**Solution**:
- Enhanced `getAIName()` function in [slot.go](internal/server/slot.go)
- Added array of 20 diverse AI names (Alpha, Beta, Nova, Orion, Phoenix, etc.)
- AI names now follow format: `[Smart AI] RandomName` or `[Passive AI] RandomName`

**Example Names**:
- `[Smart AI] Alpha`
- `[Passive AI] Nexus`
- `[Smart AI] Quantum`

**Files Changed**:
- `internal/server/slot.go` - Updated getAIName function with random name pool

### 3. Player Shuffling ✅
**Problem**: Players always started in the same order (host first, then other players/AI in slot order).

**Requirement**: When the host starts the game, shuffle the player list in random order and start with the first player in the list.

**Solution**:
- Modified `StartGame()` in [lobby.go](internal/server/lobby.go) to shuffle occupied slots before assigning player IDs
- Used Fisher-Yates shuffle algorithm with session creation time as seed for deterministic randomness
- Players now start in random order each game

**Files Changed**:
- `internal/server/lobby.go` - Added shuffle logic to StartGame function

### 4. Lobby UI Visibility Enhancement ✅
**Problem**: Background image was hiding almost all components in the lobby room.

**Requirement**: Make the lobby room clearer so components are easily visible.

**Solution**:
- Changed main container from `bg-white/10` to `bg-black/70` with stronger backdrop blur
- Updated slot cards from `bg-white/10` to `bg-black/40` with backdrop blur
- Enhanced border visibility from `border-white/20` to `border-white/30`
- Improved info boxes and buttons with darker semi-transparent backgrounds
- Added shadow effects for better depth perception

**Visual Changes**:
- Main lobby panel: Darker semi-transparent black background (70% opacity)
- Slot cards: 40% black background with subtle blur effect
- Better text contrast with white text on dark backgrounds
- Enhanced borders and shadows for better component separation

**Files Changed**:
- `web/react-frontend/src/components/RoomLobby.jsx` - Updated styling classes

## Testing

All tests pass successfully:

```bash
# Backend tests
go test ./internal/server/... -v
# Result: All lobby and slot tests PASS (32 tests)

# Frontend build
cd web/react-frontend && npm run build
# Result: Successful build
```

### Updated Test
- Modified `StartGame with mixed players and AI` test in [lobby_test.go](internal/server/lobby_test.go) to account for random player order
- Now counts AI vs human players instead of checking specific positions

## API Changes

No breaking API changes. All existing endpoints remain compatible.

## Usage Example

```javascript
// Frontend: Setting up a lobby with AI
1. Host creates a room
2. Host adds Smart AI to slot 1: setSlotAI(slotIndex: 1, aiType: "basic")
3. Host adds Passive AI to slot 2: setSlotAI(slotIndex: 2, aiType: "rest")
4. Real player joins slot 3
5. Host starts game: startGame()

// Result:
// - 4 players total (host + 2 AI + 1 real player)
// - Players are shuffled in random order
// - AI players have names like "[Smart AI] Orion" and "[Passive AI] Delta"
// - Each AI player operates independently with their own strategy
```

## Architecture Improvements

### Before
```
Engine {
  AI: AIStrategy  // Single AI for all AI players - BUG!
}
```

### After
```
GameSession {
  AIStrategies: map[int]AIStrategy  // Per-player AI strategies ✅
}

// During AI turn:
aiStrategy := gs.AIStrategies[player.ID]  // Get correct AI for this player
```

## Performance Impact

Minimal performance impact:
- Map lookup for AI strategies: O(1)
- Shuffle algorithm: O(n) where n = number of players (max 4)
- UI rendering unchanged

## Backward Compatibility

✅ Fully backward compatible:
- Existing single-player games still work (use Engine.AI as fallback)
- WebSocket protocol unchanged
- All existing handlers work without modification

## Known Limitations

1. Shuffle uses session creation time as seed - same seed will produce same shuffle (deterministic for testing)
2. AI name pool has 20 names - will repeat if you have more than 20 AI players (unlikely in 2-4 player games)

## Future Enhancements

Potential improvements:
1. Add more AI types (Aggressive, Defensive, etc.)
2. Allow custom AI names
3. Add AI difficulty levels
4. Persist AI strategies across reconnections
