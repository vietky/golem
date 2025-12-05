package eventstore_test

import (
	"context"
	"testing"
	"time"

	"golem_century/internal/eventstore"
	"golem_century/internal/game"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// TestEventStoreIntegration tests the event store integration
func TestEventStoreIntegration(t *testing.T) {
	// Skip if not in integration test mode
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	// Connect to MongoDB (use test database)
	mongoURI := "mongodb://localhost:27017"
	testDB := "golem_game_test"

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		t.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer client.Disconnect(context.Background())

	// Clean up test database before test
	if err := client.Database(testDB).Drop(context.Background()); err != nil {
		t.Logf("Warning: failed to drop test database: %v", err)
	}

	// Create event store
	config := eventstore.EventStoreConfig{
		MongoURI:      mongoURI,
		Database:      testDB,
		EventsColl:    "game_events_test",
		SnapshotsColl: "game_snapshots_test",
	}

	storeResp := eventstore.NewMongoEventStore(eventstore.NewMongoEventStoreRequest{
		Config: config,
	})
	if storeResp.Error != nil {
		t.Fatalf("Failed to create event store: %v", storeResp.Error)
	}
	defer storeResp.Store.Close()

	store := storeResp.Store

	// Create a test game
	gameState := game.NewGameState(2, 12345)
	gameID := "test-game-001"

	// Test 1: Store initial game state
	t.Run("Store Initial State", func(t *testing.T) {
		req := eventstore.StoreEventRequest{
			GameID:    gameID,
			PlayerID:  0,
			Action:    game.Action{Type: -1}, // Initial state marker
			GameState: gameState,
		}

		resp := store.StoreEvent(req)
		if resp.Error != nil {
			t.Fatalf("Failed to store initial state: %v", resp.Error)
		}

		if resp.SequenceNum != 1 {
			t.Errorf("Expected sequence number 1, got %d", resp.SequenceNum)
		}
	})

	// Test 2: Execute an action and store event
	t.Run("Store Player Action", func(t *testing.T) {
		// Play a card action
		action := game.Action{
			Type:      game.PlayCard,
			CardIndex: 0,
		}

		// Execute the action
		if err := gameState.ExecuteAction(action); err != nil {
			t.Fatalf("Failed to execute action: %v", err)
		}

		// Store the event
		req := eventstore.StoreEventRequest{
			GameID:    gameID,
			PlayerID:  1,
			Action:    action,
			GameState: gameState,
		}

		resp := store.StoreEvent(req)
		if resp.Error != nil {
			t.Fatalf("Failed to store action event: %v", resp.Error)
		}

		if resp.SequenceNum != 2 {
			t.Errorf("Expected sequence number 2, got %d", resp.SequenceNum)
		}
	})

	// Test 3: Retrieve events
	t.Run("Retrieve Events", func(t *testing.T) {
		req := eventstore.GetEventsRequest{
			GameID:       gameID,
			FromSequence: 0,
			Limit:        100,
		}

		resp := store.GetEvents(req)
		if resp.Error != nil {
			t.Fatalf("Failed to retrieve events: %v", resp.Error)
		}

		if len(resp.Events) != 2 {
			t.Errorf("Expected 2 events, got %d", len(resp.Events))
		}

		// Verify first event is initial state
		if resp.Events[0].Action.Type != -1 {
			t.Errorf("Expected first event to be initial state (Type=-1), got %d", resp.Events[0].Action.Type)
		}

		// Verify second event is the play card action
		if resp.Events[1].Action.Type != game.PlayCard {
			t.Errorf("Expected second event to be PlayCard action, got %d", resp.Events[1].Action.Type)
		}
	})

	// Test 4: Retrieve snapshot
	t.Run("Retrieve Snapshot", func(t *testing.T) {
		req := eventstore.GetSnapshotRequest{
			GameID: gameID,
		}

		resp := store.GetSnapshot(req)
		if resp.Error != nil {
			t.Fatalf("Failed to retrieve snapshot: %v", resp.Error)
		}

		if resp.Snapshot == nil {
			t.Fatal("Expected snapshot to exist")
		}

		if resp.Snapshot.GameID != gameID {
			t.Errorf("Expected game ID %s, got %s", gameID, resp.Snapshot.GameID)
		}

		if resp.Snapshot.SequenceNum != 2 {
			t.Errorf("Expected sequence number 2, got %d", resp.Snapshot.SequenceNum)
		}
	})

	// Test 5: Simulate multiple actions
	t.Run("Simulate Multiple Actions", func(t *testing.T) {
		actions := []game.Action{
			{Type: game.Rest},
			{Type: game.PlayCard, CardIndex: 1},
			{Type: game.Rest},
		}

		for i, action := range actions {
			// Move to next turn if needed
			if i > 0 {
				gameState.NextTurn()
			}

			// Execute action
			if err := gameState.ExecuteAction(action); err != nil {
				t.Logf("Action %d failed (expected for some actions): %v", i, err)
				continue
			}

			// Store event
			currentPlayer := gameState.GetCurrentPlayer()
			req := eventstore.StoreEventRequest{
				GameID:    gameID,
				PlayerID:  currentPlayer.ID,
				Action:    action,
				GameState: gameState,
			}

			resp := store.StoreEvent(req)
			if resp.Error != nil {
				t.Fatalf("Failed to store event %d: %v", i, resp.Error)
			}
		}

		// Verify all events are stored
		eventsReq := eventstore.GetEventsRequest{
			GameID:       gameID,
			FromSequence: 0,
			Limit:        100,
		}

		eventsResp := store.GetEvents(eventsReq)
		if eventsResp.Error != nil {
			t.Fatalf("Failed to retrieve all events: %v", eventsResp.Error)
		}

		// Should have initial state + 2 actions + 3 new actions (some may have failed)
		if len(eventsResp.Events) < 3 {
			t.Errorf("Expected at least 3 events, got %d", len(eventsResp.Events))
		}

		t.Logf("Total events stored: %d", len(eventsResp.Events))
	})

	// Clean up
	if err := client.Database(testDB).Drop(context.Background()); err != nil {
		t.Logf("Warning: failed to clean up test database: %v", err)
	}
}
