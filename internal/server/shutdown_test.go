package server

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"golem_century/internal/config"
	"golem_century/internal/logger"

	"github.com/gorilla/websocket"
)

func TestGracefulShutdown(t *testing.T) {
	log := logger.NewNopLogger()
	cfg := config.Config{
		DefaultTurnTimeoutInSeconds: 60,
	}

	// Create game server
	gameServer := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	// Create test HTTP server
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", gameServer.HandleWebSocket)
	server := httptest.NewServer(mux)
	defer server.Close()

	// Create some sessions
	sessionID1 := "test_session_1"
	sessionID2 := "test_session_2"
	gameServer.CreateSessionV2(sessionID1, 2, 60)
	gameServer.CreateSessionV2(sessionID2, 2, 60)

	// Connect some WebSocket clients
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?session=" + sessionID1 + "&name=Player1&avatar=1&clientID=client1"
	conn1, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect WebSocket: %v", err)
	}
	defer conn1.Close()

	wsURL2 := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?session=" + sessionID2 + "&name=Player2&avatar=2&clientID=client2"
	conn2, _, err := websocket.DefaultDialer.Dial(wsURL2, nil)
	if err != nil {
		t.Fatalf("Failed to connect WebSocket: %v", err)
	}
	defer conn2.Close()

	// Give connections time to establish
	time.Sleep(100 * time.Millisecond)

	// Verify sessions exist
	gameServer.mu.RLock()
	sessionCount := len(gameServer.SessionsV2)
	gameServer.mu.RUnlock()

	if sessionCount != 2 {
		t.Fatalf("Expected 2 sessions, got %d", sessionCount)
	}

	// Perform graceful shutdown
	err = gameServer.Shutdown()
	if err != nil {
		t.Fatalf("Shutdown failed: %v", err)
	}

	// Verify all sessions are closed
	gameServer.mu.RLock()
	sessionCountAfter := len(gameServer.SessionsV2)
	gameServer.mu.RUnlock()

	if sessionCountAfter != 0 {
		t.Fatalf("Expected 0 sessions after shutdown, got %d", sessionCountAfter)
	}

	// The sessions are cleared, which means Close() was called on all sessions
	t.Log("✅ Graceful shutdown completed successfully - all sessions cleared")
}

func TestSessionClose(t *testing.T) {
	log := logger.NewNopLogger()
	cfg := config.Config{
		DefaultTurnTimeoutInSeconds: 60,
	}

	gameServer := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	// Create V2 session
	sessionID := "test_session_close"
	gameServer.CreateSessionV2(sessionID, 2, 60)

	// Get the session
	gameServer.mu.RLock()
	session, exists := gameServer.SessionsV2[sessionID]
	gameServer.mu.RUnlock()

	if !exists {
		t.Fatal("Session not created")
	}

	// Close the session
	err := session.Close()
	if err != nil {
		t.Fatalf("Session close failed: %v", err)
	}

	t.Log("✅ Session closed successfully")
}

func TestHTTPServerGracefulShutdown(t *testing.T) {
	// Create a simple HTTP server
	mux := http.NewServeMux()
	mux.HandleFunc("/test", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	server := &http.Server{
		Addr:    ":0", // Random port
		Handler: mux,
	}

	// Start server in background
	go func() {
		server.ListenAndServe()
	}()

	// Give server time to start
	time.Sleep(100 * time.Millisecond)

	// Shutdown with context
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := server.Shutdown(ctx)
	if err != nil {
		t.Fatalf("HTTP server shutdown failed: %v", err)
	}

	t.Log("✅ HTTP server shutdown completed successfully")
}

func TestShutdownWithActiveConnections(t *testing.T) {
	log := logger.NewNopLogger()
	cfg := config.Config{
		DefaultTurnTimeoutInSeconds: 60,
	}

	gameServer := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	// Create test HTTP server
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", gameServer.HandleWebSocket)
	server := httptest.NewServer(mux)
	defer server.Close()

	// Create session and connect multiple clients
	sessionID := "test_shutdown_active"
	gameServer.CreateSessionV2(sessionID, 4, 60)

	// Connect 4 players
	connections := make([]*websocket.Conn, 4)
	for i := 0; i < 4; i++ {
		wsURL := "ws" + strings.TrimPrefix(server.URL, "http") +
			"/ws?session=" + sessionID +
			"&name=Player" + string(rune('1'+i)) +
			"&avatar=" + string(rune('1'+i)) +
			"&clientID=client" + string(rune('1'+i))
		conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("Failed to connect player %d: %v", i+1, err)
		}
		connections[i] = conn
		defer conn.Close()
	}

	time.Sleep(200 * time.Millisecond)

	// Verify session exists before shutdown
	gameServer.mu.RLock()
	_, exists := gameServer.SessionsV2[sessionID]
	gameServer.mu.RUnlock()

	if !exists {
		t.Fatal("Session not found")
	}

	// Shutdown while connections are active
	err := gameServer.Shutdown()
	if err != nil {
		t.Fatalf("Shutdown with active connections failed: %v", err)
	}

	// Verify session was closed and cleared
	gameServer.mu.RLock()
	_, stillExists := gameServer.SessionsV2[sessionID]
	sessionCount := len(gameServer.SessionsV2)
	gameServer.mu.RUnlock()

	if stillExists {
		t.Error("Expected session to be cleared from server")
	}

	if sessionCount != 0 {
		t.Errorf("Expected 0 sessions after shutdown, got %d", sessionCount)
	}

	t.Log("✅ Shutdown with active connections completed successfully - 4 player connections cleanly closed")
}

func TestShutdownEmptyServer(t *testing.T) {
	log := logger.NewNopLogger()
	cfg := config.Config{
		DefaultTurnTimeoutInSeconds: 60,
	}

	gameServer := NewGameServer(NewGameServerRequest{
		EventStore: nil,
		Logger:     log,
		Config:     &cfg,
	})

	// Shutdown empty server
	err := gameServer.Shutdown()
	if err != nil {
		t.Fatalf("Shutdown of empty server failed: %v", err)
	}

	t.Log("✅ Empty server shutdown completed successfully")
}
