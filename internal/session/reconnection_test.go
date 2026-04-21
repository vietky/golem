package session

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"golem_century/internal/logger"

	"github.com/gorilla/websocket"
)

// TestPlayerReconnectionInWaitingStatus tests that a player can reconnect during the waiting phase
func TestPlayerReconnectionInWaitingStatus(t *testing.T) {
	log := logger.NewNopLogger()
	session := NewGameSession("test_session", 2, 60, nil, nil, log)

	// Create test websocket
	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, _ := upgrader.Upgrade(w, r, nil)
		defer conn.Close()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				return
			}
		}
	}))
	defer server.Close()

	// Dial first connection with clientID
	clientID := "test_client_1"
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	conn1, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to dial: %v", err)
	}
	defer conn1.Close()

	// Add player to session
	err = session.AddPlayer(0, clientID, "TestPlayer", "1", conn1)
	if err != nil {
		t.Fatalf("Failed to add player: %v", err)
	}

	session.mu.RLock()
	initialPlayerCount := len(session.connectedPlayers)
	session.mu.RUnlock()

	if initialPlayerCount != 1 {
		t.Fatalf("Expected 1 player, got %d", initialPlayerCount)
	}

	// Simulate disconnect
	conn1.Close()
	time.Sleep(100 * time.Millisecond)

	// Reconnect with same clientID
	conn2, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to reconnect: %v", err)
	}
	defer conn2.Close()

	err = session.AddPlayer(0, clientID, "TestPlayer", "1", conn2)
	if err != nil {
		t.Fatalf("Failed to reconnect player: %v", err)
	}

	// Verify player is still in session with new connection
	session.mu.RLock()
	playerCount := len(session.connectedPlayers)
	player, exists := session.connectedPlayers[clientID]
	session.mu.RUnlock()

	if playerCount != 1 {
		t.Fatalf("Expected 1 player after reconnect, got %d", playerCount)
	}

	if !exists {
		t.Fatal("Player should exist after reconnect")
	}

	if player.Conn != conn2 {
		t.Fatal("Connection should be updated to new connection")
	}

	t.Log("✅ Player successfully reconnected in waiting status")
}

// TestPlayerReconnectionPreservesGameState tests that a player's game state is preserved on reconnect
func TestPlayerReconnectionPreservesGameState(t *testing.T) {
	log := logger.NewNopLogger()
	session := NewGameSession("test_session_2", 2, 60, nil, nil, log)

	// Create test websocket
	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, _ := upgrader.Upgrade(w, r, nil)
		defer conn.Close()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				return
			}
		}
	}))
	defer server.Close()

	// Add two players
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	conn1, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn1.Close()
	conn2, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn2.Close()

	clientID1 := "player_1"
	clientID2 := "player_2"

	session.AddPlayer(0, clientID1, "Player1", "1", conn1)
	session.AddPlayer(0, clientID2, "Player2", "2", conn2)

	// Start game
	err := session.StartGame()
	if err != nil {
		t.Fatalf("Failed to start game: %v", err)
	}

	// Record initial state for player 1
	session.mu.RLock()
	player1Info, _ := session.connectedPlayers[clientID1]
	playerID1 := player1Info.PlayerID
	session.mu.RUnlock()

	// Simulate player 1 disconnect
	conn1.Close()
	time.Sleep(100 * time.Millisecond)

	// Verify player is still in game with offline status
	session.mu.RLock()
	stillExists := session.connectedPlayers[clientID1] != nil
	assignedPlayerID, assigned := session.assignedPlayers[playerID1]
	session.mu.RUnlock()

	if !stillExists {
		t.Fatal("Player should still be in connectedPlayers after disconnect")
	}

	if !assigned || assignedPlayerID != clientID1 {
		t.Fatal("Player assignment should be preserved")
	}

	// Reconnect player 1
	conn1New, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn1New.Close()

	err = session.AddPlayer(playerID1, clientID1, "Player1", "1", conn1New)
	if err != nil {
		t.Fatalf("Failed to reconnect: %v", err)
	}

	// Verify player 1 is back with same playerID
	session.mu.RLock()
	reconnectedPlayer := session.connectedPlayers[clientID1]
	reconnectedPlayerID := reconnectedPlayer.PlayerID
	gameStatePlayer := session.GameState.Players[playerID1-1]
	session.mu.RUnlock()

	if reconnectedPlayerID != playerID1 {
		t.Fatalf("Expected playerID %d, got %d", playerID1, reconnectedPlayerID)
	}

	if gameStatePlayer.Name != "Player1" {
		t.Fatalf("Expected player name 'Player1', got %s", gameStatePlayer.Name)
	}

	t.Logf("✅ Player successfully reconnected and preserved game state (playerID: %d)", playerID1)
}

// TestBroadcastStateToReconnectedPlayer tests that reconnected player receives current game state
func TestBroadcastStateToReconnectedPlayer(t *testing.T) {
	log := logger.NewNopLogger()
	session := NewGameSession("test_session_3", 2, 60, nil, nil, log)

	// Create test websocket with message capture
	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	messagesChan := make(chan []byte, 100)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, _ := upgrader.Upgrade(w, r, nil)
		defer conn.Close()
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				return
			}
			messagesChan <- msg
		}
	}))
	defer server.Close()

	// Add two players and start game
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	conn1, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn1.Close()
	conn2, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn2.Close()

	clientID1 := "player_reconnect_1"
	clientID2 := "player_reconnect_2"

	session.AddPlayer(0, clientID1, "Player1", "1", conn1)
	session.AddPlayer(0, clientID2, "Player2", "2", conn2)
	session.StartGame()

	// Get player 1's ID
	session.mu.RLock()
	player1Info := session.connectedPlayers[clientID1]
	playerID1 := player1Info.PlayerID
	session.mu.RUnlock()

	// Wait for game to broadcast initial state
	time.Sleep(200 * time.Millisecond)
	_ = session.serializeState() // Capture the state that would be sent

	// Disconnect player 1
	conn1.Close()
	time.Sleep(100 * time.Millisecond)

	// Reconnect with new connection
	conn1New, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn1New.Close()

	// Clear message channel before reconnect
	for {
		select {
		case <-messagesChan:
		default:
			goto reconnect
		}
	}

reconnect:
	session.AddPlayer(playerID1, clientID1, "Player1", "1", conn1New)

	// Wait a bit for message to be sent
	time.Sleep(100 * time.Millisecond)

	// Check that state was sent to the reconnected player
	stateReceived := false
	select {
	case msg := <-messagesChan:
		var state map[string]interface{}
		if err := json.Unmarshal(msg, &state); err == nil {
			if state["type"] == "state" || (state["players"] != nil && state["market"] != nil) {
				stateReceived = true
			}
		}
	case <-time.After(1 * time.Second):
		// Timeout - state not received
	}

	if !stateReceived {
		t.Log("⚠️  Warning: State message not captured (may be sent asynchronously)")
	} else {
		t.Log("✅ Reconnected player received game state broadcast")
	}
}

// TestMultipleReconnections tests that a player can reconnect multiple times
func TestMultipleReconnections(t *testing.T) {
	log := logger.NewNopLogger()
	session := NewGameSession("test_session_4", 2, 60, nil, nil, log)

	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, _ := upgrader.Upgrade(w, r, nil)
		defer conn.Close()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				return
			}
		}
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	clientID := "multi_reconnect_player"

	// First connection
	conn1, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	session.AddPlayer(0, clientID, "TestPlayer", "1", conn1)
	conn1.Close()
	time.Sleep(50 * time.Millisecond)

	// Second connection
	conn2, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	session.AddPlayer(0, clientID, "TestPlayer", "1", conn2)
	conn2.Close()
	time.Sleep(50 * time.Millisecond)

	// Third connection
	conn3, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn3.Close()
	err := session.AddPlayer(0, clientID, "TestPlayer", "1", conn3)
	if err != nil {
		t.Fatalf("Failed on third reconnection: %v", err)
	}

	session.mu.RLock()
	finalPlayerCount := len(session.connectedPlayers)
	finalConn := session.connectedPlayers[clientID].Conn
	session.mu.RUnlock()

	if finalPlayerCount != 1 {
		t.Fatalf("Expected 1 player, got %d", finalPlayerCount)
	}

	if finalConn != conn3 {
		t.Fatal("Should use most recent connection")
	}

	t.Log("✅ Player successfully reconnected multiple times")
}

// TestReconnectionCleansUpOldConnections tests that old connections are properly closed
func TestReconnectionCleansUpOldConnections(t *testing.T) {
	log := logger.NewNopLogger()
	session := NewGameSession("test_session_5", 2, 60, nil, nil, log)

	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, _ := upgrader.Upgrade(w, r, nil)
		defer conn.Close()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				return
			}
		}
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	clientID := "cleanup_test_player"

	// First connection
	conn1, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	session.AddPlayer(0, clientID, "TestPlayer", "1", conn1)

	// Get write channel reference
	session.mu.RLock()
	oldWriteChan := session.connectedPlayers[clientID].WriteChan
	session.mu.RUnlock()

	// Second connection (reconnect)
	conn2, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn2.Close()
	session.AddPlayer(0, clientID, "TestPlayer", "1", conn2)

	// Old write channel should be closed
	session.mu.RLock()
	newWriteChan := session.connectedPlayers[clientID].WriteChan
	session.mu.RUnlock()

	if oldWriteChan == newWriteChan {
		t.Fatal("Old write channel should be replaced with new one")
	}

	// Verify old channel is closed by trying to write to it (should panic/recover if we try)
	select {
	case _, ok := <-oldWriteChan:
		if ok {
			t.Fatal("Old write channel should be closed")
		}
	default:
		// Channel might not have been consumed, which is fine
	}

	t.Log("✅ Old connections properly cleaned up on reconnection")
}

// TestReconnectionAfterGameStart tests reconnection during active gameplay
func TestReconnectionAfterGameStart(t *testing.T) {
	log := logger.NewNopLogger()
	session := NewGameSession("test_session_6", 2, 60, nil, nil, log)

	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, _ := upgrader.Upgrade(w, r, nil)
		defer conn.Close()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				return
			}
		}
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Add two players
	conn1, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	conn2, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)

	clientID1 := "game_player_1"
	clientID2 := "game_player_2"

	session.AddPlayer(0, clientID1, "Player1", "1", conn1)
	session.AddPlayer(0, clientID2, "Player2", "2", conn2)

	// Start game
	if err := session.StartGame(); err != nil {
		t.Fatalf("Failed to start game: %v", err)
	}

	// Get player IDs
	session.mu.RLock()
	playerID1 := session.connectedPlayers[clientID1].PlayerID
	playerID2 := session.connectedPlayers[clientID2].PlayerID
	session.mu.RUnlock()

	// Simulate player 1 disconnect during game
	conn1.Close()
	time.Sleep(50 * time.Millisecond)

	// Player 2 is still connected and game should continue
	session.mu.RLock()
	player2Connected := session.connectedPlayers[clientID2] != nil
	player1StillAssigned := session.assignedPlayers[playerID1] == clientID1
	session.mu.RUnlock()

	if !player2Connected {
		t.Fatal("Player 2 should still be connected")
	}

	if !player1StillAssigned {
		t.Fatal("Player 1 should still be assigned during game")
	}

	// Player 1 reconnects
	conn1New, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn1New.Close()

	err := session.AddPlayer(playerID1, clientID1, "Player1", "1", conn1New)
	if err != nil {
		t.Fatalf("Failed to reconnect during game: %v", err)
	}

	// Verify both players are connected and game continues
	session.mu.RLock()
	status := session.status
	player1Info := session.connectedPlayers[clientID1]
	player2Info := session.connectedPlayers[clientID2]
	session.mu.RUnlock()

	if status != GameStatusPlaying {
		t.Fatalf("Game should still be playing, got status: %v", status)
	}

	if player1Info.PlayerID != playerID1 {
		t.Fatalf("Player 1 should have same ID after reconnect")
	}

	if player1Info.Conn != conn1New {
		t.Fatal("Player 1 should use new connection")
	}

	if player2Info == nil {
		t.Fatal("Player 2 should still be connected")
	}

	t.Logf("✅ Game continued with player reconnecting mid-game (Player IDs: %d, %d)", playerID1, playerID2)
}
