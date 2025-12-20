# Turn Timer and AI Interface Updates

## Summary

This update adds a configurable turn timer system and refactors the AI code into a reusable interface pattern.

## Features Added

### 1. Turn Timer System

- **Default Timeout**: 60 seconds per turn (configurable)
- **Automatic AI Takeover**: When a player exceeds the timeout, the AI automatically makes a move for them
- **Timeout Notifications**: Clients receive a `turnTimeout` message when a player is too slow
- **Per-Session Configuration**: Turn timeout can be configured when creating a game session

### 2. AI Interface Refactoring

- **`AIStrategy` Interface**: New interface that defines the contract for AI implementations
  ```go
  type AIStrategy interface {
      ChooseAction(player *Player, market *Market, gameState *GameState) Action
      GetName() string
  }
  ```
- **`BasicAI`**: The existing AI logic refactored to implement `AIStrategy`
- **Backwards Compatibility**: `AIPlayer` is now an alias for `BasicAI`

## API Changes

### Create Session Endpoint

**Endpoint**: `POST /api/create`

**New Request Parameter**:
```json
{
  "numPlayers": 3,
  "seed": 12345,
  "sessionID": "optional-custom-id",
  "turnTimeout": 30  // NEW: Optional, in seconds (default 60)
}
```

**Response** (updated):
```json
{
  "sessionID": "session_123456",
  "numPlayers": 3,
  "turnTimeout": 30  // NEW: Confirms the turn timeout setting
}
```

### Create Single Player Endpoint

**Endpoint**: `POST /api/create-single`

**New Request Parameter**:
```json
{
  "numAI": 2,
  "seed": 12345,
  "sessionID": "optional-custom-id",
  "turnTimeout": 45  // NEW: Optional, in seconds (default 60)
}
```

**Response** (updated):
```json
{
  "sessionID": "single_123456",
  "numPlayers": 3,
  "numAI": 2,
  "mode": "singlePlayer",
  "turnTimeout": 45  // NEW: Confirms the turn timeout setting
}
```

## WebSocket Messages

### New Message Type: Turn Timeout

When a player's turn times out, all clients receive:

```json
{
  "type": "turnTimeout",
  "playerID": 2,
  "message": "Player 2 took too long. AI is making a move."
}
```

## How It Works

### Turn Timer Flow

1. **Turn Start**: When a player's turn begins, `TurnStartTime` is set to the current time
2. **Monitoring**: The game loop checks every 100ms if the current player's turn has exceeded `TurnTimeout`
3. **Timeout Triggered**: If a human player exceeds the timeout:
   - A `turnTimeout` notification is broadcast to all clients
   - The AI takes over and makes a move for the player
   - The turn advances to the next player
4. **Timer Reset**: When a turn ends (either by player action or timeout), the timer resets for the next player

### AI Takeover Logic

When a timeout occurs, the `handleTurnTimeout` function:
1. Sends a notification to all players
2. Handles any pending discard requirements first
3. Uses the `AIStrategy` implementation to choose an optimal move
4. Executes the move and broadcasts the updated game state
5. Advances to the next turn

## Implementation Details

### GameSession Changes

**New Fields**:
- `TurnTimeout time.Duration`: Maximum time allowed per turn (default 60s)
- `TurnStartTime time.Time`: When the current turn started

**New Method**:
- `handleTurnTimeout(player *game.Player)`: Handles the timeout scenario

### Engine Changes

**Updated Field**:
- `AI AIStrategy`: Changed from `*AIPlayer` to the interface type

This allows for easy swapping of AI implementations:
```go
session.Engine.AI = game.NewBasicAI(rng)
// In the future:
// session.Engine.AI = game.NewAdvancedAI(rng)
```

## Benefits

### 1. Improved User Experience
- Games don't stall when a player is inactive
- Clear notifications when AI takes over
- Configurable timeouts for different game paces

### 2. Code Reusability
- AI logic is now interface-based and easy to extend
- Multiple AI strategies can be implemented without modifying existing code
- AI can be used for both AI players and timeout scenarios

### 3. Flexibility
- Room creators can set custom timeout values
- Different game modes can have different timeout settings
- Easy to disable timeout by setting a very high value (e.g., 3600 seconds)

## Future Enhancements

With the new `AIStrategy` interface, you can easily implement:

1. **Advanced AI**: More sophisticated decision-making algorithms
2. **Difficulty Levels**: Different AI strategies for easy/medium/hard
3. **Learning AI**: AI that adapts based on player behavior
4. **Custom AI**: Players could even provide custom AI implementations

### Example: Creating a New AI Strategy

```go
type AggressiveAI struct {
    rng *rand.Rand
}

func NewAggressiveAI(rng *rand.Rand) *AggressiveAI {
    return &AggressiveAI{rng: rng}
}

func (ai *AggressiveAI) GetName() string {
    return "AggressiveAI"
}

func (ai *AggressiveAI) ChooseAction(player *Player, market *Market, gameState *GameState) Action {
    // Always try to claim point cards aggressively
    // Implement custom logic here
    // ...
}

// Then use it:
session.Engine.AI = game.NewAggressiveAI(session.GameState.RNG)
```

## Testing Recommendations

1. **Turn Timeout Testing**:
   - Create a session with a short timeout (e.g., 5 seconds)
   - Wait without making a move
   - Verify the timeout notification appears
   - Verify the AI makes a valid move

2. **AI Interface Testing**:
   - Implement a simple test AI strategy
   - Verify it can be swapped in place of BasicAI
   - Test that both AI players and timeout scenarios work

3. **Configuration Testing**:
   - Create sessions with various timeout values
   - Verify the timeout is respected
   - Test with timeout disabled (very high value)

## Migration Notes

- **Backwards Compatible**: Existing code continues to work
- **No Database Changes**: All changes are in-memory
- **No Frontend Changes Required**: The timeout notification is optional to handle
- Existing `NewAIPlayer()` calls still work due to the alias
