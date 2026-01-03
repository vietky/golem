package session

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"golem_century/internal/logger"

	"github.com/gorilla/websocket"
)

// TestDisconnectionDetection verifies that the server detects disconnected clients quickly
func TestDisconnectionDetection(t *testing.T) {
	// Create session with short timeouts for testing
	log := logger.NewNopLogger()
	session := NewGameSession("test-disconnect", 2, 60, nil, log)

	// Set very short timeouts for faster testing
	session.pingInterval = 2 * time.Second
	session.readTimeout = 5 * time.Second
	session.writeTimeout = 2 * time.Second

	// Set up test WebSocket server
	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Fatal(err)
			return
		}

		clientID := r.URL.Query().Get("client_id")
		if clientID == "" {
			clientID = "test-client-1"
		}

		err = session.AddPlayer(1, clientID, "TestPlayer", "1", conn)
		if err != nil {
			t.Fatal(err)
			return
		}
		// Note: AddPlayer already starts the read/write handlers
	}))
	defer server.Close()

	// Connect client
	wsURL := "ws" + server.URL[4:] + "?client_id=test-client-1"
	clientConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}

	// Verify player connected
	time.Sleep(100 * time.Millisecond)
	session.mu.RLock()
	connectedCount := len(session.connectedPlayers)
	session.mu.RUnlock()

	if connectedCount != 1 {
		t.Fatalf("Expected 1 connected player, got %d", connectedCount)
	}

	// Set up pong handler on client to respond to pings
	clientConn.SetPingHandler(func(appData string) error {
		return clientConn.WriteControl(websocket.PongMessage, []byte(appData), time.Now().Add(time.Second))
	})

	// Start a goroutine to read messages (to handle pings) - non-blocking
	go func() {
		for {
			_, _, err := clientConn.ReadMessage()
			if err != nil {
				return
			}
		}
	}()

	// Wait a bit to ensure ping/pong is working
	time.Sleep(3 * time.Second)

	// Client should still be connected
	session.mu.RLock()
	connectedCount = len(session.connectedPlayers)
	session.mu.RUnlock()

	if connectedCount != 1 {
		t.Fatalf("Expected player to still be connected, got %d connected players", connectedCount)
	}

	// Simulate disconnection by closing client connection without proper close frame
	clientConn.Close()

	// Wait for server to detect disconnection
	// With 2s ping interval and 5s read timeout, detection should happen within ~7 seconds
	maxWait := 10 * time.Second
	startTime := time.Now()
	disconnected := false

	for time.Since(startTime) < maxWait {
		time.Sleep(500 * time.Millisecond)
		session.mu.RLock()
		count := len(session.connectedPlayers)
		session.mu.RUnlock()

		if count == 0 {
			disconnected = true
			break
		}
	}

	if !disconnected {
		t.Errorf("Server failed to detect disconnection within %v", maxWait)
	} else {
		detectionTime := time.Since(startTime)
		t.Logf("Disconnection detected in %v", detectionTime)

		// Should detect within reasonable time (ping_interval + read_timeout + margin)
		expectedMaxTime := session.pingInterval + session.readTimeout + 2*time.Second
		if detectionTime > expectedMaxTime {
			t.Errorf("Disconnection took too long to detect: %v (expected max %v)", detectionTime, expectedMaxTime)
		}
	}
}

// TestMultipleDisconnectReconnect verifies that multiple disconnections and reconnections work correctly
func TestMultipleDisconnectReconnect(t *testing.T) {
	log := logger.NewNopLogger()
	session := NewGameSession("test-multi-disconnect", 2, 60, nil, log)

	// Set short timeouts for testing
	session.pingInterval = 2 * time.Second
	session.readTimeout = 5 * time.Second
	session.writeTimeout = 2 * time.Second

	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		clientID := r.URL.Query().Get("client_id")
		err = session.AddPlayer(1, clientID, "TestPlayer", "1", conn)
		if err != nil {
			return
		}
		// Note: AddPlayer already starts the read/write handlers
	}))
	defer server.Close()

	// Test multiple connect/disconnect cycles
	for i := 0; i < 3; i++ {
		t.Logf("Connection cycle %d", i+1)

		// Connect
		wsURL := "ws" + server.URL[4:] + "?client_id=test-client-multi"
		clientConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("Cycle %d: Failed to connect: %v", i+1, err)
		}

		// Set up pong handler
		clientConn.SetPingHandler(func(appData string) error {
			return clientConn.WriteControl(websocket.PongMessage, []byte(appData), time.Now().Add(time.Second))
		})

		// Read messages
		go func() {
			for {
				_, _, err := clientConn.ReadMessage()
				if err != nil {
					return
				}
			}
		}()

		// Verify connected
		time.Sleep(100 * time.Millisecond)
		session.mu.RLock()
		count := len(session.connectedPlayers)
		session.mu.RUnlock()

		if count != 1 {
			t.Fatalf("Cycle %d: Expected 1 connected player, got %d", i+1, count)
		}

		// Disconnect
		clientConn.Close()

		// Wait for disconnection to be detected
		maxWait := 10 * time.Second
		startTime := time.Now()
		for time.Since(startTime) < maxWait {
			time.Sleep(200 * time.Millisecond)
			session.mu.RLock()
			count = len(session.connectedPlayers)
			session.mu.RUnlock()

			if count == 0 {
				break
			}
		}

		session.mu.RLock()
		count = len(session.connectedPlayers)
		session.mu.RUnlock()

		if count != 0 {
			t.Fatalf("Cycle %d: Disconnection not detected", i+1)
		}

		t.Logf("Cycle %d: Disconnection detected in %v", i+1, time.Since(startTime))
	}
}

// TestPingPongKeepsConnectionAlive verifies that ping/pong keeps the connection alive
func TestPingPongKeepsConnectionAlive(t *testing.T) {
	log := logger.NewNopLogger()
	session := NewGameSession("test-ping-pong", 2, 60, nil, log)

	// Set timeouts
	session.pingInterval = 1 * time.Second
	session.readTimeout = 3 * time.Second
	session.writeTimeout = 2 * time.Second

	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		clientID := "test-client-ping"
		err = session.AddPlayer(1, clientID, "TestPlayer", "1", conn)
		if err != nil {
			return
		}
		// Note: AddPlayer already starts the read/write handlers
	}))
	defer server.Close()

	// Connect
	wsURL := "ws" + server.URL[4:]
	clientConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer clientConn.Close()

	// Set up proper ping handler to respond with pong
	pingCount := 0
	clientConn.SetPingHandler(func(appData string) error {
		pingCount++
		t.Logf("Received ping #%d", pingCount)
		return clientConn.WriteControl(websocket.PongMessage, []byte(appData), time.Now().Add(time.Second))
	})

	// Read messages
	go func() {
		for {
			_, msg, err := clientConn.ReadMessage()
			if err != nil {
				return
			}
			var data map[string]interface{}
			json.Unmarshal(msg, &data)
		}
	}()

	// Wait for several ping intervals (should receive multiple pings)
	time.Sleep(5 * time.Second)

	// Verify still connected
	session.mu.RLock()
	count := len(session.connectedPlayers)
	session.mu.RUnlock()

	if count != 1 {
		t.Errorf("Expected player to still be connected after %d pings, got %d connected players", pingCount, count)
	}

	if pingCount < 3 {
		t.Errorf("Expected at least 3 pings in 5 seconds with 1s interval, got %d", pingCount)
	}

	t.Logf("Connection kept alive with %d ping/pong exchanges", pingCount)
}
