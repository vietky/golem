package integration

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"golem_century/internal/events"
	"golem_century/internal/events/mongodb"
	"golem_century/internal/events/redis"
	"golem_century/internal/game"
	"golem_century/internal/logger"

	"go.uber.org/zap"
)

// TestIntegrationWithDockerContainers tests the full stack with MongoDB and Redis
func TestIntegrationWithDockerContainers(t *testing.T) {
	// Skip if not running integration tests
	if os.Getenv("INTEGRATION_TEST") != "true" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=true to run")
	}

	// Initialize centralized logger
	if err := logger.InitLogger(true); err != nil {
		t.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	log := logger.GetLogger()
	log.Info("Starting integration test with MongoDB and Redis")

	// MongoDB connection
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	// Redis connection
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	ctx := context.Background()

	// Generate unique database name for this test run
	dbName := fmt.Sprintf("golem_test_%d", time.Now().Unix())

	// Create event store
	log.Info("Connecting to MongoDB", zap.String("uri", mongoURI), zap.String("database", dbName))
	eventStore, err := mongodb.NewMongoEventStore(ctx, mongoURI, dbName)
	if err != nil {
		t.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer func() {
		// Clean up test database
		eventStore.Close(ctx)
	}()

	// Create event publisher
	log.Info("Connecting to Redis", zap.String("addr", redisAddr))
	eventPublisher, err := redis.NewRedisEventPublisher(redisAddr, "", 0)
	if err != nil {
		t.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer eventPublisher.Close()

	t.Run("CreateAndStoreGame", func(t *testing.T) {
		gameID := fmt.Sprintf("test-game-%d", time.Now().Unix())
		log.Info("Creating test game", zap.String("gameID", gameID))

		// Create a new game (we don't need to use it, just validate storage)
		_ = game.NewGameState(2, time.Now().Unix())

		// Store initial game created event
		event := &events.Event{
			GameID:    gameID,
			EventType: events.EventGameCreated,
			PlayerID:  0,
			Data: map[string]interface{}{
				"numPlayers": 2,
				"seed":       time.Now().Unix(),
			},
			Timestamp: time.Now(),
		}

		eventID, err := eventStore.AppendEvent(ctx, event)
		if err != nil {
			t.Fatalf("Failed to store event: %v", err)
		}

		log.Info("Event stored successfully",
			zap.String("gameID", gameID),
			zap.Int64("eventID", eventID))

		if eventID != 1 {
			t.Errorf("Expected first event ID to be 1, got %d", eventID)
		}

		// Publish event to Redis
		err = eventPublisher.Publish(ctx, gameID, event)
		if err != nil {
			t.Fatalf("Failed to publish event: %v", err)
		}

		log.Info("Event published to Redis successfully")

		// Retrieve events
		retrievedEvents, err := eventStore.GetEvents(ctx, gameID, 0)
		if err != nil {
			t.Fatalf("Failed to retrieve events: %v", err)
		}

		if len(retrievedEvents) != 1 {
			t.Errorf("Expected 1 event, got %d", len(retrievedEvents))
		}

		log.Info("Retrieved events successfully",
			zap.Int("count", len(retrievedEvents)))

		// Verify event data
		if retrievedEvents[0].GameID != gameID {
			t.Errorf("Expected gameID %s, got %s", gameID, retrievedEvents[0].GameID)
		}

		if retrievedEvents[0].EventType != events.EventGameCreated {
			t.Errorf("Expected event type %s, got %s", events.EventGameCreated, retrievedEvents[0].EventType)
		}

		t.Logf("✓ Successfully created game, stored event in MongoDB, and published to Redis")
	})

	t.Run("PlayCompleteGameRound", func(t *testing.T) {
		gameID := fmt.Sprintf("test-game-round-%d", time.Now().Unix())
		log.Info("Starting complete game round test", zap.String("gameID", gameID))

		// Create game
		gs := game.NewGameState(2, time.Now().Unix())

		// Store game created event
		createEvent := &events.Event{
			GameID:    gameID,
			EventType: events.EventGameCreated,
			PlayerID:  0,
			Data: map[string]interface{}{
				"numPlayers": 2,
			},
			Timestamp: time.Now(),
		}

		_, err := eventStore.AppendEvent(ctx, createEvent)
		if err != nil {
			t.Fatalf("Failed to store create event: %v", err)
		}

		// Play 10 turns with Rest actions
		for i := 0; i < 10; i++ {
			player := gs.GetCurrentPlayer()

			// Execute rest action
			action := game.Action{Type: game.Rest}
			err := gs.ExecuteAction(action)
			if err != nil {
				t.Fatalf("Turn %d failed: %v", i, err)
			}

			// Store the action event
			actionEvent := &events.Event{
				GameID:    gameID,
				EventType: events.EventPlayerRested,
				PlayerID:  player.ID,
				Data: map[string]interface{}{
					"actionType": "Rest",
					"turn":       gs.CurrentTurn,
					"round":      gs.Round,
				},
				Timestamp: time.Now(),
			}

			eventID, err := eventStore.AppendEvent(ctx, actionEvent)
			if err != nil {
				t.Fatalf("Failed to store action event: %v", err)
			}

			// Publish to Redis
			err = eventPublisher.Publish(ctx, gameID, actionEvent)
			if err != nil {
				t.Fatalf("Failed to publish action event: %v", err)
			}

			log.Info("Turn completed",
				zap.Int("turn", i),
				zap.Int("playerID", player.ID),
				zap.Int64("eventID", eventID))

			// Advance turn
			gs.NextTurn()
		}

		// Retrieve all events
		allEvents, err := eventStore.GetEvents(ctx, gameID, 0)
		if err != nil {
			t.Fatalf("Failed to retrieve all events: %v", err)
		}

		expectedEvents := 11 // 1 create + 10 actions
		if len(allEvents) != expectedEvents {
			t.Errorf("Expected %d events, got %d", expectedEvents, len(allEvents))
		}

		log.Info("Complete game round test passed",
			zap.Int("totalEvents", len(allEvents)),
			zap.Int("turns", 10))

		t.Logf("✓ Successfully played 10 turns, stored %d events, all published to Redis", len(allEvents))
	})

	t.Run("EventReplay", func(t *testing.T) {
		gameID := fmt.Sprintf("test-game-replay-%d", time.Now().Unix())
		log.Info("Starting event replay test", zap.String("gameID", gameID))

		// Create and store 5 events
		for i := 0; i < 5; i++ {
			event := &events.Event{
				GameID:    gameID,
				EventType: events.EventPlayerRested,
				PlayerID:  i % 2,
				Data: map[string]interface{}{
					"action": fmt.Sprintf("action-%d", i),
				},
				Timestamp: time.Now(),
			}

			_, err := eventStore.AppendEvent(ctx, event)
			if err != nil {
				t.Fatalf("Failed to store event %d: %v", i, err)
			}

			time.Sleep(10 * time.Millisecond) // Small delay to ensure ordering
		}

		// Replay from event 0
		events0, err := eventStore.GetEvents(ctx, gameID, 0)
		if err != nil {
			t.Fatalf("Failed to get events from 0: %v", err)
		}

		if len(events0) != 5 {
			t.Errorf("Expected 5 events from 0, got %d", len(events0))
		}

		// Replay from event 3
		events3, err := eventStore.GetEvents(ctx, gameID, 3)
		if err != nil {
			t.Fatalf("Failed to get events from 3: %v", err)
		}

		// Events with ID >= 3 should be: 3, 4, 5 (3 events total)
		if len(events3) != 3 {
			t.Errorf("Expected 3 events from position 3 (IDs 3,4,5), got %d", len(events3))
		}

		log.Info("Event replay test passed",
			zap.Int("totalEvents", len(events0)),
			zap.Int("eventsFrom3", len(events3)))

		t.Logf("✓ Event replay working: %d total events, %d events after position 3", len(events0), len(events3))
	})

	t.Run("ConcurrentEventStorage", func(t *testing.T) {
		gameID := fmt.Sprintf("test-game-concurrent-%d", time.Now().Unix())
		log.Info("Starting concurrent event storage test", zap.String("gameID", gameID))

		// Store events concurrently
		numGoroutines := 10
		errChan := make(chan error, numGoroutines)

		for i := 0; i < numGoroutines; i++ {
			go func(idx int) {
				event := &events.Event{
					GameID:    gameID,
					EventType: events.EventPlayerRested,
					PlayerID:  idx,
					Data: map[string]interface{}{
						"concurrent": true,
						"index":      idx,
					},
					Timestamp: time.Now(),
				}

				_, err := eventStore.AppendEvent(ctx, event)
				errChan <- err
			}(i)
		}

		// Wait for all goroutines
		for i := 0; i < numGoroutines; i++ {
			if err := <-errChan; err != nil {
				t.Errorf("Concurrent store failed: %v", err)
			}
		}

		// Verify all events stored
		allEvents, err := eventStore.GetEvents(ctx, gameID, 0)
		if err != nil {
			t.Fatalf("Failed to get events: %v", err)
		}

		if len(allEvents) != numGoroutines {
			t.Errorf("Expected %d events, got %d", numGoroutines, len(allEvents))
		}

		// Verify event IDs are sequential (atomic counter working)
		for i := 0; i < len(allEvents)-1; i++ {
			if allEvents[i].ID >= allEvents[i+1].ID {
				t.Errorf("Events not in order: %d >= %d", allEvents[i].ID, allEvents[i+1].ID)
			}
		}

		log.Info("Concurrent event storage test passed",
			zap.Int("events", len(allEvents)))

		t.Logf("✓ Concurrent storage working: %d events stored with sequential IDs", len(allEvents))
	})

	log.Info("All integration tests completed successfully")
}
