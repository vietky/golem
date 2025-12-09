package eventstore

import "golem_century/internal/game"

// EventStore defines the interface for event storage operations
type EventStore interface {
	// StoreEvent stores a game event and returns the event ID and sequence number
	StoreEvent(req StoreEventRequest) StoreEventResponse

	// GetEvents retrieves events for a game starting from a sequence number
	GetEvents(req GetEventsRequest) GetEventsResponse

	// GetSnapshot retrieves the latest game state snapshot
	GetSnapshot(req GetSnapshotRequest) GetSnapshotResponse

	// UpdateSnapshot updates the latest game state snapshot
	UpdateSnapshot(gameID string, gameState *game.GameState, lastEventID string, sequenceNum int64) error

	// Close closes the event store connection
	Close() error
}
