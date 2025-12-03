package mongodb

import (
	"context"
	"fmt"
	"testing"
	"time"

	"golem_century/internal/config"
	"golem_century/internal/events"
)

func TestMongoEventStore(t *testing.T) {
	// Skip if no MongoDB available
	cfg, err := config.LoadConfig()
	if err != nil {
		t.Skip("Config not available")
	}

	ctx := context.Background()
	store, err := NewMongoEventStore(ctx, cfg.MongoURI, cfg.MongoDB+"_test")
	if err != nil {
		t.Skipf("MongoDB not available: %v", err)
	}
	defer store.Close(ctx)

	gameID := "test-game-1"

	t.Run("AppendEvent", func(t *testing.T) {
		event := &events.Event{
			GameID:    gameID,
			EventType: events.EventGameCreated,
			PlayerID:  0,
			Data: map[string]interface{}{
				"numPlayers": 2,
				"seed":       12345,
			},
		}

		eventID, err := store.AppendEvent(ctx, event)
		if err != nil {
			t.Fatalf("Failed to append event: %v", err)
		}

		if eventID <= 0 {
			t.Errorf("Expected positive event ID, got %d", eventID)
		}
	})

	t.Run("GetEvents", func(t *testing.T) {
		// Append a few events
		for i := 0; i < 5; i++ {
			event := &events.Event{
				GameID:    gameID,
				EventType: events.EventPlayCardRequested,
				PlayerID:  i % 2,
				Data: map[string]interface{}{
					"cardIndex": i,
				},
			}
			_, err := store.AppendEvent(ctx, event)
			if err != nil {
				t.Fatalf("Failed to append event: %v", err)
			}
		}

		// Get all events
		events, err := store.GetEvents(ctx, gameID, 0)
		if err != nil {
			t.Fatalf("Failed to get events: %v", err)
		}

		if len(events) < 6 { // 1 GameCreated + 5 PlayCardRequested
			t.Errorf("Expected at least 6 events, got %d", len(events))
		}

		// Verify events are ordered
		for i := 1; i < len(events); i++ {
			if events[i].ID <= events[i-1].ID {
				t.Errorf("Events not ordered: %d <= %d", events[i].ID, events[i-1].ID)
			}
		}
	})

	t.Run("GetEventsFromOffset", func(t *testing.T) {
		events, err := store.GetEvents(ctx, gameID, 0)
		if err != nil {
			t.Fatalf("Failed to get events: %v", err)
		}

		if len(events) < 2 {
			t.Skip("Not enough events for test")
		}

		// Get events from midpoint
		midpoint := events[len(events)/2].ID
		laterEvents, err := store.GetEvents(ctx, gameID, midpoint)
		if err != nil {
			t.Fatalf("Failed to get events from offset: %v", err)
		}

		if len(laterEvents) >= len(events) {
			t.Errorf("Expected fewer events from offset, got %d vs %d", len(laterEvents), len(events))
		}

		// Verify first event ID matches offset
		if laterEvents[0].ID != midpoint {
			t.Errorf("Expected first event ID %d, got %d", midpoint, laterEvents[0].ID)
		}
	})

	t.Run("GetLatestEventID", func(t *testing.T) {
		latestID, err := store.GetLatestEventID(ctx, gameID)
		if err != nil {
			t.Fatalf("Failed to get latest event ID: %v", err)
		}

		if latestID <= 0 {
			t.Errorf("Expected positive latest event ID, got %d", latestID)
		}

		// Append another event
		event := &events.Event{
			GameID:    gameID,
			EventType: events.EventTurnEnded,
			PlayerID:  1,
			Data:      map[string]interface{}{},
		}
		newID, err := store.AppendEvent(ctx, event)
		if err != nil {
			t.Fatalf("Failed to append event: %v", err)
		}

		// Get latest again
		latestID2, err := store.GetLatestEventID(ctx, gameID)
		if err != nil {
			t.Fatalf("Failed to get latest event ID: %v", err)
		}

		if latestID2 != newID {
			t.Errorf("Expected latest event ID %d, got %d", newID, latestID2)
		}
	})

	t.Run("EventExists", func(t *testing.T) {
		latestID, _ := store.GetLatestEventID(ctx, gameID)

		exists, err := store.EventExists(ctx, gameID, latestID)
		if err != nil {
			t.Fatalf("Failed to check event existence: %v", err)
		}

		if !exists {
			t.Error("Expected event to exist")
		}

		// Check non-existent event
		exists, err = store.EventExists(ctx, gameID, 999999)
		if err != nil {
			t.Fatalf("Failed to check event existence: %v", err)
		}

		if exists {
			t.Error("Expected event to not exist")
		}
	})

	t.Run("GetEventsByTimeRange", func(t *testing.T) {
		now := time.Now()
		past := now.Add(-1 * time.Hour)
		future := now.Add(1 * time.Hour)

		events, err := store.GetEventsByTimeRange(ctx, gameID, past, future)
		if err != nil {
			t.Fatalf("Failed to get events by time range: %v", err)
		}

		if len(events) == 0 {
			t.Error("Expected events in time range")
		}

		// Verify all events are within time range
		for _, event := range events {
			if event.Timestamp.Before(past) || event.Timestamp.After(future) {
				t.Errorf("Event timestamp %v not in range [%v, %v]", event.Timestamp, past, future)
			}
		}
	})
}

func TestEventIdempotency(t *testing.T) {
	cfg, err := config.LoadConfig()
	if err != nil {
		t.Skip("Config not available")
	}

	ctx := context.Background()
	store, err := NewMongoEventStore(ctx, cfg.MongoURI, cfg.MongoDB+"_test")
	if err != nil {
		t.Skipf("MongoDB not available: %v", err)
	}
	defer store.Close(ctx)

	gameID := fmt.Sprintf("test-game-idempotency-%d", time.Now().UnixNano())

	event := &events.Event{
		GameID:    gameID,
		EventType: events.EventGameCreated,
		PlayerID:  0,
		Data: map[string]interface{}{
			"numPlayers": 2,
		},
	}

	// Append event
	eventID1, err := store.AppendEvent(ctx, event)
	if err != nil {
		t.Fatalf("Failed to append event: %v", err)
	}

	// Check if event exists
	exists, err := store.EventExists(ctx, gameID, eventID1)
	if err != nil {
		t.Fatalf("Failed to check event existence: %v", err)
	}

	if !exists {
		t.Error("Event should exist after appending")
	}

	// Append same event again - should get new ID
	eventID2, err := store.AppendEvent(ctx, event)
	if err != nil {
		t.Fatalf("Failed to append event second time: %v", err)
	}

	if eventID2 <= eventID1 {
		t.Errorf("Expected new event ID to be greater than first: %d <= %d", eventID2, eventID1)
	}
}
