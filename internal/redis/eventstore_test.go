package redis

import (
	"context"
	"testing"
	"time"
)

// MockRedisClient implements RedisClient for testing (exported for use in other packages)
type MockRedisClient struct {
	Streams map[string][]StreamMessage
}

// NewMockRedisClient creates a new mock Redis client
func NewMockRedisClient() *MockRedisClient {
	return &MockRedisClient{
		Streams: make(map[string][]StreamMessage),
	}
}

func (m *MockRedisClient) Ping(ctx context.Context) error {
	return nil
}

func (m *MockRedisClient) Close() error {
	return nil
}

func (m *MockRedisClient) AddToStream(ctx context.Context, stream string, values map[string]interface{}) (string, error) {
	if m.Streams[stream] == nil {
		m.Streams[stream] = make([]StreamMessage, 0)
	}

	id := time.Now().Format("15:04:05.000")
	msg := StreamMessage{
		ID:     id,
		Values: values,
	}
	m.Streams[stream] = append(m.Streams[stream], msg)
	return id, nil
}

func (m *MockRedisClient) ReadStream(ctx context.Context, stream string, startID string, count int64) ([]StreamMessage, error) {
	messages, ok := m.Streams[stream]
	if !ok {
		return []StreamMessage{}, nil
	}

	// Simple implementation - return all messages after startID
	result := make([]StreamMessage, 0)
	startFound := startID == "" || startID == "0"

	for _, msg := range messages {
		if startFound {
			result = append(result, msg)
			if int64(len(result)) >= count && count > 0 {
				break
			}
		} else if msg.ID == startID {
			startFound = true
		}
	}

	return result, nil
}

func (m *MockRedisClient) ReadStreamGroup(ctx context.Context, group, consumer, stream, startID string, count int64) ([]StreamMessage, error) {
	return m.ReadStream(ctx, stream, startID, count)
}

func (m *MockRedisClient) CreateGroup(ctx context.Context, stream, group, startID string) error {
	return nil
}

func (m *MockRedisClient) AckMessage(ctx context.Context, stream, group string, messageIDs ...string) error {
	return nil
}

func (m *MockRedisClient) TrimStream(ctx context.Context, stream string, maxLen int64) error {
	return nil
}

func (m *MockRedisClient) Publish(ctx context.Context, channel string, message interface{}) error {
	return nil
}

func (m *MockRedisClient) Subscribe(ctx context.Context, handler MessageHandler, channels ...string) error {
	return nil
}

func (m *MockRedisClient) Unsubscribe(ctx context.Context, channels ...string) error {
	return nil
}

// TestEventStore tests the event store implementation
func TestEventStore(t *testing.T) {
	mockClient := NewMockRedisClient()
	eventStore := NewEventStore(mockClient)
	ctx := context.Background()

	sessionID := "test-session-1"

	// Test storing events
	t.Run("StoreEvent", func(t *testing.T) {
		event := &GameEvent{
			SessionID:   sessionID,
			PlayerID:    1,
			EventType:   "player_action",
			Timestamp:   time.Now(),
			Data:        map[string]interface{}{"action": "play_card", "cardIndex": 0},
			SequenceNum: 1,
		}

		err := eventStore.StoreEvent(ctx, sessionID, event)
		if err != nil {
			t.Fatalf("Failed to store event: %v", err)
		}

		if event.ID == "" {
			t.Error("Event ID should be set after storing")
		}
	})

	// Test retrieving events
	t.Run("GetEvents", func(t *testing.T) {
		// Store multiple events
		for i := 1; i <= 5; i++ {
			event := &GameEvent{
				SessionID:   sessionID,
				PlayerID:    i,
				EventType:   "player_action",
				Timestamp:   time.Now(),
				Data:        map[string]interface{}{"action": "test", "index": i},
				SequenceNum: int64(i),
			}
			eventStore.StoreEvent(ctx, sessionID, event)
		}

		// Get all events
		events, err := eventStore.GetEvents(ctx, sessionID, "0")
		if err != nil {
			t.Fatalf("Failed to get events: %v", err)
		}

		if len(events) < 5 {
			t.Errorf("Expected at least 5 events, got %d", len(events))
		}
	})

	// Test event replay
	t.Run("ReplayEvents", func(t *testing.T) {
		events, err := eventStore.ReplayEvents(ctx, sessionID)
		if err != nil {
			t.Fatalf("Failed to replay events: %v", err)
		}

		if len(events) == 0 {
			t.Error("Expected events in replay")
		}

		// Verify events are in order
		for i := 0; i < len(events)-1; i++ {
			if events[i].SequenceNum > events[i+1].SequenceNum {
				t.Error("Events are not in sequence order")
			}
		}
	})

	// Test GetEventsSince
	t.Run("GetEventsSince", func(t *testing.T) {
		// Get events from 1 second ago
		since := time.Now().Add(-1 * time.Second)
		events, err := eventStore.GetEventsSince(ctx, sessionID, since)
		if err != nil {
			t.Fatalf("Failed to get events since: %v", err)
		}

		// All events should be recent
		for _, event := range events {
			if event.Timestamp.Before(since) {
				t.Error("Event timestamp is before requested time")
			}
		}
	})
}

// TestNotificationService tests the notification service
func TestNotificationService(t *testing.T) {
	mockClient := NewMockRedisClient()
	notificationService := NewNotificationService(mockClient)
	ctx := context.Background()

	sessionID := "test-session-1"

	t.Run("NotifyStateChange", func(t *testing.T) {
		state := map[string]interface{}{
			"currentTurn": 1,
			"round":       1,
		}

		err := notificationService.NotifyStateChange(ctx, sessionID, state)
		if err != nil {
			t.Fatalf("Failed to notify state change: %v", err)
		}
	})

	t.Run("NotifyPlayerAction", func(t *testing.T) {
		err := notificationService.NotifyPlayerAction(ctx, sessionID, 1, "play_card")
		if err != nil {
			t.Fatalf("Failed to notify player action: %v", err)
		}
	})

	t.Run("NotifyPlayerReconnect", func(t *testing.T) {
		err := notificationService.NotifyPlayerReconnect(ctx, sessionID, 1)
		if err != nil {
			t.Fatalf("Failed to notify player reconnect: %v", err)
		}
	})
}

// TestEventReplay tests event replay functionality
func TestEventReplay(t *testing.T) {
	mockClient := NewMockRedisClient()
	eventStore := NewEventStore(mockClient)
	ctx := context.Background()

	sessionID := "replay-test-session"

	// Simulate a game sequence
	events := []GameEvent{
		{SessionID: sessionID, PlayerID: 1, EventType: "game_start", SequenceNum: 1, Timestamp: time.Now(), Data: map[string]interface{}{}},
		{SessionID: sessionID, PlayerID: 1, EventType: "player_action", SequenceNum: 2, Timestamp: time.Now(), Data: map[string]interface{}{"action": "play_card"}},
		{SessionID: sessionID, PlayerID: 2, EventType: "player_action", SequenceNum: 3, Timestamp: time.Now(), Data: map[string]interface{}{"action": "acquire_card"}},
		{SessionID: sessionID, PlayerID: 1, EventType: "player_disconnect", SequenceNum: 4, Timestamp: time.Now(), Data: map[string]interface{}{}},
		{SessionID: sessionID, PlayerID: 1, EventType: "player_connect", SequenceNum: 5, Timestamp: time.Now(), Data: map[string]interface{}{}},
		{SessionID: sessionID, PlayerID: 0, EventType: "game_end", SequenceNum: 6, Timestamp: time.Now(), Data: map[string]interface{}{}},
	}

	// Store all events
	for i := range events {
		err := eventStore.StoreEvent(ctx, sessionID, &events[i])
		if err != nil {
			t.Fatalf("Failed to store event %d: %v", i, err)
		}
	}

	// Replay and verify
	t.Run("ReplaySequence", func(t *testing.T) {
		replayed, err := eventStore.ReplayEvents(ctx, sessionID)
		if err != nil {
			t.Fatalf("Failed to replay events: %v", err)
		}

		if len(replayed) != len(events) {
			t.Errorf("Expected %d events, got %d", len(events), len(replayed))
		}

		// Verify sequence numbers are in order
		for i := 0; i < len(replayed)-1; i++ {
			if replayed[i].SequenceNum >= replayed[i+1].SequenceNum {
				t.Error("Events not in correct sequence order")
			}
		}

		// Verify event types
		if replayed[0].EventType != "game_start" {
			t.Error("First event should be game_start")
		}
		if replayed[len(replayed)-1].EventType != "game_end" {
			t.Error("Last event should be game_end")
		}
	})
}
