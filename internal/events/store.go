package events

import (
	"context"
	"time"
)

// EventStore defines the interface for event persistence
type EventStore interface {
	// AppendEvent appends a new event to the store (returns assigned event ID)
	AppendEvent(ctx context.Context, event *Event) (int64, error)

	// GetEvents retrieves events for a game, optionally starting from a specific event ID
	GetEvents(ctx context.Context, gameID string, fromEventID int64) ([]*Event, error)

	// GetEventsByTimeRange retrieves events for a game within a time range
	GetEventsByTimeRange(ctx context.Context, gameID string, from, to time.Time) ([]*Event, error)

	// GetLatestEventID gets the latest event ID for a game
	GetLatestEventID(ctx context.Context, gameID string) (int64, error)

	// EventExists checks if an event with the given ID already exists (for idempotency)
	EventExists(ctx context.Context, gameID string, eventID int64) (bool, error)

	// Close closes the event store connection
	Close(ctx context.Context) error
}

// EventPublisher defines the interface for publishing events to subscribers
type EventPublisher interface {
	// Publish publishes an event to all subscribers
	Publish(ctx context.Context, gameID string, event *Event) error

	// Subscribe subscribes to events for a specific game
	Subscribe(ctx context.Context, gameID string) (<-chan *Event, error)

	// Unsubscribe unsubscribes from events for a specific game
	Unsubscribe(ctx context.Context, gameID string, ch <-chan *Event) error

	// Close closes the publisher connection
	Close() error
}

// EventProcessor defines the interface for processing events
type EventProcessor interface {
	// ProcessEvent processes a single event and updates projections
	ProcessEvent(ctx context.Context, event *Event) error

	// ReplayEvents replays events to rebuild projections
	ReplayEvents(ctx context.Context, gameID string, fromEventID int64) error
}
