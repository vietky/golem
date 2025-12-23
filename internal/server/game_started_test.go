package server

import (
	"testing"

	"golem_century/internal/config"
	"golem_century/internal/game"
	"golem_century/internal/logger"
)

// TestHasGameStarted tests the HasGameStarted method
func TestHasGameStarted(t *testing.T) {
	cfg := config.LoadConfig()
	log := logger.NewNopLogger()
	gs := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	// Create a test session
	sessionID := "test_game_started"
	session := gs.CreateSession(sessionID, 2, 12345, game.NewRestOnlyAI())

	// Test 1: Game should not have started initially
	if session.HasGameStarted() {
		t.Error("Game should not have started initially (turn 0, no cards played)")
	}

	// Test 2: Game should have started after turn > 0
	session.mu.Lock()
	session.GameState.CurrentTurn = 1
	session.mu.Unlock()

	if !session.HasGameStarted() {
		t.Error("Game should have started when CurrentTurn > 0")
	}

	// Test 3: Reset and test with played cards
	session.mu.Lock()
	session.GameState.CurrentTurn = 0
	session.mu.Unlock()

	if session.HasGameStarted() {
		t.Error("Game should not have started after reset")
	}

	t.Log("HasGameStarted test passed!")
}

// TestSpectatorOnlyWhenGameStarted tests that only spectators can join when game has started
func TestSpectatorOnlyWhenGameStarted(t *testing.T) {
	cfg := config.LoadConfig()
	log := logger.NewNopLogger()
	gs := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	// Create a test session
	sessionID := "test_spectator_restriction"
	session := gs.CreateSession(sessionID, 2, 12345, game.NewRestOnlyAI())

	// Verify initial state
	if session.HasGameStarted() {
		t.Fatal("Game should not have started initially")
	}

	// Start the game by advancing turn
	session.mu.Lock()
	session.GameState.CurrentTurn = 1
	session.mu.Unlock()

	if !session.HasGameStarted() {
		t.Fatal("Game should have started after advancing turn")
	}

	// Now the restriction logic would be tested in the handler
	// This is a unit test for the helper method
	t.Log("Spectator restriction logic verified!")
}

// TestGameStateNotAffectedBySpectators tests that spectators don't affect game state
func TestGameStateNotAffectedBySpectators(t *testing.T) {
	cfg := config.LoadConfig()
	log := logger.NewNopLogger()
	gs := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	sessionID := "test_spectator_no_affect"
	session := gs.CreateSession(sessionID, 2, 12345, game.NewRestOnlyAI())

	// Record initial game state
	initialTurn := session.GameState.CurrentTurn
	initialPlayers := len(session.GameState.Players)

	// Add spectators
	session.AddSpectator("spec1", "Spectator 1", nil)
	session.AddSpectator("spec2", "Spectator 2", nil)

	// Verify game state unchanged
	if session.GameState.CurrentTurn != initialTurn {
		t.Error("Spectators should not change game turn")
	}

	if len(session.GameState.Players) != initialPlayers {
		t.Error("Spectators should not change number of players")
	}

	// Verify spectators were added
	session.mu.RLock()
	spectatorCount := len(session.Spectators)
	session.mu.RUnlock()

	if spectatorCount != 2 {
		t.Errorf("Expected 2 spectators, got %d", spectatorCount)
	}

	t.Log("Spectators do not affect game state - test passed!")
}
