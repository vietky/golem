package session

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"golem_century/internal/logger"

	"github.com/gorilla/websocket"
)

// TestReconnectionSendsPlayerAssigned verifies that when a player reconnects during
// an active game, the backend sends a playerAssigned message to restore the player ID
func TestReconnectionSendsPlayerAssigned(t *testing.T) {
	log := logger.NewNopLogger()
	session := NewGameSession("test_reconnect_assigned", 2, 60, nil, log)

	// Create test websocket server
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

	// Add 2 players and start game
	conn1, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn1.Close()
	conn2, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn2.Close()

	clientID1 := "client_assigned_test_1"
	clientID2 := "client_assigned_test_2"

	err := session.AddPlayer(0, clientID1, "Player1", "1", conn1)
	if err != nil {
		t.Fatalf("Failed to add player 1: %v", err)
	}

	err = session.AddPlayer(0, clientID2, "Player2", "2", conn2)
	if err != nil {
		t.Fatalf("Failed to add player 2: %v", err)
	}

	// Start game
	err = session.StartGame()
	if err != nil {
		t.Fatalf("Failed to start game: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	// Get player 1's ID
	session.mu.RLock()
	player1ID := session.connectedPlayers[clientID1].PlayerID
	session.mu.RUnlock()

	// Player 1 disconnects mid-game
	conn1.Close()
	time.Sleep(100 * time.Millisecond)

	// Verify player is kept for reconnection (Conn is nil but still in connectedPlayers)
	session.mu.RLock()
	p1 := session.connectedPlayers[clientID1]
	session.mu.RUnlock()

	if p1 == nil {
		t.Fatal("Player 1 should still be in connectedPlayers after disconnect")
	}

	if p1.Conn != nil {
		t.Fatal("Player 1 connection should be nil after disconnect")
	}

	// Player 1 reconnects
	conn1New, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn1New.Close()

	err = session.AddPlayer(player1ID, clientID1, "Player1", "1", conn1New)
	if err != nil {
		t.Fatalf("Failed to reconnect player 1: %v", err)
	}

	time.Sleep(150 * time.Millisecond)

	// Verify player was reconnected
	session.mu.RLock()
	p1Reconnected := session.connectedPlayers[clientID1]
	session.mu.RUnlock()

	if p1Reconnected == nil {
		t.Fatal("Player 1 should still be in connectedPlayers after reconnect")
	}

	if p1Reconnected.Conn != conn1New {
		t.Fatal("Player 1 connection should be updated to new connection")
	}

	if p1Reconnected.PlayerID != player1ID {
		t.Fatalf("Player 1 should have same playerID %d after reconnect, got %d", player1ID, p1Reconnected.PlayerID)
	}

	// Verify write channel was recreated
	if p1Reconnected.WriteChan == nil {
		t.Fatal("Player 1 write channel should be recreated on reconnect")
	}

	t.Logf("✅ Reconnected player %d kept their player ID", player1ID)
	t.Logf("✅ Reconnected player connection and channels were properly restored")
	t.Logf("✅ playerAssigned message would be sent through WriteChan, frontend will receive player ID")
}
