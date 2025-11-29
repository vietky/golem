package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"
)

// eventStore implements EventStore interface
type eventStore struct {
	client RedisClient
}

// NewEventStore creates a new event store
func NewEventStore(client RedisClient) EventStore {
	return &eventStore{client: client}
}

// getStreamName returns the stream name for a session
func (es *eventStore) getStreamName(sessionID string) string {
	return fmt.Sprintf("game:events:%s", sessionID)
}

// StoreEvent stores a game event in the event stream
func (es *eventStore) StoreEvent(ctx context.Context, sessionID string, event *GameEvent) error {
	stream := es.getStreamName(sessionID)

	// Serialize event data
	dataJSON, err := json.Marshal(event.Data)
	if err != nil {
		return fmt.Errorf("failed to marshal event data: %w", err)
	}

	values := map[string]interface{}{
		"sessionId":   event.SessionID,
		"playerId":    event.PlayerID,
		"eventType":   event.EventType,
		"timestamp":   event.Timestamp.Unix(),
		"data":        string(dataJSON),
		"sequenceNum": event.SequenceNum,
	}

	id, err := es.client.AddToStream(ctx, stream, values)
	if err != nil {
		return fmt.Errorf("failed to add event to stream: %w", err)
	}

	event.ID = id
	return nil
}

// GetEvents retrieves all events for a game session
func (es *eventStore) GetEvents(ctx context.Context, sessionID string, afterID string) ([]*GameEvent, error) {
	stream := es.getStreamName(sessionID)

	messages, err := es.client.ReadStream(ctx, stream, afterID, 1000)
	if err != nil {
		return nil, fmt.Errorf("failed to read stream: %w", err)
	}

	return es.parseEvents(messages)
}

// GetEventsSince retrieves events since a specific timestamp
func (es *eventStore) GetEventsSince(ctx context.Context, sessionID string, since time.Time) ([]*GameEvent, error) {
	stream := es.getStreamName(sessionID)

	// Get all events and filter by timestamp
	messages, err := es.client.ReadStream(ctx, stream, "0", 10000)
	if err != nil {
		return nil, fmt.Errorf("failed to read stream: %w", err)
	}

	events, err := es.parseEvents(messages)
	if err != nil {
		return nil, err
	}

	// Filter by timestamp
	filtered := make([]*GameEvent, 0)
	for _, event := range events {
		if event.Timestamp.After(since) || event.Timestamp.Equal(since) {
			filtered = append(filtered, event)
		}
	}

	return filtered, nil
}

// ReplayEvents replays all events to reconstruct game state
func (es *eventStore) ReplayEvents(ctx context.Context, sessionID string) ([]*GameEvent, error) {
	return es.GetEvents(ctx, sessionID, "0")
}

// parseEvents converts stream messages to GameEvent objects
func (es *eventStore) parseEvents(messages []StreamMessage) ([]*GameEvent, error) {
	events := make([]*GameEvent, 0, len(messages))

	for _, msg := range messages {
		event := &GameEvent{
			ID: msg.ID,
		}

		// Parse sessionId
		if v, ok := msg.Values["sessionId"].(string); ok {
			event.SessionID = v
		}

		// Parse playerId
		if v, ok := msg.Values["playerId"].(string); ok {
			if playerID, err := strconv.Atoi(v); err == nil {
				event.PlayerID = playerID
			}
		}

		// Parse eventType
		if v, ok := msg.Values["eventType"].(string); ok {
			event.EventType = v
		}

		// Parse timestamp
		if v, ok := msg.Values["timestamp"].(string); ok {
			if ts, err := strconv.ParseInt(v, 10, 64); err == nil {
				event.Timestamp = time.Unix(ts, 0)
			}
		}

		// Parse data
		if v, ok := msg.Values["data"].(string); ok {
			var data map[string]interface{}
			if err := json.Unmarshal([]byte(v), &data); err == nil {
				event.Data = data
			}
		}

		// Parse sequenceNum
		if v, ok := msg.Values["sequenceNum"].(string); ok {
			if seq, err := strconv.ParseInt(v, 10, 64); err == nil {
				event.SequenceNum = seq
			}
		}

		events = append(events, event)
	}

	return events, nil
}
