package websocket

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"golem_century/internal/config"
	"golem_century/internal/events"
	"golem_century/internal/events/mongodb"
	"golem_century/internal/events/redis"
)

// MockEventStore is a simple in-memory event store for testing
type MockEventStore struct {
	events  []*events.Event
	counter int64
}

func NewMockEventStore() *MockEventStore {
	return &MockEventStore{
		events:  make([]*events.Event, 0),
		counter: 0,
	}
}

func (m *MockEventStore) AppendEvent(ctx context.Context, event *events.Event) (int64, error) {
	m.counter++
	event.ID = m.counter
	event.Timestamp = time.Now()
	m.events = append(m.events, event)
	return m.counter, nil
}

func (m *MockEventStore) GetEvents(ctx context.Context, gameID string, fromEventID int64) ([]*events.Event, error) {
	result := make([]*events.Event, 0)
	for _, e := range m.events {
		if e.GameID == gameID && e.ID >= fromEventID {
			result = append(result, e)
		}
	}
	return result, nil
}

func (m *MockEventStore) GetEventsByTimeRange(ctx context.Context, gameID string, from, to time.Time) ([]*events.Event, error) {
	result := make([]*events.Event, 0)
	for _, e := range m.events {
		if e.GameID == gameID && e.Timestamp.After(from) && e.Timestamp.Before(to) {
			result = append(result, e)
		}
	}
	return result, nil
}

func (m *MockEventStore) GetLatestEventID(ctx context.Context, gameID string) (int64, error) {
	var latestID int64 = 0
	for _, e := range m.events {
		if e.GameID == gameID && e.ID > latestID {
			latestID = e.ID
		}
	}
	return latestID, nil
}

func (m *MockEventStore) EventExists(ctx context.Context, gameID string, eventID int64) (bool, error) {
	for _, e := range m.events {
		if e.GameID == gameID && e.ID == eventID {
			return true, nil
		}
	}
	return false, nil
}

func (m *MockEventStore) Close(ctx context.Context) error {
	return nil
}

// MockEventPublisher is a simple in-memory event publisher for testing
type MockEventPublisher struct {
	published []*events.Event
}

func NewMockEventPublisher() *MockEventPublisher {
	return &MockEventPublisher{
		published: make([]*events.Event, 0),
	}
}

func (m *MockEventPublisher) Publish(ctx context.Context, gameID string, event *events.Event) error {
	m.published = append(m.published, event)
	return nil
}

func (m *MockEventPublisher) Subscribe(ctx context.Context, gameID string) (<-chan *events.Event, error) {
	ch := make(chan *events.Event, 10)
	return ch, nil
}

func (m *MockEventPublisher) Unsubscribe(ctx context.Context, gameID string, ch <-chan *events.Event) error {
	return nil
}

func (m *MockEventPublisher) Close() error {
	return nil
}

func TestHandlePlayCard(t *testing.T) {
	cfg := &config.Config{
		MaxPlayers: 5,
	}

	eventStore := NewMockEventStore()
	eventPub := NewMockEventPublisher()
	hub := NewHub(cfg, eventStore, eventPub)

	// Create a game
	gameID := "test-game-1"
	if err := hub.CreateGame(gameID, 2, 12345); err != nil {
		t.Fatalf("Failed to create game: %v", err)
	}

	ctx := context.Background()

	t.Run("ValidPlayCard", func(t *testing.T) {
		req := PlayCardRequest{
			PlayerID:  1,
			CardIndex: 0,
		}

		resp := hub.HandlePlayCard(ctx, gameID, req)

		if !resp.Success {
			t.Errorf("Expected success, got error: %s", resp.Error)
		}

		if resp.EventID <= 0 {
			t.Error("Expected positive event ID")
		}
	})

	t.Run("InvalidTurn", func(t *testing.T) {
		req := PlayCardRequest{
			PlayerID:  2, // Wrong turn
			CardIndex: 0,
		}

		resp := hub.HandlePlayCard(ctx, gameID, req)

		if resp.Success {
			t.Error("Expected failure for wrong turn")
		}

		if resp.Error != "not your turn" {
			t.Errorf("Expected 'not your turn' error, got: %s", resp.Error)
		}
	})

	t.Run("GameNotFound", func(t *testing.T) {
		req := PlayCardRequest{
			PlayerID:  1,
			CardIndex: 0,
		}

		resp := hub.HandlePlayCard(ctx, "non-existent-game", req)

		if resp.Success {
			t.Error("Expected failure for non-existent game")
		}
	})
}

func TestEventReplay(t *testing.T) {
	cfg := &config.Config{
		MaxPlayers: 5,
	}

	eventStore := NewMockEventStore()
	eventPub := NewMockEventPublisher()
	hub := NewHub(cfg, eventStore, eventPub)

	gameID := "test-game-replay"
	hub.CreateGame(gameID, 2, 12345)

	ctx := context.Background()

	// Generate some events
	for i := 0; i < 5; i++ {
		req := PlayCardRequest{
			PlayerID:  (i % 2) + 1,
			CardIndex: 0,
		}
		hub.HandlePlayCard(ctx, gameID, req)
	}

	// Get all events
	events, err := eventStore.GetEvents(ctx, gameID, 0)
	if err != nil {
		t.Fatalf("Failed to get events: %v", err)
	}

	if len(events) == 0 {
		t.Error("Expected some events")
	}

	// Verify event order
	for i := 1; i < len(events); i++ {
		if events[i].ID <= events[i-1].ID {
			t.Errorf("Events not in order: %d <= %d", events[i].ID, events[i-1].ID)
		}
	}

	// Test getting events from midpoint
	if len(events) > 2 {
		midpoint := events[len(events)/2].ID
		laterEvents, err := eventStore.GetEvents(ctx, gameID, midpoint)
		if err != nil {
			t.Fatalf("Failed to get events from midpoint: %v", err)
		}

		if len(laterEvents) >= len(events) {
			t.Error("Expected fewer events from midpoint")
		}
	}
}

func TestHubLifecycle(t *testing.T) {
	cfg := &config.Config{
		MaxPlayers: 5,
	}

	eventStore := NewMockEventStore()
	eventPub := NewMockEventPublisher()
	hub := NewHub(cfg, eventStore, eventPub)

	// Start hub
	go hub.Run()

	// Create multiple games
	for i := 1; i <= 3; i++ {
		gameID := "test-game-" + string(rune(i+'0'))
		if err := hub.CreateGame(gameID, 2, int64(i*12345)); err != nil {
			t.Errorf("Failed to create game %s: %v", gameID, err)
		}
	}

	// Verify games exist
	for i := 1; i <= 3; i++ {
		gameID := "test-game-" + string(rune(i+'0'))
		if _, exists := hub.GetGameState(gameID); !exists {
			t.Errorf("Game %s should exist", gameID)
		}
	}

	// Shutdown hub
	hub.Shutdown()

	// Brief wait for cleanup
	time.Sleep(100 * time.Millisecond)
}

func TestIntegrationWithRealStores(t *testing.T) {
	// This test requires MongoDB and Redis to be running
	cfg, err := config.LoadConfig()
	if err != nil {
		t.Skip("Config not available")
	}

	ctx := context.Background()

	// Try to connect to MongoDB
	mongoStore, err := mongodb.NewMongoEventStore(ctx, cfg.MongoURI, cfg.MongoDB+"_test")
	if err != nil {
		t.Skipf("MongoDB not available: %v", err)
	}
	defer mongoStore.Close(ctx)

	// Try to connect to Redis
	redisPublisher, err := redis.NewRedisEventPublisher(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		t.Skipf("Redis not available: %v", err)
	}
	defer redisPublisher.Close()

	// Create hub with real stores
	hub := NewHub(cfg, mongoStore, redisPublisher)
	go hub.Run()
	defer hub.Shutdown()

	gameID := "integration-test-game"
	if err := hub.CreateGame(gameID, 2, 99999); err != nil {
		t.Fatalf("Failed to create game: %v", err)
	}

	// Execute some actions
	req := PlayCardRequest{
		PlayerID:  1,
		CardIndex: 0,
	}

	resp := hub.HandlePlayCard(ctx, gameID, req)
	if !resp.Success {
		t.Errorf("PlayCard failed: %s", resp.Error)
	}

	// Verify events were stored
	events, err := mongoStore.GetEvents(ctx, gameID, 0)
	if err != nil {
		t.Fatalf("Failed to get events: %v", err)
	}

	if len(events) < 2 { // GameCreated + PlayCardRequested at minimum
		t.Errorf("Expected at least 2 events, got %d", len(events))
	}

	// Verify events can be retrieved and replayed
	latestID, err := mongoStore.GetLatestEventID(ctx, gameID)
	if err != nil {
		t.Fatalf("Failed to get latest event ID: %v", err)
	}

	if latestID <= 0 {
		t.Error("Expected positive latest event ID")
	}
}

func TestMessageSerialization(t *testing.T) {
	msg := ServerMessage{
		Type: "gameState",
		Data: map[string]interface{}{
			"currentTurn": 0,
			"round":       1,
			"gameOver":    false,
		},
		EventID: 123,
		Error:   "",
	}

	data, err := json.Marshal(msg)
	if err != nil {
		t.Fatalf("Failed to marshal message: %v", err)
	}

	var decoded ServerMessage
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal message: %v", err)
	}

	if decoded.Type != msg.Type {
		t.Errorf("Type mismatch: %s != %s", decoded.Type, msg.Type)
	}

	if decoded.EventID != msg.EventID {
		t.Errorf("EventID mismatch: %d != %d", decoded.EventID, msg.EventID)
	}
}
