package server

import (
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

// TestSpectatorSeesPlayerNames verifies that spectators receive actual player names
func TestSpectatorSeesPlayerNames(t *testing.T) {
	// Create game server
	cfg := config.LoadConfig()
	log := logger.NewNopLogger()
	gs := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	// Create a session
	sessionID := "test_spectator_names"
	gs.CreateSession(sessionID, 2, 12345, game.NewRestOnlyAI())

	session, exists := gs.GetSession(sessionID)
	if !exists {
		t.Fatal("Session should exist")
	}

	// Create test HTTP server
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", gs.HandleWebSocket)
	server := httptest.NewServer(mux)
	defer server.Close()

	// Connect two players with custom names
	player1Name := "Alice"
	player2Name := "Bob"

	// Connect Player 1
	wsURL1 := fmt.Sprintf("ws%s/ws?session=%s&name=%s&avatar=%s",
		strings.TrimPrefix(server.URL, "http"),
		sessionID,
		player1Name,
		"1")

	ws1, _, err := websocket.DefaultDialer.Dial(wsURL1, nil)
	if err != nil {
		t.Fatalf("Failed to connect player 1: %v", err)
	}
	defer ws1.Close()

	// Read player 1 assignment
	var msg1 map[string]interface{}
	if err := ws1.ReadJSON(&msg1); err != nil {
		t.Fatalf("Failed to read player 1 assignment: %v", err)
	}

	// Read player 1 initial state
	var state1 map[string]interface{}
	if err := ws1.ReadJSON(&state1); err != nil {
		t.Fatalf("Failed to read player 1 state: %v", err)
	}

	// Connect Player 2
	wsURL2 := fmt.Sprintf("ws%s/ws?session=%s&name=%s&avatar=%s",
		strings.TrimPrefix(server.URL, "http"),
		sessionID,
		player2Name,
		"2")

	ws2, _, err := websocket.DefaultDialer.Dial(wsURL2, nil)
	if err != nil {
		t.Fatalf("Failed to connect player 2: %v", err)
	}
	defer ws2.Close()

	// Read player 2 assignment
	var msg2 map[string]interface{}
	if err := ws2.ReadJSON(&msg2); err != nil {
		t.Fatalf("Failed to read player 2 assignment: %v", err)
	}

	// Read player 2 initial state
	var state2 map[string]interface{}
	if err := ws2.ReadJSON(&state2); err != nil {
		t.Fatalf("Failed to read player 2 state: %v", err)
	}

	// Simulate game start by incrementing turn
	session.mu.Lock()
	session.GameState.CurrentTurn = 1
	session.mu.Unlock()

	// Now connect a spectator
	spectatorName := "Charlie"
	wsURLSpec := fmt.Sprintf("ws%s/ws?session=%s&name=%s&avatar=%s&spectate=true",
		strings.TrimPrefix(server.URL, "http"),
		sessionID,
		spectatorName,
		"3")

	wsSpec, _, err := websocket.DefaultDialer.Dial(wsURLSpec, nil)
	if err != nil {
		t.Fatalf("Failed to connect spectator: %v", err)
	}
	defer wsSpec.Close()

	// Read spectator assignment
	var specAssign map[string]interface{}
	if err := wsSpec.ReadJSON(&specAssign); err != nil {
		t.Fatalf("Failed to read spectator assignment: %v", err)
	}

	if specAssign["type"] != "spectatorAssigned" {
		t.Errorf("Expected spectatorAssigned, got %v", specAssign["type"])
	}

	// Read spectator's initial state
	var specState map[string]interface{}
	if err := wsSpec.ReadJSON(&specState); err != nil {
		t.Fatalf("Failed to read spectator state: %v", err)
	}

	if specState["type"] != "state" {
		t.Errorf("Expected state, got %v", specState["type"])
	}

	// Verify the state includes player information
	players, ok := specState["players"].([]interface{})
	if !ok {
		t.Fatalf("Failed to parse players from state")
	}

	if len(players) != 2 {
		t.Fatalf("Expected 2 players, got %d", len(players))
	}

	// Verify player names are correct
	playerNames := make(map[string]bool)
	for _, p := range players {
		player, ok := p.(map[string]interface{})
		if !ok {
			t.Fatalf("Failed to parse player")
		}

		name, ok := player["name"].(string)
		if !ok {
			t.Fatalf("Failed to parse player name")
		}

		playerNames[name] = true

		// Verify player has resources
		if _, hasResources := player["resources"]; !hasResources {
			t.Errorf("Player %s missing resources", name)
		}

		// Verify player has hand
		if _, hasHand := player["hand"]; !hasHand {
			t.Errorf("Player %s missing hand", name)
		}

		t.Logf("✅ Spectator sees player: %s", name)
	}

	// Verify we got the expected player names
	if !playerNames[player1Name] {
		t.Errorf("Expected to see player %s but got: %v", player1Name, playerNames)
	}
	if !playerNames[player2Name] {
		t.Errorf("Expected to see player %s but got: %v", player2Name, playerNames)
	}

	// Verify spectator can see current player
	currentPlayerID, ok := specState["currentPlayer"].(float64)
	if !ok {
		t.Errorf("Failed to parse currentPlayer")
	} else {
		t.Logf("✅ Spectator sees current player ID: %d", int(currentPlayerID))
	}

	// Verify spectator can see current turn
	currentTurn, ok := specState["currentTurn"].(float64)
	if !ok {
		t.Errorf("Failed to parse currentTurn")
	} else if int(currentTurn) != 1 {
		t.Errorf("Expected currentTurn to be 1, got %d", int(currentTurn))
	} else {
		t.Logf("✅ Spectator sees current turn: %d", int(currentTurn))
	}

	// Verify spectator can see market
	market, ok := specState["market"].(map[string]interface{})
	if !ok {
		t.Errorf("Failed to parse market")
	} else {
		t.Logf("✅ Spectator sees market with action cards")
		if actionCards, ok := market["actionCards"].([]interface{}); ok {
			t.Logf("   - Action cards in market: %d", len(actionCards))
		}
	}

	t.Log("✅ Spectator can see complete game state including player names and resources")
}
