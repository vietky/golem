package database

import (
	"context"
	"time"
)

// Database defines the interface for database operations
type Database interface {
	// Connection management
	Ping(ctx context.Context) error
	Close() error

	// Repository access
	GameRepository() GameRepository
	PlayerRepository() PlayerRepository
}

// GameRepository defines operations for game session persistence
type GameRepository interface {
	// CreateSession creates a new game session
	CreateSession(ctx context.Context, session *GameSession) error
	// GetSession retrieves a game session by ID
	GetSession(ctx context.Context, sessionID string) (*GameSession, error)
	// UpdateSession updates a game session
	UpdateSession(ctx context.Context, session *GameSession) error
	// DeleteSession deletes a game session
	DeleteSession(ctx context.Context, sessionID string) error
	// ListActiveSessions lists all active game sessions
	ListActiveSessions(ctx context.Context) ([]*GameSession, error)
	// SaveGameState saves the current game state
	SaveGameState(ctx context.Context, sessionID string, state map[string]interface{}) error
	// GetGameState retrieves the last saved game state
	GetGameState(ctx context.Context, sessionID string) (map[string]interface{}, error)
}

// PlayerRepository defines operations for player data persistence
type PlayerRepository interface {
	// CreatePlayer creates a new player record
	CreatePlayer(ctx context.Context, player *Player) error
	// GetPlayer retrieves a player by ID
	GetPlayer(ctx context.Context, playerID int) (*Player, error)
	// UpdatePlayer updates a player record
	UpdatePlayer(ctx context.Context, player *Player) error
	// GetPlayerStats retrieves player statistics
	GetPlayerStats(ctx context.Context, playerID int) (*PlayerStats, error)
	// SavePlayerStats saves player statistics
	SavePlayerStats(ctx context.Context, stats *PlayerStats) error
}

// GameSession represents a game session in the database
type GameSession struct {
	ID          string                 `json:"id"`
	NumPlayers  int                    `json:"numPlayers"`
	Seed        int64                  `json:"seed"`
	Status      string                 `json:"status"` // active, completed, abandoned
	CreatedAt   time.Time              `json:"createdAt"`
	UpdatedAt   time.Time              `json:"updatedAt"`
	CompletedAt *time.Time             `json:"completedAt,omitempty"`
	WinnerID    *int                   `json:"winnerId,omitempty"`
	GameState   map[string]interface{} `json:"gameState,omitempty"`
}

// Player represents a player in the database
type Player struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Avatar    string    `json:"avatar"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// PlayerStats represents player statistics
type PlayerStats struct {
	PlayerID      int       `json:"playerId"`
	GamesPlayed   int       `json:"gamesPlayed"`
	GamesWon      int       `json:"gamesWon"`
	TotalPoints   int       `json:"totalPoints"`
	AveragePoints float64   `json:"averagePoints"`
	LastPlayed    time.Time `json:"lastPlayed"`
}
