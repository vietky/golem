package events

import (
	"time"
)

// EventType represents the type of domain event
type EventType string

const (
	// Client → Server events
	EventPlayCardRequested EventType = "PlayCardRequested"
	EventAcquireRequested  EventType = "AcquireRequested"
	EventRestRequested     EventType = "RestRequested"
	EventClaimRequested    EventType = "ClaimRequested"
	EventEndTurnRequested  EventType = "EndTurnRequested"

	// Server internal events
	EventCardPlayed     EventType = "CardPlayed"
	EventItemAcquired   EventType = "ItemAcquired"
	EventPlayerRested   EventType = "PlayerRested"
	EventClaimCompleted EventType = "ClaimCompleted"
	EventTurnEnded      EventType = "TurnEnded"

	// Server → Client events
	EventGameStateUpdated EventType = "GameStateUpdated"
	
	// Session events
	EventGameCreated      EventType = "GameCreated"
	EventPlayerJoined     EventType = "PlayerJoined"
	EventPlayerLeft       EventType = "PlayerLeft"
)

// Event represents a domain event in the event-sourced system
type Event struct {
	ID        int64                  `json:"id" bson:"eventId"`                  // Event sequence within game
	GameID    string                 `json:"gameId" bson:"gameId"`
	EventType EventType              `json:"eventType" bson:"eventType"`
	PlayerID  int                    `json:"playerId" bson:"playerId"`
	Timestamp time.Time              `json:"timestamp" bson:"timestamp"`
	Data      map[string]interface{} `json:"data" bson:"data"`
	Version   int                    `json:"version" bson:"version"` // For optimistic concurrency
}

// PlayCardRequestedData contains data for PlayCardRequested event
type PlayCardRequestedData struct {
	CardIndex  int `json:"cardIndex"`
	Multiplier int `json:"multiplier,omitempty"`
}

// AcquireRequestedData contains data for AcquireRequested event
type AcquireRequestedData struct {
	CardIndex int `json:"cardIndex"`
}

// ClaimRequestedData contains data for ClaimRequested event
type ClaimRequestedData struct {
	CardIndex int `json:"cardIndex"`
}

// CardPlayedData contains data for CardPlayed event
type CardPlayedData struct {
	CardIndex      int                    `json:"cardIndex"`
	CardType       string                 `json:"cardType"`
	ResourcesDelta map[string]int         `json:"resourcesDelta,omitempty"`
	ResultState    map[string]interface{} `json:"resultState,omitempty"`
}

// ItemAcquiredData contains data for ItemAcquired event
type ItemAcquiredData struct {
	CardIndex      int                    `json:"cardIndex"`
	CardType       string                 `json:"cardType"`
	CrystalsCost   map[string]int         `json:"crystalsCost,omitempty"`
	CrystalsGained map[string]int         `json:"crystalsGained,omitempty"`
}

// ClaimCompletedData contains data for ClaimCompleted event
type ClaimCompletedData struct {
	CardIndex    int            `json:"cardIndex"`
	PointsGained int            `json:"pointsGained"`
	CrystalsCost map[string]int `json:"crystalsCost"`
	TokenGained  string         `json:"tokenGained,omitempty"`
}

// TurnEndedData contains data for TurnEnded event
type TurnEndedData struct {
	PreviousPlayer int  `json:"previousPlayer"`
	NextPlayer     int  `json:"nextPlayer"`
	Round          int  `json:"round"`
	LastRound      bool `json:"lastRound,omitempty"`
	GameOver       bool `json:"gameOver,omitempty"`
}

// GameStateUpdatedData contains the full game state snapshot
type GameStateUpdatedData struct {
	Players     interface{} `json:"players"`
	Market      interface{} `json:"market"`
	CurrentTurn int         `json:"currentTurn"`
	Round       int         `json:"round"`
	GameOver    bool        `json:"gameOver"`
	LastRound   bool        `json:"lastRound"`
}

// GameCreatedData contains data for GameCreated event
type GameCreatedData struct {
	NumPlayers int   `json:"numPlayers"`
	Seed       int64 `json:"seed"`
}

// PlayerJoinedData contains data for PlayerJoined event
type PlayerJoinedData struct {
	PlayerID   int    `json:"playerId"`
	PlayerName string `json:"playerName"`
	Avatar     string `json:"avatar,omitempty"`
}
