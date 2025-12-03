// +build integration

package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"golem_century/internal/config"
	"golem_century/internal/events/mongodb"
	"golem_century/internal/events/redis"
	"golem_century/internal/server"
	"golem_century/internal/websocket"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest"
)

// TestFullIntegrationWithDocker tests the complete system with real MongoDB and Redis
// Run with: go test -v -tags=integration ./internal/... -run TestFullIntegrationWithDocker
// Requires: docker-compose up -d mongodb redis
func TestFullIntegrationWithDocker(t *testing.T) {
	logger := zaptest.NewLogger(t)
	defer logger.Sync()

	logger.Info("Starting full integration test with Docker containers")

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		t.Fatalf("Failed to load config: %v", err)
	}

	// Override with test-specific settings
	cfg.MongoDB = "golem_game_integration_test"
	logger.Info("Using test database", zap.String("database", cfg.MongoDB))

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Connect to MongoDB
	logger.Info("Connecting to MongoDB", zap.String("uri", cfg.MongoURI))
	mongoStore, err := mongodb.NewMongoEventStore(ctx, cfg.MongoURI, cfg.MongoDB)
	if err != nil {
		t.Fatalf("MongoDB not available (ensure 'docker-compose up -d mongodb' is running): %v", err)
	}
	defer func() {
		// Clean up test database
		logger.Info("Cleaning up test database")
		if err := mongoStore.DropDatabase(ctx); err != nil {
			logger.Error("Failed to drop test database", zap.Error(err))
		}
		mongoStore.Close(ctx)
	}()
	logger.Info("✓ MongoDB connection successful")

	// Connect to Redis
	logger.Info("Connecting to Redis", zap.String("addr", cfg.RedisAddr))
	redisPublisher, err := redis.NewRedisEventPublisher(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		t.Fatalf("Redis not available (ensure 'docker-compose up -d redis' is running): %v", err)
	}
	defer redisPublisher.Close()
	logger.Info("✓ Redis connection successful")

	// Create WebSocket hub
	logger.Info("Creating WebSocket hub")
	hub := websocket.NewHub(cfg, mongoStore, redisPublisher)
	go hub.Run()
	defer hub.Shutdown()

	// Create HTTP server
	logger.Info("Creating HTTP server")
	srv := server.NewServer(cfg, hub)
	testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/ws" {
			srv.HandleWebSocket(w, r)
		} else {
			srv.Router.ServeHTTP(w, r)
		}
	}))
	defer testServer.Close()

	wsURL := "ws" + strings.TrimPrefix(testServer.URL, "http") + "/ws"
	logger.Info("Test server started", zap.String("wsURL", wsURL))

	// Test 1: Create a game
	t.Run("CreateGame", func(t *testing.T) {
		logger.Info("Test 1: Creating game")
		
		gameID := "integration-test-" + fmt.Sprint(time.Now().Unix())
		err := hub.CreateGame(gameID, 2, 12345)
		if err != nil {
			t.Fatalf("Failed to create game: %v", err)
		}
		logger.Info("✓ Game created", zap.String("gameID", gameID))

		// Verify game exists in MongoDB
		events, err := mongoStore.GetEvents(ctx, gameID, 0)
		if err != nil {
			t.Fatalf("Failed to get events: %v", err)
		}
		if len(events) == 0 {
			t.Fatal("Expected at least GameCreated event")
		}
		logger.Info("✓ Events stored in MongoDB", zap.Int("count", len(events)))

		// Test 2: Connect WebSocket clients
		t.Run("WebSocketClients", func(t *testing.T) {
			logger.Info("Test 2: Connecting WebSocket clients")
			
			// Connect Player 1
			ws1, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
			if err != nil {
				t.Fatalf("Failed to connect player 1: %v", err)
			}
			defer ws1.Close()
			logger.Info("✓ Player 1 connected")

			// Connect Player 2
			ws2, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
			if err != nil {
				t.Fatalf("Failed to connect player 2: %v", err)
			}
			defer ws2.Close()
			logger.Info("✓ Player 2 connected")

			// Test 3: Join game
			t.Run("JoinGame", func(t *testing.T) {
				logger.Info("Test 3: Players joining game")
				
				// Player 1 joins
				joinMsg1 := map[string]interface{}{
					"type":     "join",
					"gameId":   gameID,
					"playerId": 1,
				}
				if err := ws1.WriteJSON(joinMsg1); err != nil {
					t.Fatalf("Failed to send join message: %v", err)
				}
				logger.Info("✓ Player 1 sent join message")

				// Player 2 joins
				joinMsg2 := map[string]interface{}{
					"type":     "join",
					"gameId":   gameID,
					"playerId": 2,
				}
				if err := ws2.WriteJSON(joinMsg2); err != nil {
					t.Fatalf("Failed to send join message: %v", err)
				}
				logger.Info("✓ Player 2 sent join message")

				// Read responses
				var resp1 map[string]interface{}
				if err := ws1.ReadJSON(&resp1); err != nil {
					t.Fatalf("Failed to read response: %v", err)
				}
				logger.Info("✓ Player 1 received join response", zap.Any("response", resp1))

				var resp2 map[string]interface{}
				if err := ws2.ReadJSON(&resp2); err != nil {
					t.Fatalf("Failed to read response: %v", err)
				}
				logger.Info("✓ Player 2 received join response", zap.Any("response", resp2))

				// Test 4: Execute game actions
				t.Run("GameActions", func(t *testing.T) {
					logger.Info("Test 4: Executing game actions")
					
					// Player 1 rests (always valid action)
					restMsg := map[string]interface{}{
						"type": "action",
						"data": map[string]interface{}{
							"type": "rest",
						},
					}
					if err := ws1.WriteJSON(restMsg); err != nil {
						t.Fatalf("Failed to send rest action: %v", err)
					}
					logger.Info("✓ Player 1 sent rest action")

					// Read action response
					var actionResp map[string]interface{}
					if err := ws1.ReadJSON(&actionResp); err != nil {
						t.Fatalf("Failed to read action response: %v", err)
					}
					
					respJSON, _ := json.MarshalIndent(actionResp, "", "  ")
					logger.Info("✓ Received action response", 
						zap.String("response", string(respJSON)))

					// Verify events were persisted
					events, err := mongoStore.GetEvents(ctx, gameID, 0)
					if err != nil {
						t.Fatalf("Failed to get events: %v", err)
					}
					
					logger.Info("✓ Events persisted to MongoDB", 
						zap.Int("totalEvents", len(events)))

					// Test 5: Event replay
					t.Run("EventReplay", func(t *testing.T) {
						logger.Info("Test 5: Testing event replay")
						
						latestID, err := mongoStore.GetLatestEventID(ctx, gameID)
						if err != nil {
							t.Fatalf("Failed to get latest event ID: %v", err)
						}
						
						if latestID <= 0 {
							t.Fatal("Expected positive latest event ID")
						}
						
						logger.Info("✓ Latest event ID retrieved", 
							zap.Int64("eventID", latestID))

						// Get events from beginning
						allEvents, err := mongoStore.GetEvents(ctx, gameID, 0)
						if err != nil {
							t.Fatalf("Failed to get all events: %v", err)
						}
						
						logger.Info("✓ Event replay successful", 
							zap.Int("replayedEvents", len(allEvents)))

						// Verify event types
						eventTypes := make(map[string]int)
						for _, evt := range allEvents {
							eventTypes[evt.Type]++
						}
						
						logger.Info("Event summary", zap.Any("eventTypes", eventTypes))
					})
				})
			})
		})
	})
}

// TestDockerServicesHealthCheck verifies Docker services are running
func TestDockerServicesHealthCheck(t *testing.T) {
	logger := zaptest.NewLogger(t)
	defer logger.Sync()

	logger.Info("Checking Docker services health")

	cfg, err := config.LoadConfig()
	if err != nil {
		t.Skipf("Config not available: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Check MongoDB
	t.Run("MongoDB", func(t *testing.T) {
		mongoStore, err := mongodb.NewMongoEventStore(ctx, cfg.MongoURI, cfg.MongoDB+"_healthcheck")
		if err != nil {
			t.Fatalf("❌ MongoDB not healthy: %v\nRun: docker-compose up -d mongodb", err)
		}
		defer mongoStore.Close(ctx)
		logger.Info("✓ MongoDB is healthy")
	})

	// Check Redis
	t.Run("Redis", func(t *testing.T) {
		redisPublisher, err := redis.NewRedisEventPublisher(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
		if err != nil {
			t.Fatalf("❌ Redis not healthy: %v\nRun: docker-compose up -d redis", err)
		}
		defer redisPublisher.Close()
		logger.Info("✓ Redis is healthy")
	})

	logger.Info("✅ All Docker services are healthy")
}
