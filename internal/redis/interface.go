package redis

import (
	"context"
	"time"
)

// RedisClient defines the interface for Redis operations
type RedisClient interface {
	// Streams operations
	StreamsService
	// Pub/Sub operations
	PubSubService
	// Connection operations
	Ping(ctx context.Context) error
	Close() error
}

// StreamsService defines Redis Streams operations for event sourcing
type StreamsService interface {
	// AddToStream adds an event to a Redis stream
	AddToStream(ctx context.Context, stream string, values map[string]interface{}) (string, error)
	// ReadStream reads events from a stream starting from a specific ID
	ReadStream(ctx context.Context, stream string, startID string, count int64) ([]StreamMessage, error)
	// ReadStreamGroup reads events from a stream as part of a consumer group
	ReadStreamGroup(ctx context.Context, group, consumer, stream, startID string, count int64) ([]StreamMessage, error)
	// CreateGroup creates a consumer group for a stream
	CreateGroup(ctx context.Context, stream, group, startID string) error
	// AckMessage acknowledges processing of a message in a consumer group
	AckMessage(ctx context.Context, stream, group string, messageIDs ...string) error
	// TrimStream trims a stream to a maximum length
	TrimStream(ctx context.Context, stream string, maxLen int64) error
}

// PubSubService defines Redis Pub/Sub operations for real-time notifications
type PubSubService interface {
	// Publish publishes a message to a channel
	Publish(ctx context.Context, channel string, message interface{}) error
	// Subscribe subscribes to one or more channels
	Subscribe(ctx context.Context, handler MessageHandler, channels ...string) error
	// Unsubscribe unsubscribes from channels
	Unsubscribe(ctx context.Context, channels ...string) error
}

// StreamMessage represents a message from a Redis stream
type StreamMessage struct {
	ID     string
	Values map[string]interface{}
}

// MessageHandler is a callback function for handling Pub/Sub messages
type MessageHandler func(channel string, message []byte) error

// EventStore defines the interface for storing and retrieving game events
type EventStore interface {
	// StoreEvent stores a game event in the event stream
	StoreEvent(ctx context.Context, sessionID string, event *GameEvent) error
	// GetEvents retrieves all events for a game session
	GetEvents(ctx context.Context, sessionID string, afterID string) ([]*GameEvent, error)
	// GetEventsSince retrieves events since a specific timestamp
	GetEventsSince(ctx context.Context, sessionID string, since time.Time) ([]*GameEvent, error)
	// ReplayEvents replays all events to reconstruct game state
	ReplayEvents(ctx context.Context, sessionID string) ([]*GameEvent, error)
}

// GameEvent represents a game event for event sourcing
type GameEvent struct {
	ID          string                 `json:"id"`
	SessionID   string                 `json:"sessionId"`
	PlayerID    int                    `json:"playerId"`
	EventType   string                 `json:"eventType"`
	Timestamp   time.Time              `json:"timestamp"`
	Data        map[string]interface{} `json:"data"`
	SequenceNum int64                  `json:"sequenceNum"`
}

// NotificationService defines the interface for real-time notifications
type NotificationService interface {
	// NotifyStateChange notifies all clients about a state change
	NotifyStateChange(ctx context.Context, sessionID string, state map[string]interface{}) error
	// NotifyPlayerAction notifies all clients about a player action
	NotifyPlayerAction(ctx context.Context, sessionID string, playerID int, action string) error
	// NotifyPlayerReconnect notifies that a player has reconnected
	NotifyPlayerReconnect(ctx context.Context, sessionID string, playerID int) error
	// SubscribeToSession subscribes to notifications for a specific session
	SubscribeToSession(ctx context.Context, sessionID string, handler MessageHandler) error
}
