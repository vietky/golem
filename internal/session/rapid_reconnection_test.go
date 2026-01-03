package session

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"golem_century/internal/logger"

	"github.com/gorilla/websocket"
)

// TestRapidReconnection tests the scenario where a user closes the tab and immediately
// opens a new connection without waiting for the server to detect disconnection
func TestRapidReconnection(t *testing.T) {
	log := logger.NewNopLogger()
	session := NewGameSession("rapid-test", 2, 60, nil, log)

	// Configure shorter timeouts for testing
	session.pingInterval = 1 * time.Second
	session.readTimeout = 3 * time.Second
	session.writeTimeout = 1 * time.Second

	// Create test server
	server := httptest.NewServer(createTestWebSocketHandler(session))
	defer server.Close()

	// Convert http://... to ws://...
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Connect first time
	conn1, err := connectWebSocket(wsURL, "player1", "test-client-1", "1")
	if err != nil {
		t.Fatalf("Failed to connect first time: %v", err)
	}

	// Wait for connection to be established
	time.Sleep(100 * time.Millisecond)

	// Verify player was added
	if session.GetConnectedPlayersCount() != 1 {
		t.Fatalf("Expected 1 player, got %d", session.GetConnectedPlayersCount())
	}

	// Immediately close and reconnect without waiting (simulating user closing tab and reopening)
	conn1.Close()

	// Reconnect immediately (within milliseconds, before server detects disconnection)
	conn2, err := connectWebSocket(wsURL, "player1", "test-client-1", "1")
	if err != nil {
		t.Fatalf("Failed to reconnect: %v", err)
	}
	defer conn2.Close()

	// Wait a bit for reconnection to be processed
	time.Sleep(200 * time.Millisecond)

	// Should still have exactly 1 player (not 2)
	if session.GetConnectedPlayersCount() != 1 {
		t.Errorf("Expected 1 player after reconnection, got %d", session.GetConnectedPlayersCount())
	}

	// Verify the new connection receives state updates
	receivedState := false
	done := make(chan bool, 1)

	go func() {
		for i := 0; i < 5; i++ {
			_, message, err := conn2.ReadMessage()
			if err != nil {
				return
			}

			var msg map[string]interface{}
			if err := json.Unmarshal(message, &msg); err == nil {
				if msg["type"] == "state" {
					receivedState = true
					done <- true
					return
				}
			}
		}
		done <- false
	}()

	select {
	case success := <-done:
		if !success || !receivedState {
			t.Error("Reconnected client did not receive state update")
		}
	case <-time.After(2 * time.Second):
		t.Error("Timeout waiting for state update")
	}
}

// TestMultipleRapidReconnections tests rapid reconnections in quick succession
func TestMultipleRapidReconnections(t *testing.T) {
	log := logger.NewNopLogger()
	session := NewGameSession("multi-rapid-test", 2, 60, nil, log)

	// Configure shorter timeouts
	session.pingInterval = 1 * time.Second
	session.readTimeout = 3 * time.Second
	session.writeTimeout = 1 * time.Second

	server := httptest.NewServer(createTestWebSocketHandler(session))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Perform 5 rapid reconnections
	for i := 0; i < 5; i++ {
		conn, err := connectWebSocket(wsURL, "player1", "test-client-1", "1")
		if err != nil {
			t.Fatalf("Failed to connect on iteration %d: %v", i, err)
		}

		// Wait just a bit
		time.Sleep(50 * time.Millisecond)

		// Close immediately
		conn.Close()

		// Tiny delay before next connection
		time.Sleep(20 * time.Millisecond)
	}

	// Final connection that we keep
	finalConn, err := connectWebSocket(wsURL, "player1", "test-client-1", "1")
	if err != nil {
		t.Fatalf("Failed final connection: %v", err)
	}
	defer finalConn.Close()

	// Wait for everything to settle
	time.Sleep(300 * time.Millisecond)

	// Should have exactly 1 player
	if session.GetConnectedPlayersCount() != 1 {
		t.Errorf("Expected 1 player after multiple reconnections, got %d", session.GetConnectedPlayersCount())
	}

	// Verify final connection works
	receivedMsg := false
	done := make(chan bool, 1)

	go func() {
		for i := 0; i < 5; i++ {
			_, message, err := finalConn.ReadMessage()
			if err != nil {
				return
			}

			var msg map[string]interface{}
			if err := json.Unmarshal(message, &msg); err == nil {
				receivedMsg = true
				done <- true
				return
			}
		}
		done <- false
	}()

	select {
	case <-done:
		if !receivedMsg {
			t.Error("Final connection did not receive messages")
		}
	case <-time.After(2 * time.Second):
		t.Error("Timeout waiting for message on final connection")
	}
}

// TestConcurrentRapidReconnections tests multiple players reconnecting simultaneously
func TestConcurrentRapidReconnections(t *testing.T) {
	log := logger.NewNopLogger()
	session := NewGameSession("concurrent-rapid-test", 4, 60, nil, log)

	// Configure shorter timeouts
	session.pingInterval = 1 * time.Second
	session.readTimeout = 3 * time.Second
	session.writeTimeout = 1 * time.Second

	server := httptest.NewServer(createTestWebSocketHandler(session))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Connect 3 players initially
	var initialConns []*websocket.Conn
	for i := 1; i <= 3; i++ {
		clientID := "test-client-" + string(rune('0'+i))
		name := "Player" + string(rune('0'+i))
		conn, err := connectWebSocket(wsURL, name, clientID, "1")
		if err != nil {
			t.Fatalf("Failed to connect player %d: %v", i, err)
		}
		initialConns = append(initialConns, conn)
	}

	time.Sleep(200 * time.Millisecond)

	// Verify all 3 connected
	if session.GetConnectedPlayersCount() != 3 {
		t.Fatalf("Expected 3 players initially, got %d", session.GetConnectedPlayersCount())
	}

	// All 3 players disconnect and reconnect simultaneously
	var wg sync.WaitGroup
	var newConns []*websocket.Conn
	var connMu sync.Mutex

	for i := 0; i < 3; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()

			// Close old connection
			initialConns[idx].Close()

			// Immediately reconnect
			clientID := "test-client-" + string(rune('0'+idx+1))
			name := "Player" + string(rune('0'+idx+1))
			conn, err := connectWebSocket(wsURL, name, clientID, "1")
			if err != nil {
				t.Logf("Failed to reconnect player %d: %v", idx+1, err)
				return
			}

			connMu.Lock()
			newConns = append(newConns, conn)
			connMu.Unlock()
		}(i)
	}

	wg.Wait()
	time.Sleep(300 * time.Millisecond)

	// Should still have exactly 3 players (not 6)
	connMu.Lock()
	connectedCount := len(newConns)
	connMu.Unlock()

	if connectedCount != 3 {
		t.Errorf("Expected 3 successful reconnections, got %d", connectedCount)
	}

	if session.GetConnectedPlayersCount() != 3 {
		t.Errorf("Expected 3 players after concurrent reconnections, got %d", session.GetConnectedPlayersCount())
	}

	// Clean up new connections after verification
	connMu.Lock()
	for _, conn := range newConns {
		conn.Close()
	}
	connMu.Unlock()
}

// TestReconnectionWithActiveGameLoop tests reconnection while game is processing actions
func TestReconnectionWithActiveGameLoop(t *testing.T) {
	log := logger.NewNopLogger()
	session := NewGameSession("gameloop-rapid-test", 2, 60, nil, log)

	// Configure shorter timeouts
	session.pingInterval = 1 * time.Second
	session.readTimeout = 3 * time.Second
	session.writeTimeout = 1 * time.Second

	server := httptest.NewServer(createTestWebSocketHandler(session))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Connect two players
	conn1, err := connectWebSocket(wsURL, "Player1", "client-1", "1")
	if err != nil {
		t.Fatalf("Failed to connect player 1: %v", err)
	}

	conn2, err := connectWebSocket(wsURL, "Player2", "client-2", "2")
	if err != nil {
		t.Fatalf("Failed to connect player 2: %v", err)
	}

	time.Sleep(200 * time.Millisecond)

	// Start the game
	err = session.StartGame()
	if err != nil {
		t.Fatalf("Failed to start game: %v", err)
	}

	// Give game loop time to start
	time.Sleep(200 * time.Millisecond)

	// Player 1 disconnects and rapidly reconnects while game is running
	conn1.Close()

	newConn1, err := connectWebSocket(wsURL, "Player1", "client-1", "1")
	if err != nil {
		t.Fatalf("Failed to reconnect player 1: %v", err)
	}
	defer newConn1.Close()
	defer conn2.Close()

	time.Sleep(300 * time.Millisecond)

	// Verify still 2 players
	if session.GetConnectedPlayersCount() != 2 {
		t.Errorf("Expected 2 players after reconnection during game, got %d", session.GetConnectedPlayersCount())
	}

	// Verify reconnected player receives game state
	receivedState := false
	done := make(chan bool, 1)

	go func() {
		for i := 0; i < 10; i++ {
			_, message, err := newConn1.ReadMessage()
			if err != nil {
				return
			}

			var msg map[string]interface{}
			if err := json.Unmarshal(message, &msg); err == nil {
				if msg["type"] == "state" {
					receivedState = true
					done <- true
					return
				}
			}
		}
		done <- false
	}()

	select {
	case success := <-done:
		if !success || !receivedState {
			t.Error("Reconnected player did not receive game state during active game")
		}
	case <-time.After(3 * time.Second):
		t.Error("Timeout waiting for game state")
	}
}

// Helper function to connect a WebSocket client
func connectWebSocket(serverURL, name, clientID, avatar string) (*websocket.Conn, error) {
	u, _ := url.Parse(serverURL)
	q := u.Query()
	q.Set("name", name)
	q.Set("client_id", clientID)
	q.Set("avatar", avatar)
	u.RawQuery = q.Encode()

	dialer := websocket.Dialer{
		HandshakeTimeout: 5 * time.Second,
	}

	conn, _, err := dialer.Dial(u.String(), nil)
	return conn, err
}

// Helper to create test WebSocket handler
func createTestWebSocketHandler(session *GameSession) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		name := r.URL.Query().Get("name")
		clientID := r.URL.Query().Get("client_id")
		avatar := r.URL.Query().Get("avatar")

		session.AddPlayer(0, clientID, name, avatar, conn)
	})
}
