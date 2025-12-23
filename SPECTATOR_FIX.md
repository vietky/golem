# Spectator Mid-Game Join Fix

## Issue
When a spectator joins a game that's already in progress, they couldn't see the current state of other players. Specifically:
- Player names showed as "Player 1", "Player 2" instead of actual names (e.g., "Alice", "Bob")
- This made it difficult for spectators to follow the game

## Root Cause
In `internal/server/server.go`, the `SerializeState()` function was using `p.Name` from the `game.Player` struct, which contains default names like "Player 1", "Player 2" set during game initialization.

However, the actual player names provided when players connect via WebSocket are stored in the `GameSession.PlayerNames` map, not in the `game.Player.Name` field.

When spectators joined mid-game, they received the serialized state with default names instead of the actual player names.

## Fix
Modified `SerializeState()` in `internal/server/server.go` to use the actual player names from the session's `PlayerNames` map:

```go
// Get player name from session, fallback to game state name
name := gs.PlayerNames[p.ID]
if name == "" {
    name = p.Name
}
```

This ensures that:
1. Actual player names are sent to spectators
2. If a player hasn't connected yet, it falls back to the default name
3. All clients (players and spectators) see consistent player names

## Files Changed
- `internal/server/server.go` - Fixed `SerializeState()` to use actual player names
- `internal/server/spectate_player_names_test.go` - Added comprehensive test

## Verification
Created and ran test `TestSpectatorSeesPlayerNames` which verifies:
- ✅ Spectators receive player names (e.g., "Alice", "Bob")
- ✅ Spectators can see player resources
- ✅ Spectators can see player hands
- ✅ Spectators can see current player and turn
- ✅ Spectators can see market cards

All spectator-related tests pass:
- `TestSpectatorOnlyWhenGameStarted` ✅
- `TestGameStateNotAffectedBySpectators` ✅
- `TestSpectatorReceivesUpdates` ✅
- `TestSpectatorSeesPlayerNames` ✅
- `TestSpectatorMode` ✅
- `TestListSessionsIncludesSpectatorCount` ✅
- `TestWebSocketSpectatorAfterGameStarted` ✅

## Testing
Run the test suite:
```bash
go test -v ./internal/server -run "Spectator"
```

Manual testing instructions: see `MANUAL_TEST_SPECTATOR.md`
