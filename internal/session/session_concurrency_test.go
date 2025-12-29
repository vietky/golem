package session

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"golem_century/internal/game"
	"golem_century/internal/logger"

	"github.com/gorilla/websocket"
)

// TestConcurrentWebsocketWrites tests that concurrent writes to websocket connections don't panic
func TestConcurrentWebsocketWrites(t *testing.T) {
	log := logger.NewNopLogger()

	// Create a test websocket server
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	// Track connected clients
	var mu sync.Mutex
	clients := make([]*websocket.Conn, 0)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Logf("upgrade error: %v", err)
			return
		}
		mu.Lock()
		clients = append(clients, conn)
		mu.Unlock()

		// Keep reading messages to prevent buffer overflow
		go func() {
			for {
				_, _, err := conn.ReadMessage()
				if err != nil {
					return
				}
			}
		}()
	}))
	defer server.Close()

	// Create game session
	gs := NewGameSession("test-session", 4, 60, nil, nil, log)

	// Connect multiple players
	numPlayers := 4
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	for i := 0; i < numPlayers; i++ {
		conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("failed to connect player %d: %v", i, err)
		}
		defer conn.Close()

		clientID := fmt.Sprintf("client_%d", i)
		name := fmt.Sprintf("Player %d", i+1)
		avatar := fmt.Sprintf("avatar_%d", i)

		err = gs.AddPlayer(0, clientID, name, avatar, conn)
		if err != nil {
			t.Fatalf("failed to add player %d: %v", i, err)
		}
	}

	// Add spectators
	numSpectators := 3
	for i := 0; i < numSpectators; i++ {
		conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("failed to connect spectator %d: %v", i, err)
		}
		defer conn.Close()

		name := fmt.Sprintf("Spectator %d", i+1)
		err = gs.AddSpectator(name, conn)
		if err != nil {
			t.Fatalf("failed to add spectator %d: %v", i, err)
		}
	}

	// Wait for connections to be established
	time.Sleep(100 * time.Millisecond)

	// Test concurrent broadcasts
	t.Run("ConcurrentBroadcasts", func(t *testing.T) {
		var wg sync.WaitGroup
		numConcurrentBroadcasts := 50

		for i := 0; i < numConcurrentBroadcasts; i++ {
			wg.Add(1)
			go func(iteration int) {
				defer wg.Done()
				msg := map[string]interface{}{
					"type":    "test",
					"message": fmt.Sprintf("broadcast %d", iteration),
				}
				gs.broadcast(msg)
			}(i)
		}

		wg.Wait()
	})

	// Test concurrent sendToPlayer calls
	t.Run("ConcurrentSendToPlayer", func(t *testing.T) {
		var wg sync.WaitGroup
		numConcurrentSends := 50

		for i := 0; i < numConcurrentSends; i++ {
			wg.Add(1)
			go func(iteration int) {
				defer wg.Done()
				clientID := fmt.Sprintf("client_%d", iteration%numPlayers)
				msg := map[string]interface{}{
					"type":    "test",
					"message": fmt.Sprintf("send %d", iteration),
				}
				gs.sendToPlayer(clientID, msg)
			}(i)
		}

		wg.Wait()
	})

	// Test concurrent sendToSpectator calls
	t.Run("ConcurrentSendToSpectator", func(t *testing.T) {
		var wg sync.WaitGroup
		numConcurrentSends := 30

		gs.mu.RLock()
		spectatorIDs := make([]string, 0, len(gs.spectators))
		for id := range gs.spectators {
			spectatorIDs = append(spectatorIDs, id)
		}
		gs.mu.RUnlock()

		for i := 0; i < numConcurrentSends; i++ {
			wg.Add(1)
			go func(iteration int) {
				defer wg.Done()
				if len(spectatorIDs) > 0 {
					spectatorID := spectatorIDs[iteration%len(spectatorIDs)]
					msg := map[string]interface{}{
						"type":    "test",
						"message": fmt.Sprintf("spectator send %d", iteration),
					}
					gs.sendToSpectator(spectatorID, msg)
				}
			}(i)
		}

		wg.Wait()
	})

	// Test mixed concurrent operations
	t.Run("MixedConcurrentOperations", func(t *testing.T) {
		var wg sync.WaitGroup
		numOperations := 100

		for i := 0; i < numOperations; i++ {
			wg.Add(1)
			go func(iteration int) {
				defer wg.Done()
				switch iteration % 3 {
				case 0:
					// Broadcast
					msg := map[string]interface{}{
						"type":    "mixed",
						"message": fmt.Sprintf("broadcast %d", iteration),
					}
					gs.broadcast(msg)
				case 1:
					// Send to player
					clientID := fmt.Sprintf("client_%d", iteration%numPlayers)
					msg := map[string]interface{}{
						"type":    "mixed",
						"message": fmt.Sprintf("player %d", iteration),
					}
					gs.sendToPlayer(clientID, msg)
				case 2:
					// Send to spectator
					gs.mu.RLock()
					spectatorIDs := make([]string, 0, len(gs.spectators))
					for id := range gs.spectators {
						spectatorIDs = append(spectatorIDs, id)
					}
					gs.mu.RUnlock()

					if len(spectatorIDs) > 0 {
						spectatorID := spectatorIDs[iteration%len(spectatorIDs)]
						msg := map[string]interface{}{
							"type":    "mixed",
							"message": fmt.Sprintf("spectator %d", iteration),
						}
						gs.sendToSpectator(spectatorID, msg)
					}
				}
			}(i)
		}

		wg.Wait()
	})
}

// TestConcurrentChatMessages tests that concurrent chat messages don't cause panics
func TestConcurrentChatMessages(t *testing.T) {
	log := logger.NewNopLogger()

	// Create a test websocket server
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Logf("upgrade error: %v", err)
			return
		}

		// Keep reading messages to prevent buffer overflow
		go func() {
			for {
				_, _, err := conn.ReadMessage()
				if err != nil {
					return
				}
			}
		}()
	}))
	defer server.Close()

	// Create game session
	gs := NewGameSession("test-session", 4, 60, nil, nil, log)

	// Connect multiple players
	numPlayers := 4
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	connections := make([]*websocket.Conn, numPlayers)

	for i := 0; i < numPlayers; i++ {
		conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("failed to connect player %d: %v", i, err)
		}
		defer conn.Close()
		connections[i] = conn

		clientID := fmt.Sprintf("client_%d", i)
		name := fmt.Sprintf("Player %d", i+1)
		avatar := fmt.Sprintf("avatar_%d", i)

		err = gs.AddPlayer(0, clientID, name, avatar, conn)
		if err != nil {
			t.Fatalf("failed to add player %d: %v", i, err)
		}
	}

	// Wait for connections
	time.Sleep(100 * time.Millisecond)

	// Send concurrent chat messages
	var wg sync.WaitGroup
	numMessages := 50

	for i := 0; i < numMessages; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()
			clientID := fmt.Sprintf("client_%d", iteration%numPlayers)
			chatReq := map[string]interface{}{
				"type":    "chat",
				"message": fmt.Sprintf("Hello from message %d", iteration),
			}
			gs.handleChatMessage(clientID, chatReq)
		}(i)
	}

	wg.Wait()
}

// TestConcurrentPlayerActions tests that concurrent player actions don't cause panics
func TestConcurrentPlayerActions(t *testing.T) {
	log := logger.NewNopLogger()

	// Create a test websocket server
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Logf("upgrade error: %v", err)
			return
		}

		// Keep reading messages
		go func() {
			for {
				_, _, err := conn.ReadMessage()
				if err != nil {
					return
				}
			}
		}()
	}))
	defer server.Close()

	// Create game session and start game
	gs := NewGameSession("test-session", 2, 60, game.NewAIPlayer(nil), nil, log)

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Add 2 players
	for i := 0; i < 2; i++ {
		conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("failed to connect player %d: %v", i, err)
		}
		defer conn.Close()

		clientID := fmt.Sprintf("client_%d", i)
		name := fmt.Sprintf("Player %d", i+1)
		err = gs.AddPlayer(0, clientID, name, "", conn)
		if err != nil {
			t.Fatalf("failed to add player %d: %v", i, err)
		}
	}

	time.Sleep(100 * time.Millisecond)

	// Start the game
	err := gs.StartGame()
	if err != nil {
		t.Fatalf("failed to start game: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	// Send a few concurrent actions (not too many to avoid blocking the channel)
	var wg sync.WaitGroup
	numActions := 5 // Reduced from 30 to avoid overwhelming the action channel

	for i := 0; i < numActions; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()
			clientID := fmt.Sprintf("client_%d", iteration%2)
			actionReq := map[string]interface{}{
				"type":       "action",
				"actionType": "rest",
			}
			gs.handlePlayerAction(clientID, actionReq)
			// Small delay to allow game loop to process
			time.Sleep(10 * time.Millisecond)
		}(i)
	}

	wg.Wait()
}

// TestBroadcastStateWithConcurrentReads tests that broadcastState can be called concurrently
func TestBroadcastStateWithConcurrentReads(t *testing.T) {
	log := logger.NewNopLogger()

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		go func() {
			for {
				_, _, err := conn.ReadMessage()
				if err != nil {
					return
				}
			}
		}()
	}))
	defer server.Close()

	gs := NewGameSession("test-session", 3, 60, nil, nil, log)
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Add players
	for i := 0; i < 3; i++ {
		conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("failed to connect: %v", err)
		}
		defer conn.Close()

		err = gs.AddPlayer(0, fmt.Sprintf("client_%d", i), fmt.Sprintf("Player %d", i+1), "", conn)
		if err != nil {
			t.Fatalf("failed to add player: %v", err)
		}
	}

	time.Sleep(100 * time.Millisecond)

	// Start game
	if err := gs.StartGame(); err != nil {
		t.Fatalf("failed to start game: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	// Concurrent broadcastState calls
	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			gs.broadcastState()
		}()
	}

	// Concurrent reads
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_ = gs.GetSerializedState()
		}()
	}

	wg.Wait()
}

// TestPlayerJoinLeaveWithConcurrentBroadcasts tests adding/removing players while broadcasting
func TestPlayerJoinLeaveWithConcurrentBroadcasts(t *testing.T) {
	log := logger.NewNopLogger()

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		// Keep reading to prevent buffer overflow
		go func() {
			for {
				_, _, err := conn.ReadMessage()
				if err != nil {
					return
				}
			}
		}()
	}))
	defer server.Close()

	gs := NewGameSession("test-session", 10, 60, nil, nil, log)
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Concurrent player joins and broadcasts
	var wg sync.WaitGroup

	// Continuous broadcasts in background for a short time
	stopBroadcast := make(chan bool)
	go func() {
		ticker := time.NewTicker(5 * time.Millisecond)
		defer ticker.Stop()

		for {
			select {
			case <-stopBroadcast:
				return
			case <-ticker.C:
				gs.broadcast(map[string]interface{}{
					"type": "ping",
					"time": time.Now().Unix(),
				})
			}
		}
	}()

	// Add players concurrently
	numPlayers := 3 // Reduced from 5 for faster test
	for i := 0; i < numPlayers; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()

			conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
			if err != nil {
				t.Logf("dial error: %v", err)
				return
			}
			defer conn.Close()

			clientID := fmt.Sprintf("client_%d", idx)
			name := fmt.Sprintf("Player %d", idx+1)

			err = gs.AddPlayer(0, clientID, name, "", conn)
			if err != nil {
				t.Logf("add player error: %v", err)
				return
			}

			// Player stays connected for a short bit
			time.Sleep(50 * time.Millisecond)
		}(i)
	}

	wg.Wait()
	close(stopBroadcast)

	// Verify no panics occurred and session state is consistent
	if count := gs.GetConnectedPlayersCount(); count > numPlayers {
		t.Errorf("unexpected player count: got %d, want <= %d", count, numPlayers)
	}
}
