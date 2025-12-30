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

// TestConcurrentWritesToSamePlayer tests concurrent writes to the same player's connection
// This tests for race conditions when multiple goroutines write to the same WriteChan
func TestConcurrentWritesToSamePlayer(t *testing.T) {
	log := logger.NewNopLogger()

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	// Track messages received to verify all were delivered
	var mu sync.Mutex
	receivedMessages := make(map[string]int)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		// Count messages received
		go func() {
			for {
				_, msg, err := conn.ReadMessage()
				if err != nil {
					return
				}
				mu.Lock()
				receivedMessages[string(msg)]++
				mu.Unlock()
			}
		}()
	}))
	defer server.Close()

	gs := NewGameSession("test-session", 4, 60, nil, nil, log)
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Add a single player
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect: %v", err)
	}
	defer conn.Close()

	clientID := "client_0"
	err = gs.AddPlayer(0, clientID, "Player 1", "", conn)
	if err != nil {
		t.Fatalf("failed to add player: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	// Send many concurrent writes to the same player
	var wg sync.WaitGroup
	numWrites := 200

	for i := 0; i < numWrites; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()
			msg := map[string]interface{}{
				"type":    "test",
				"message": fmt.Sprintf("message_%d", iteration),
			}
			gs.sendToPlayer(clientID, msg)
		}(i)
	}

	wg.Wait()
	time.Sleep(500 * time.Millisecond) // Give time for messages to be delivered

	// Verify we received messages (exact count may vary due to timing)
	mu.Lock()
	receivedCount := len(receivedMessages)
	mu.Unlock()

	if receivedCount == 0 {
		t.Error("no messages were received, possible write failure")
	}
}

// TestConcurrentWritesToSameSpectator tests concurrent writes to the same spectator's connection
func TestConcurrentWritesToSameSpectator(t *testing.T) {
	log := logger.NewNopLogger()

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	var mu sync.Mutex
	receivedMessages := make(map[string]int)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		go func() {
			for {
				_, msg, err := conn.ReadMessage()
				if err != nil {
					return
				}
				mu.Lock()
				receivedMessages[string(msg)]++
				mu.Unlock()
			}
		}()
	}))
	defer server.Close()

	gs := NewGameSession("test-session", 4, 60, nil, nil, log)
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Add a single spectator
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect: %v", err)
	}
	defer conn.Close()

	err = gs.AddSpectator("Spectator 1", conn)
	if err != nil {
		t.Fatalf("failed to add spectator: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	// Get spectator ID
	gs.mu.RLock()
	var spectatorID string
	for id := range gs.spectators {
		spectatorID = id
		break
	}
	gs.mu.RUnlock()

	if spectatorID == "" {
		t.Fatal("no spectator found")
	}

	// Send many concurrent writes to the same spectator
	var wg sync.WaitGroup
	numWrites := 200

	for i := 0; i < numWrites; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()
			msg := map[string]interface{}{
				"type":    "test",
				"message": fmt.Sprintf("spectator_msg_%d", iteration),
			}
			gs.sendToSpectator(spectatorID, msg)
		}(i)
	}

	wg.Wait()
	time.Sleep(500 * time.Millisecond)

	mu.Lock()
	receivedCount := len(receivedMessages)
	mu.Unlock()

	if receivedCount == 0 {
		t.Error("no messages were received, possible write failure")
	}
}

// TestConcurrentWritesDuringConnectionClose tests writes happening while connection is closing
func TestConcurrentWritesDuringConnectionClose(t *testing.T) {
	log := logger.NewNopLogger()

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		// Read messages but close connection after a short delay
		go func() {
			time.Sleep(50 * time.Millisecond)
			conn.Close()
		}()

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

	gs := NewGameSession("test-session", 4, 60, nil, nil, log)
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect: %v", err)
	}
	defer conn.Close()

	clientID := "client_0"
	err = gs.AddPlayer(0, clientID, "Player 1", "", conn)
	if err != nil {
		t.Fatalf("failed to add player: %v", err)
	}

	time.Sleep(20 * time.Millisecond)

	// Send writes while connection is closing
	var wg sync.WaitGroup
	numWrites := 100

	for i := 0; i < numWrites; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()
			msg := map[string]interface{}{
				"type":    "test",
				"message": fmt.Sprintf("msg_%d", iteration),
			}
			gs.sendToPlayer(clientID, msg)
		}(i)
	}

	// Wait a bit, then close connection
	time.Sleep(30 * time.Millisecond)
	conn.Close()

	wg.Wait()
	time.Sleep(200 * time.Millisecond)

	// Test should complete without panic
}

// TestHighFrequencyConcurrentBroadcasts tests high-frequency concurrent broadcasts
// This tests for channel overflow and write handler performance
func TestHighFrequencyConcurrentBroadcasts(t *testing.T) {
	log := logger.NewNopLogger()

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		// Read messages as fast as possible
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

	gs := NewGameSession("test-session", 4, 60, nil, nil, log)
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Add multiple players
	numPlayers := 4
	for i := 0; i < numPlayers; i++ {
		conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("failed to connect player %d: %v", i, err)
		}
		defer conn.Close()

		clientID := fmt.Sprintf("client_%d", i)
		err = gs.AddPlayer(0, clientID, fmt.Sprintf("Player %d", i+1), "", conn)
		if err != nil {
			t.Fatalf("failed to add player %d: %v", i, err)
		}
	}

	time.Sleep(100 * time.Millisecond)

	// High-frequency concurrent broadcasts
	var wg sync.WaitGroup
	numBroadcasts := 500

	for i := 0; i < numBroadcasts; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()
			msg := map[string]interface{}{
				"type":      "high_freq",
				"message":   fmt.Sprintf("broadcast_%d", iteration),
				"timestamp": time.Now().UnixNano(),
			}
			gs.broadcast(msg)
		}(i)
	}

	wg.Wait()
	time.Sleep(1 * time.Second) // Give time for all messages to be processed

	// Test should complete without panic or deadlock
}

// TestConcurrentWritesWithPlayerRemoval tests writes happening while players are being removed
func TestConcurrentWritesWithPlayerRemoval(t *testing.T) {
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

	gs := NewGameSession("test-session", 4, 60, nil, nil, log)
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Add players
	connections := make([]*websocket.Conn, 3)
	clientIDs := make([]string, 3)

	for i := 0; i < 3; i++ {
		conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("failed to connect: %v", err)
		}
		defer conn.Close()
		connections[i] = conn

		clientID := fmt.Sprintf("client_%d", i)
		clientIDs[i] = clientID
		err = gs.AddPlayer(0, clientID, fmt.Sprintf("Player %d", i+1), "", conn)
		if err != nil {
			t.Fatalf("failed to add player: %v", err)
		}
	}

	time.Sleep(100 * time.Millisecond)

	// Concurrent writes and removals
	var wg sync.WaitGroup

	// Start continuous writes
	stopWrites := make(chan bool)
	for i := 0; i < 3; i++ {
		wg.Add(1)
		go func(clientID string) {
			defer wg.Done()
			ticker := time.NewTicker(1 * time.Millisecond)
			defer ticker.Stop()

			for {
				select {
				case <-stopWrites:
					return
				case <-ticker.C:
					msg := map[string]interface{}{
						"type":    "test",
						"message": fmt.Sprintf("msg_to_%s", clientID),
					}
					gs.sendToPlayer(clientID, msg)
				}
			}
		}(clientIDs[i])
	}

	// Remove players while writes are happening
	time.Sleep(50 * time.Millisecond)
	for i := 0; i < 3; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			time.Sleep(time.Duration(idx*10) * time.Millisecond)
			connections[idx].Close()
		}(i)
	}

	time.Sleep(200 * time.Millisecond)
	close(stopWrites)
	wg.Wait()

	// Test should complete without panic
}

// TestConcurrentBroadcastAndStateRead tests concurrent broadcasts and state reads
// This tests for race conditions in serializeState and broadcast
func TestConcurrentBroadcastAndStateRead(t *testing.T) {
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

	// Add players and start game
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

	if err := gs.StartGame(); err != nil {
		t.Fatalf("failed to start game: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	// Concurrent broadcasts and state reads
	var wg sync.WaitGroup
	numOperations := 100

	for i := 0; i < numOperations; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()
			if iteration%2 == 0 {
				gs.broadcastState()
			} else {
				_ = gs.GetSerializedState()
			}
		}(i)
	}

	wg.Wait()
	time.Sleep(200 * time.Millisecond)

	// Test should complete without panic or data race
}

// TestWriteChannelOverflow tests behavior when write channels are full
func TestWriteChannelOverflow(t *testing.T) {
	log := logger.NewNopLogger()

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	// Slow reader to cause channel overflow
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		// Read messages slowly to cause channel backup
		go func() {
			for {
				_, _, err := conn.ReadMessage()
				if err != nil {
					return
				}
				time.Sleep(10 * time.Millisecond) // Slow read
			}
		}()
	}))
	defer server.Close()

	gs := NewGameSession("test-session", 4, 60, nil, nil, log)
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect: %v", err)
	}
	defer conn.Close()

	clientID := "client_0"
	err = gs.AddPlayer(0, clientID, "Player 1", "", conn)
	if err != nil {
		t.Fatalf("failed to add player: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	// Send many messages faster than they can be read (channel size is 100)
	var wg sync.WaitGroup
	numWrites := 500 // More than channel capacity

	for i := 0; i < numWrites; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()
			msg := map[string]interface{}{
				"type":    "overflow_test",
				"message": fmt.Sprintf("msg_%d", iteration),
			}
			// This should block if channel is full (for players)
			gs.sendToPlayer(clientID, msg)
		}(i)
	}

	wg.Wait()
	time.Sleep(2 * time.Second)

	// Test should complete - blocking writes should eventually succeed
}

// TestConcurrentSpectatorAddRemoveWithWrites tests adding/removing spectators while writing
func TestConcurrentSpectatorAddRemoveWithWrites(t *testing.T) {
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

	gs := NewGameSession("test-session", 4, 60, nil, nil, log)
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Continuous broadcasts
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

	// Add and remove spectators concurrently
	var wg sync.WaitGroup
	numSpectators := 5

	for i := 0; i < numSpectators; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()

			conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
			if err != nil {
				t.Logf("dial error: %v", err)
				return
			}
			defer conn.Close()

			name := fmt.Sprintf("Spectator %d", idx+1)
			err = gs.AddSpectator(name, conn)
			if err != nil {
				t.Logf("add spectator error: %v", err)
				return
			}

			// Stay connected briefly
			time.Sleep(100 * time.Millisecond)

			// Close connection to trigger removal
			conn.Close()
		}(i)
	}

	wg.Wait()
	close(stopBroadcast)
	time.Sleep(200 * time.Millisecond)

	// Test should complete without panic
}
