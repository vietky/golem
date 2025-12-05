package eventstore

import (
	"time"

	"golem_century/internal/game"
)

// Event represents a game event in the event stream
type Event struct {
	ID          string          `bson:"_id,omitempty" json:"id"`
	GameID      string          `bson:"game_id" json:"gameId"`
	PlayerID    int             `bson:"player_id" json:"playerId"`
	Action      game.Action     `bson:"action" json:"action"`
	GameState   *game.GameState `bson:"game_state" json:"gameState"`
	Timestamp   time.Time       `bson:"timestamp" json:"timestamp"`
	SequenceNum int64           `bson:"sequence_num" json:"sequenceNum"`
}

// GameStateSnapshot represents the latest game state
type GameStateSnapshot struct {
	ID          string          `bson:"_id,omitempty" json:"id"`
	GameID      string          `bson:"game_id" json:"gameId"`
	GameState   *game.GameState `bson:"game_state" json:"gameState"`
	LastEvent   string          `bson:"last_event" json:"lastEvent"`
	SequenceNum int64           `bson:"sequence_num" json:"sequenceNum"`
	UpdatedAt   time.Time       `bson:"updated_at" json:"updatedAt"`
}

// EventStoreConfig represents configuration for event store
type EventStoreConfig struct {
	MongoURI      string
	Database      string
	EventsColl    string
	SnapshotsColl string
}

// StoreEventRequest represents a request to store an event
type StoreEventRequest struct {
	GameID    string
	PlayerID  int
	Action    game.Action
	GameState *game.GameState
}

// StoreEventResponse represents a response from storing an event
type StoreEventResponse struct {
	EventID     string
	SequenceNum int64
	Error       error
}

// GetEventsRequest represents a request to get events
type GetEventsRequest struct {
	GameID       string
	FromSequence int64
	Limit        int
}

// GetEventsResponse represents a response with events
type GetEventsResponse struct {
	Events []Event
	Error  error
}

// GetSnapshotRequest represents a request to get a game state snapshot
type GetSnapshotRequest struct {
	GameID string
}

// GetSnapshotResponse represents a response with a game state snapshot
type GetSnapshotResponse struct {
	Snapshot *GameStateSnapshot
	Error    error
}
