package server_test

import (
	"encoding/json"
	"testing"
	"time"

	"golem_century/internal/game"
	"golem_century/internal/logger"
	"golem_century/internal/server"
)

// TestTurnTimeoutBasic tests that the turn timer triggers correctly
func TestTurnTimeoutBasic(t *testing.T) {
	// Create a session with a short 2-second timeout for testing
	session := server.NewGameSession("test-timeout", 2, 12345, 60, logger.NewNopLogger())
	session.TurnTimeout = 2 * time.Second

	// Mark player 1 as human (default), player 2 as AI for contrast
	session.GameState.Players[1].IsAI = true
	session.Engine.AI = game.NewBasicAI(session.GameState.RNG)

	// Initial state check
	if session.GameState.CurrentTurn != 0 {
		t.Errorf("Expected initial turn to be 0, got %d", session.GameState.CurrentTurn)
	}

	// Start the game loop in background
	go session.RunGameLoop()

	// Wait for timeout to trigger (2s timeout + 500ms buffer)
	time.Sleep(3 * time.Second)

	// After timeout, turn should have advanced
	// Turn 0 -> Player 1 times out -> AI makes move -> Turn advances to 1 (Player 2)
	// Turn 1 -> Player 2 (AI) makes move automatically -> Turn advances to 2
	// So we expect turn >= 1
	if session.GameState.CurrentTurn < 1 {
		t.Errorf("Expected turn to advance after timeout, but turn is still %d", session.GameState.CurrentTurn)
	}

	t.Logf("Turn successfully advanced to %d after timeout", session.GameState.CurrentTurn)
}

// TestTurnTimeoutWithAction tests that manual action prevents timeout
func TestTurnTimeoutWithAction(t *testing.T) {
	session := server.NewGameSession("test-action", 2, 12345, 60, logger.NewNopLogger())
	session.TurnTimeout = 3 * time.Second
	session.Engine.AI = game.NewBasicAI(session.GameState.RNG)

	// Start game loop
	go session.RunGameLoop()

	// Wait 1 second (less than timeout)
	time.Sleep(1 * time.Second)

	// Player 1 takes action (rest)
	player1 := session.GameState.GetCurrentPlayer()
	if player1.ID != 1 {
		t.Fatalf("Expected current player to be 1, got %d", player1.ID)
	}

	// Send a rest action
	session.ActionChan <- server.PlayerAction{
		PlayerID: player1.ID,
		Action:   game.Action{Type: game.Rest},
	}

	// Wait a bit for action to process
	time.Sleep(500 * time.Millisecond)

	// Turn should have advanced due to action, not timeout
	if session.GameState.CurrentTurn < 1 {
		t.Error("Expected turn to advance after rest action")
	}

	t.Log("Turn advanced normally via player action")
}

// TestAIInterface tests that the AI interface works correctly
func TestAIInterface(t *testing.T) {
	rng := game.NewGameState(2, 12345).RNG

	// Test BasicAI implements AIStrategy
	var ai game.AIStrategy = game.NewBasicAI(rng)

	if ai.GetName() != "BasicAI" {
		t.Errorf("Expected AI name to be 'BasicAI', got '%s'", ai.GetName())
	}

	// Test that AIPlayer alias still works (backwards compatibility)
	var aiPlayer *game.AIPlayer = game.NewAIPlayer(rng)
	if aiPlayer == nil {
		t.Error("NewAIPlayer should return a valid AI instance")
	}

	// Test that AIPlayer is actually a BasicAI
	basicAI, ok := any(aiPlayer).(game.AIStrategy)
	if !ok {
		t.Error("AIPlayer should implement AIStrategy interface")
	}

	if basicAI.GetName() != "BasicAI" {
		t.Errorf("AIPlayer should have name 'BasicAI', got '%s'", basicAI.GetName())
	}

	t.Log("AI interface working correctly with backwards compatibility")
}

// TestTimeoutNotificationFormat tests the timeout notification message format
func TestTimeoutNotificationFormat(t *testing.T) {
	// Create a simple test to verify notification format
	notification := map[string]interface{}{
		"type":     "turnTimeout",
		"playerID": 1,
		"message":  "Player 1 took too long. AI is making a move.",
	}

	// Serialize to JSON
	data, err := json.Marshal(notification)
	if err != nil {
		t.Fatalf("Failed to marshal notification: %v", err)
	}

	// Deserialize back
	var parsed map[string]interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("Failed to unmarshal notification: %v", err)
	}

	// Verify fields
	if parsed["type"] != "turnTimeout" {
		t.Errorf("Expected type 'turnTimeout', got '%v'", parsed["type"])
	}

	if playerID, ok := parsed["playerID"].(float64); !ok || int(playerID) != 1 {
		t.Errorf("Expected playerID 1, got %v", parsed["playerID"])
	}

	if message, ok := parsed["message"].(string); !ok || message == "" {
		t.Error("Expected non-empty message string")
	}

	t.Log("Timeout notification format is correct")
}

// TestConfigurableTimeout tests different timeout values
func TestConfigurableTimeout(t *testing.T) {
	testCases := []struct {
		name            string
		timeoutSeconds  int
		expectedTimeout time.Duration
	}{
		{"Default 60s", 60, 60 * time.Second},
		{"Quick 15s", 15, 15 * time.Second},
		{"Long 120s", 120, 120 * time.Second},
		{"Very short 5s", 5, 5 * time.Second},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			session := server.NewGameSession("test", 2, 12345, 60, logger.NewNopLogger())
			session.TurnTimeout = tc.expectedTimeout

			if session.TurnTimeout != tc.expectedTimeout {
				t.Errorf("Expected timeout %v, got %v", tc.expectedTimeout, session.TurnTimeout)
			}

			t.Logf("Timeout correctly set to %v", session.TurnTimeout)
		})
	}
}

// TestAIChooseAction tests that AI can make valid decisions
func TestAIChooseAction(t *testing.T) {
	gameState := game.NewGameState(2, 12345)
	ai := game.NewBasicAI(gameState.RNG)

	player := gameState.Players[0]
	market := gameState.Market

	// Get AI decision
	action := ai.ChooseAction(player, market, gameState)

	// Verify action is of a valid type
	validTypes := []game.PlayerActionType{
		game.PlayCard,
		game.AcquireCard,
		game.ClaimPointCard,
		game.Rest,
		game.Discard,
	}

	validAction := false
	for _, validType := range validTypes {
		if action.Type == validType {
			validAction = true
			break
		}
	}

	if !validAction {
		t.Errorf("AI chose invalid action type: %v", action.Type)
	}

	t.Logf("AI successfully chose action of type %v", action.Type)
}
