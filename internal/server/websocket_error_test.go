package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"golem_century/internal/config"
	"golem_century/internal/game"
	"golem_century/internal/logger"

	"github.com/gorilla/websocket"
)

// TestWebSocketErrorHandling tests that errors are sent via WebSocket instead of HTTP JSON
func TestWebSocketErrorHandling(t *testing.T) {
	// Create game server
	cfg := config.LoadConfig()
	log := logger.NewNopLogger()
	s := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	// Create test HTTP server with WebSocket handler
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", s.HandleWebSocket)
	server := httptest.NewServer(mux)
	defer server.Close()

	// Convert http:// to ws://
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?session=invalid_session&playerID=1"

	// Connect to WebSocket
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect to WebSocket: %v", err)
	}
	defer ws.Close()

	// Read the error message - should be sent via WebSocket
	var msg map[string]interface{}
	err = ws.ReadJSON(&msg)
	if err != nil {
		t.Fatalf("Failed to read WebSocket message: %v", err)
	}

	// Verify error message format
	if msg["type"] != "error" {
		t.Errorf("Expected type 'error', got %v", msg["type"])
	}

	if msg["error"] == nil {
		t.Errorf("Expected error message, got nil")
	}

	errorMsg, ok := msg["error"].(string)
	if !ok {
		t.Errorf("Expected error to be string, got %T", msg["error"])
	}

	if errorMsg != "Session not found" {
		t.Errorf("Expected 'Session not found', got %s", errorMsg)
	}

	t.Logf("WebSocket error handling test passed! Received error via WebSocket: %s", errorMsg)
}

// TestWebSocketSpectatorAfterGameStarted tests that spectators can join after game starts
func TestWebSocketSpectatorAfterGameStarted(t *testing.T) {
	// Create game server
	cfg := config.LoadConfig()
	log := logger.NewNopLogger()
	s := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	// Create a session
	sessionID := "test_spectator_session"
	s.CreateSession(sessionID, 2, 12345, game.NewRestOnlyAI())

	// Start the game by simulating a player action
	session, exists := s.GetSession(sessionID)
	if !exists {
		t.Fatal("Session should exist")
	}

	// Simulate game start by advancing turn
	session.GameState.CurrentTurn = 1

	// Create test HTTP server with WebSocket handler
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", s.HandleWebSocket)
	server := httptest.NewServer(mux)
	defer server.Close()

	// Convert http:// to ws://
	wsURL := fmt.Sprintf("ws%s/ws?session=%s&playerID=1&spectate=true",
		strings.TrimPrefix(server.URL, "http"), sessionID)

	// Connect as spectator
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect to WebSocket as spectator: %v", err)
	}
	defer ws.Close()

	// Read the initial message - should be spectatorAssigned
	var msg map[string]interface{}
	err = ws.ReadJSON(&msg)
	if err != nil {
		t.Fatalf("Failed to read WebSocket message: %v", err)
	}

	// Verify spectator assignment
	if msg["type"] != "spectatorAssigned" {
		// If not spectatorAssigned, check if it's an error
		if msg["type"] == "error" {
			t.Errorf("Spectator should be allowed to join after game started, got error: %v", msg["error"])
		} else {
			t.Errorf("Expected type 'spectatorAssigned', got %v", msg["type"])
		}
	}

	t.Logf("Spectator successfully joined game after it started!")
}

// TestWebSocketPlayerRejectedAfterGameStarted tests that players are rejected after game starts
func TestWebSocketPlayerRejectedAfterGameStarted(t *testing.T) {
	// Create game server
	cfg := config.LoadConfig()
	log := logger.NewNopLogger()
	s := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	// Create a session
	sessionID := "test_rejection_session"
	s.CreateSession(sessionID, 2, 12345, game.NewRestOnlyAI())

	// Start the game by simulating a player action
	session, exists := s.GetSession(sessionID)
	if !exists {
		t.Fatal("Session should exist")
	}

	// Simulate game start by advancing turn
	session.GameState.CurrentTurn = 1

	// Create test HTTP server with WebSocket handler
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", s.HandleWebSocket)
	server := httptest.NewServer(mux)
	defer server.Close()

	// Convert http:// to ws://
	wsURL := fmt.Sprintf("ws%s/ws?session=%s&playerID=1",
		strings.TrimPrefix(server.URL, "http"), sessionID)

	// Try to connect as player (without spectate=true)
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect to WebSocket: %v", err)
	}
	defer ws.Close()

	// Read the error message
	var msg map[string]interface{}
	err = ws.ReadJSON(&msg)
	if err != nil {
		t.Fatalf("Failed to read WebSocket message: %v", err)
	}

	// Verify error message
	if msg["type"] != "error" {
		t.Errorf("Expected type 'error', got %v", msg["type"])
	}

	errorMsg, ok := msg["error"].(string)
	if !ok {
		t.Errorf("Expected error to be string, got %T", msg["error"])
	}

	expectedError := "Game has already started. You can only spectate."
	if errorMsg != expectedError {
		t.Errorf("Expected '%s', got '%s'", expectedError, errorMsg)
	}

	t.Logf("Player correctly rejected after game started! Error: %s", errorMsg)
}

// TestWebSocketPlayerNameHandling tests that player names are handled correctly
func TestWebSocketPlayerNameHandling(t *testing.T) {
	// Create game server
	cfg := config.LoadConfig()
	log := logger.NewNopLogger()
	s := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	// Create a session
	sessionID := "test_name_session"
	s.CreateSession(sessionID, 2, 12345, game.NewRestOnlyAI())

	// Create test HTTP server with WebSocket handler
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", s.HandleWebSocket)
	server := httptest.NewServer(mux)
	defer server.Close()

	// Convert http:// to ws://
	wsURL := fmt.Sprintf("ws%s/ws?session=%s&playerID=1&name=TestPlayer",
		strings.TrimPrefix(server.URL, "http"), sessionID)

	// Connect to WebSocket
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect to WebSocket: %v", err)
	}
	defer ws.Close()

	// Read the initial message - should be playerAssigned
	var msg map[string]interface{}
	err = ws.ReadJSON(&msg)
	if err != nil {
		t.Fatalf("Failed to read WebSocket message: %v", err)
	}

	// Verify player assignment message
	if msg["type"] != "playerAssigned" {
		t.Errorf("Expected type 'playerAssigned', got %v", msg["type"])
	}

	// Verify player was added to session
	session, exists := s.GetSession(sessionID)
	if !exists {
		t.Fatal("Session should exist")
	}

	playerName, exists := session.PlayerNames[1]
	if !exists {
		t.Error("Player name should be set")
	}

	if playerName != "TestPlayer" {
		t.Errorf("Expected player name 'TestPlayer', got '%s'", playerName)
	}

	t.Logf("Player name handling test passed! Player name: %s", playerName)
}

// Helper to pretty print JSON for debugging
func prettyPrint(data interface{}) string {
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Sprintf("%v", data)
	}
	return string(b)
}
