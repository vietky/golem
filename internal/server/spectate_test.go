package server

import (
	"testing"

	"golem_century/internal/config"
	"golem_century/internal/logger"
)

// TestGameServerCreation verifies that a game server can be created
func TestGameServerCreation(t *testing.T) {
	cfg := config.LoadConfig()
	log := logger.NewNopLogger()
	gs := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	if gs == nil {
		t.Fatal("Failed to create game server")
	}

	if gs.SessionsV2 == nil {
		t.Fatal("SessionsV2 should not be nil")
	}

	if len(gs.SessionsV2) != 0 {
		t.Errorf("Expected 0 sessions initially, got %d", len(gs.SessionsV2))
	}
}

// TestSessionCreationViaServer verifies that sessions can be created via game server
func TestSessionCreationViaServer(t *testing.T) {
	cfg := config.LoadConfig()
	log := logger.NewNopLogger()
	gs := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	// Create a test session
	sessionID := "test_session"
	session := gs.CreateSessionV2(sessionID, 2, 60)

	if session == nil {
		t.Fatal("Failed to create session")
	}

	if session.ID != sessionID {
		t.Errorf("Expected session ID '%s', got '%s'", sessionID, session.ID)
	}

	// Verify session is in the map
	gs.mu.RLock()
	_, exists := gs.SessionsV2[sessionID]
	gs.mu.RUnlock()

	if !exists {
		t.Fatal("Session not found in SessionsV2 map")
	}
}

// TestGetSessionV2 verifies that sessions can be retrieved
func TestGetSessionV2(t *testing.T) {
	cfg := config.LoadConfig()
	log := logger.NewNopLogger()
	gs := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	sessionID := "test_get_session"
	createdSession := gs.CreateSessionV2(sessionID, 2, 60)

	// Retrieve the session
	retrievedSession, exists := gs.GetSessionV2(sessionID)

	if !exists {
		t.Fatal("Session not found")
	}

	if retrievedSession != createdSession {
		t.Error("Retrieved session does not match created session")
	}

	if retrievedSession.ID != sessionID {
		t.Errorf("Expected session ID '%s', got '%s'", sessionID, retrievedSession.ID)
	}
}
