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

// TestRoomFullFix verifies that disconnected players don't count toward room capacity
// This tests the fix for the issue where users couldn't rejoin after disconnect
// because /list endpoint showed room as full
func TestRoomFullFix(t *testing.T) {
	log := logger.NewNopLogger()
	session := NewGameSession("test_room_full_fix", 2, 60, nil, log)

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

	// Add 2 players (fill the room)
	conn1, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn1.Close()
	conn2, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn2.Close()

	clientID1 := "client1"
	clientID2 := "client2"

	err := session.AddPlayer(0, clientID1, "Player1", "1", conn1)
	if err != nil {
		t.Fatalf("Failed to add player 1: %v", err)
	}

	err = session.AddPlayer(0, clientID2, "Player2", "2", conn2)
	if err != nil {
		t.Fatalf("Failed to add player 2: %v", err)
	}

	// Start game to transition to playing status
	err = session.StartGame()
	if err != nil {
		t.Fatalf("Failed to start game: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	// Verify room is full (2/2 players)
	if session.GetConnectedPlayersCount() != 2 {
		t.Fatalf("Expected 2 total players, got %d", session.GetConnectedPlayersCount())
	}

	if session.GetActivelyConnectedPlayersCount() != 2 {
		t.Fatalf("Expected 2 active players, got %d", session.GetActivelyConnectedPlayersCount())
	}

	// Player 1 disconnects mid-game
	conn1.Close()
	time.Sleep(100 * time.Millisecond)

	// After disconnection:
	// - GetConnectedPlayersCount should still be 2 (player kept for reconnection during game)
	// - GetActivelyConnectedPlayersCount should be 1 (only player2 has active connection)
	totalPlayers := session.GetConnectedPlayersCount()
	activePlayers := session.GetActivelyConnectedPlayersCount()

	t.Logf("After player1 disconnect: total=%d, active=%d", totalPlayers, activePlayers)

	if totalPlayers != 2 {
		t.Fatalf("Expected 2 total players (including disconnected), got %d", totalPlayers)
	}

	if activePlayers != 1 {
		t.Fatalf("Expected 1 active player after disconnect, got %d", activePlayers)
	}

	// The fix: /list endpoint should use GetActivelyConnectedPlayersCount
	// So it shows room has 1 free slot (not full)
	// This allows player1 to rejoin

	// Now create a new connection for player1 to rejoin
	conn1New, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn1New.Close()

	// Player1 should be able to rejoin (room not full from /list perspective)
	err = session.AddPlayer(1, clientID1, "Player1", "1", conn1New)
	if err != nil {
		t.Fatalf("Failed to rejoin player 1 after disconnect: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	// After reconnection: both players should be actively connected
	if session.GetActivelyConnectedPlayersCount() != 2 {
		t.Fatalf("Expected 2 active players after reconnection, got %d", session.GetActivelyConnectedPlayersCount())
	}

	t.Log("✅ Room full fix verified: disconnected players don't count toward capacity")
}

// TestActivePlayerCountDuringWaiting verifies that waiting status removes players completely
func TestActivePlayerCountDuringWaiting(t *testing.T) {
	log := logger.NewNopLogger()
	session := NewGameSession("test_waiting_status", 2, 60, nil, log)

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

	// Add player during waiting status
	conn, _, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	defer conn.Close()

	err := session.AddPlayer(0, "client1", "Player1", "1", conn)
	if err != nil {
		t.Fatalf("Failed to add player: %v", err)
	}

	// In waiting status, both counts should be equal
	if session.GetConnectedPlayersCount() != 1 {
		t.Fatalf("Expected 1 total player, got %d", session.GetConnectedPlayersCount())
	}

	if session.GetActivelyConnectedPlayersCount() != 1 {
		t.Fatalf("Expected 1 active player, got %d", session.GetActivelyConnectedPlayersCount())
	}

	// Disconnect during waiting status
	conn.Close()
	time.Sleep(100 * time.Millisecond)

	// During waiting status, player is completely removed
	if session.GetConnectedPlayersCount() != 0 {
		t.Fatalf("Expected 0 players after disconnect in waiting status, got %d", session.GetConnectedPlayersCount())
	}

	if session.GetActivelyConnectedPlayersCount() != 0 {
		t.Fatalf("Expected 0 active players, got %d", session.GetActivelyConnectedPlayersCount())
	}

	t.Log("✅ Waiting status verification: players removed completely on disconnect")
}
