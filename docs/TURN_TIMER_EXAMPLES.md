# Turn Timer Usage Examples

## Creating a Session with Custom Turn Timeout

### Example 1: Standard Game with 30-second Timeout

```bash
curl -X POST http://localhost:8080/api/create \
  -H "Content-Type: application/json" \
  -d '{
    "numPlayers": 3,
    "turnTimeout": 30
  }'
```

Response:
```json
{
  "sessionID": "session_1734699123456",
  "numPlayers": 3,
  "turnTimeout": 30
}
```

### Example 2: Quick Game with 15-second Timeout

```bash
curl -X POST http://localhost:8080/api/create \
  -H "Content-Type: application/json" \
  -d '{
    "numPlayers": 2,
    "turnTimeout": 15,
    "sessionID": "quick-game"
  }'
```

### Example 3: Relaxed Game with 2-minute Timeout

```bash
curl -X POST http://localhost:8080/api/create \
  -H "Content-Type: application/json" \
  -d '{
    "numPlayers": 4,
    "turnTimeout": 120
  }'
```

### Example 4: Single Player with Custom Timeout

```bash
curl -X POST http://localhost:8080/api/single \
  -H "Content-Type: application/json" \
  -d '{
    "numAI": 2,
    "turnTimeout": 45
  }'
```

## Frontend Integration

### JavaScript Example: Handling Turn Timeout Messages

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8080/ws?session=quick-game&player=1&name=Alice');

// Listen for messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // Handle turn timeout notification
  if (data.type === 'turnTimeout') {
    console.log(`Player ${data.playerID} timed out!`);
    showNotification(data.message);
    // Example: "Player 2 took too long. AI is making a move."
  }
  
  // Handle regular game state updates
  if (data.type === 'state') {
    updateGameUI(data);
  }
};

function showNotification(message) {
  // Display notification to user
  const notification = document.createElement('div');
  notification.className = 'timeout-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => notification.remove(), 3000);
}
```

### React Example

```jsx
import { useEffect, useState } from 'react';

function GameComponent({ sessionId, playerId }) {
  const [timeoutMessage, setTimeoutMessage] = useState(null);
  
  useEffect(() => {
    const ws = new WebSocket(
      `ws://localhost:8080/ws?session=${sessionId}&player=${playerId}&name=Player${playerId}`
    );
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'turnTimeout') {
        setTimeoutMessage(data.message);
        setTimeout(() => setTimeoutMessage(null), 3000);
      }
      
      if (data.type === 'state') {
        // Update game state
      }
    };
    
    return () => ws.close();
  }, [sessionId, playerId]);
  
  return (
    <div>
      {timeoutMessage && (
        <div className="timeout-banner">
          ⚠️ {timeoutMessage}
        </div>
      )}
      {/* Rest of game UI */}
    </div>
  );
}
```

## Testing the Turn Timer

### Manual Test Script

```bash
# 1. Create a session with 10-second timeout for testing
curl -X POST http://localhost:8080/api/create \
  -H "Content-Type: application/json" \
  -d '{"numPlayers": 2, "turnTimeout": 10, "sessionID": "test-timeout"}'

# 2. Connect as Player 1 using a WebSocket client (e.g., wscat)
# wscat -c "ws://localhost:8080/ws?session=test-timeout&player=1&name=TestPlayer"

# 3. Wait 10 seconds without making a move
# Expected: You should receive a turnTimeout message
# Expected: AI makes a move automatically
# Expected: Turn advances to Player 2

# 4. Verify the timeout message format:
# {
#   "type": "turnTimeout",
#   "playerID": 1,
#   "message": "TestPlayer took too long. AI is making a move."
# }
```

### Automated Test (Go)

```go
package server_test

import (
    "testing"
    "time"
    "golem_century/internal/game"
    "golem_century/internal/server"
)

func TestTurnTimeout(t *testing.T) {
    // Create a session with 2-second timeout
    session := server.NewGameSession("test", 2, 12345)
    session.TurnTimeout = 2 * time.Second
    
    // Mark player 1 as human, player 2 as AI
    session.GameState.Players[0].IsAI = false
    session.GameState.Players[1].IsAI = true
    session.Engine.AI = game.NewBasicAI(session.GameState.RNG)
    
    // Start game loop in background
    go session.RunGameLoop()
    
    // Wait for timeout to trigger
    time.Sleep(3 * time.Second)
    
    // Verify turn advanced (current turn should be 1, not 0)
    if session.GameState.CurrentTurn == 0 {
        t.Error("Expected turn to advance after timeout")
    }
}
```

## CSS Styling Example

```css
/* Timeout notification styling */
.timeout-notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-weight: 600;
  z-index: 1000;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.timeout-banner {
  background: #fbbf24;
  color: #78350f;
  padding: 12px 20px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
```

## Advanced: Implementing Custom AI Strategy

```go
package game

import "math/rand"

// ConservativeAI implements a conservative playing strategy
type ConservativeAI struct {
    rng *rand.Rand
}

func NewConservativeAI(rng *rand.Rand) *ConservativeAI {
    return &ConservativeAI{rng: rng}
}

func (ai *ConservativeAI) GetName() string {
    return "ConservativeAI"
}

func (ai *ConservativeAI) ChooseAction(player *Player, market *Market, gameState *GameState) Action {
    // Conservative strategy: prefer resting and accumulating resources
    
    // Only claim point cards when absolutely ready
    if len(player.PointCards) >= 3 {
        if claimable := player.CanClaimAny(market.PointCards); claimable != nil {
            for i, card := range market.PointCards {
                if card.ID == claimable.ID {
                    return Action{Type: ClaimPointCard, CardIndex: i}
                }
            }
        }
    }
    
    // Prefer resting over playing cards
    if len(player.PlayedCards) > 0 {
        return Action{Type: Rest}
    }
    
    // Only acquire cards when we have excess resources
    if player.Resources.Total() > 8 {
        for i := 0; i < len(market.ActionCards); i++ {
            cost := market.GetActionCardCost(i)
            if cost != nil && player.Resources.HasAll(cost, 1) {
                return Action{Type: AcquireCard, CardIndex: i}
            }
        }
    }
    
    // Play cards conservatively
    for i, card := range player.Hand {
        if card.Type == ActionCard && card.ActionType == Produce {
            action := Action{Type: PlayCard, CardIndex: i, Multiplier: 1}
            if card.CanPlay(player, action) {
                return action
            }
        }
    }
    
    // Default to rest
    return Action{Type: Rest}
}

// Usage in session:
// session.Engine.AI = game.NewConservativeAI(session.GameState.RNG)
```

## Configuration Tips

### Recommended Timeout Settings

| Game Type | Players | Recommended Timeout | Reason |
|-----------|---------|---------------------|---------|
| Casual | 2-3 | 60s (default) | Balanced pace |
| Quick | 2-4 | 15-30s | Fast-paced action |
| Tournament | 2-5 | 90-120s | Strategic thinking time |
| Learning | 2-3 | 120-180s | Extra time for new players |
| AI Practice | 1+AI | 30s | Keeps pace with AI turns |

### Disable Timeout

To effectively disable the timeout, set a very high value:

```bash
curl -X POST http://localhost:8080/api/create \
  -H "Content-Type: application/json" \
  -d '{
    "numPlayers": 3,
    "turnTimeout": 3600
  }'
```

This sets a 1-hour timeout, which is essentially unlimited for most games.
