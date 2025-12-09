package server

import (
	"encoding/json"
	"testing"
	"time"

	"golem_century/internal/game"
	"golem_century/internal/logger"
)

// TestSerializeStateIncludesCaravan ensures serialized state includes both resources and caravan
func TestSerializeStateIncludesCaravan(t *testing.T) {
	gs := NewGameServer(NewGameServerRequest{Logger: logger.NewNopLogger()})
	session := gs.CreateSession("test_session", 2, 42)

	state := session.SerializeState()
	// Marshal/unmarshal to normalize to JSON types (slices -> []interface{})
	b, err := json.Marshal(state)
	if err != nil {
		t.Fatalf("failed to marshal state: %v", err)
	}
	var decoded map[string]interface{}
	if err := json.Unmarshal(b, &decoded); err != nil {
		t.Fatalf("failed to unmarshal state json: %v", err)
	}

	playersIface, ok := decoded["players"].([]interface{})
	if !ok {
		t.Fatalf("unexpected players type in decoded state: %T", decoded["players"])
	}
	if len(playersIface) == 0 {
		t.Fatalf("no players in decoded state")
	}
	first, ok := playersIface[0].(map[string]interface{})
	if !ok {
		t.Fatalf("unexpected player entry type: %T", playersIface[0])
	}
	if _, ok := first["resources"]; !ok {
		t.Fatalf("resources missing in serialized player")
	}
	if _, ok := first["caravan"]; !ok {
		t.Fatalf("caravan missing in serialized player")
	}
}

// TestActionProcessingRoundTrip sends a Rest action and ensures the game loop processes it (current turn advances)
func TestActionProcessingRoundTrip(t *testing.T) {
	gs := NewGameServer(NewGameServerRequest{Logger: logger.NewNopLogger()})
	session := gs.CreateSession("test_session_rt", 2, 99)

	// Give the session a moment to start its goroutines
	time.Sleep(50 * time.Millisecond)

	initialTurn := session.GameState.CurrentTurn

	// Send a Rest action for current player (player IDs are 1-indexed)
	playerID := session.GameState.GetCurrentPlayer().ID
	session.ActionChan <- PlayerAction{
		PlayerID: playerID,
		Action:   game.Action{Type: game.Rest},
	}

	// Wait up to 1s for the turn to advance
	deadline := time.Now().Add(1 * time.Second)
	for time.Now().Before(deadline) {
		if session.GameState.CurrentTurn != initialTurn {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}

	t.Fatalf("action was not processed within timeout; currentTurn still %d", session.GameState.CurrentTurn)
}
