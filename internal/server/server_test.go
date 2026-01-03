package server

import (
	"testing"

	"golem_century/internal/logger"
)

// TestCreateSessionV2 verifies that a game session can be created
func TestCreateSessionV2(t *testing.T) {
	gs := NewGameServer(NewGameServerRequest{Logger: logger.NewNopLogger()})
	session := gs.CreateSessionV2("test_session", 2, 60)

	if session == nil {
		t.Fatal("Failed to create session")
	}

	if session.ID != "test_session" {
		t.Errorf("Expected session ID 'test_session', got '%s'", session.ID)
	}

	// GameState is only initialized after StartGame is called
	if session.GameState != nil {
		t.Error("GameState should be nil before StartGame is called")
	}
}
