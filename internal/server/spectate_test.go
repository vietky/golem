package server

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"golem_century/internal/config"
	"golem_century/internal/game"
	"golem_century/internal/logger"
)

// TestSpectatorMode tests the spectator functionality
func TestSpectatorMode(t *testing.T) {
	// Create game server
	cfg := config.LoadConfig()
	log := logger.NewNopLogger()
	gs := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	// Create a test session
	sessionID := "test_spectate_session"
	session := gs.CreateSession(sessionID, 2, 12345, game.NewRestOnlyAI())

	// Verify session was created
	if session == nil {
		t.Fatal("Failed to create session")
	}

	// Check initial state
	session.mu.RLock()
	if len(session.Spectators) != 0 {
		t.Errorf("Expected 0 spectators, got %d", len(session.Spectators))
	}
	if len(session.Connections) != 0 {
		t.Errorf("Expected 0 players, got %d", len(session.Connections))
	}
	session.mu.RUnlock()

	// Test AddSpectator
	spectatorID := "spectator_1"
	spectatorName := "Test Spectator"

	// Create a dummy WebSocket connection for testing
	// Note: In a real test, you'd use a proper WebSocket client
	session.AddSpectator(spectatorID, spectatorName, nil)

	session.mu.RLock()
	if len(session.Spectators) != 1 {
		t.Errorf("Expected 1 spectator after adding, got %d", len(session.Spectators))
	}
	if name, exists := session.SpectatorNames[spectatorID]; !exists || name != spectatorName {
		t.Errorf("Expected spectator name %s, got %s (exists: %v)", spectatorName, name, exists)
	}
	session.mu.RUnlock()

	// Test RemoveSpectator
	session.RemoveSpectator(spectatorID)

	session.mu.RLock()
	if len(session.Spectators) != 0 {
		t.Errorf("Expected 0 spectators after removing, got %d", len(session.Spectators))
	}
	session.mu.RUnlock()

	t.Log("Spectator mode test passed!")
}

// TestPlayerJoinedNotification tests that player joined notifications are sent
func TestPlayerJoinedNotification(t *testing.T) {
	// Create game server
	cfg := config.LoadConfig()
	log := logger.NewNopLogger()
	gs := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	// Create a test session
	sessionID := "test_notification_session"
	session := gs.CreateSession(sessionID, 2, 12345, game.NewRestOnlyAI())

	// Test BroadcastPlayerJoined
	playerID := 1
	playerName := "Test Player"
	avatar := "1"

	session.BroadcastPlayerJoined(playerID, playerName, avatar, false)

	// Wait a bit for broadcast to process
	time.Sleep(100 * time.Millisecond)

	// Note: In a real test, you would capture the broadcast message
	// For now, we just verify the function doesn't panic
	t.Log("Player joined notification test passed!")
}

// TestListSessionsIncludesSpectatorCount tests that the list sessions includes spectator count
func TestListSessionsIncludesSpectatorCount(t *testing.T) {
	// Create game server
	cfg := config.LoadConfig()
	log := logger.NewNopLogger()
	gs := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	// Create a test session
	sessionID := "test_list_session"
	session := gs.CreateSession(sessionID, 2, 12345, game.NewRestOnlyAI())

	// Add a spectator
	session.AddSpectator("spectator_1", "Spectator 1", nil)

	// Create a test HTTP request
	req := httptest.NewRequest("GET", "/api/list", nil)
	w := httptest.NewRecorder()

	// Call the handler
	gs.HandleListSessions(w, req)

	// Check response
	if w.Code != 200 {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	// Parse response
	var response map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	// Check if sessions array exists
	sessions, ok := response["sessions"].([]interface{})
	if !ok {
		t.Fatal("Expected sessions array in response")
	}

	// Find our test session
	found := false
	for _, s := range sessions {
		sessionMap, ok := s.(map[string]interface{})
		if !ok {
			continue
		}

		sid, _ := sessionMap["sessionID"].(string)
		if sid == sessionID {
			found = true

			// Check if spectatorCount field exists
			spectatorCount, exists := sessionMap["spectatorCount"]
			if !exists {
				t.Error("spectatorCount field missing from session response")
			}

			// Check if value is correct
			if spectatorCount != float64(1) {
				t.Errorf("Expected spectatorCount 1, got %v", spectatorCount)
			}

			break
		}
	}

	if !found {
		t.Error("Test session not found in list response")
	}

	t.Log("List sessions spectator count test passed!")
}
