package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

// postgresDB implements Database interface
type postgresDB struct {
	db         *sql.DB
	gameRepo   GameRepository
	playerRepo PlayerRepository
}

// NewPostgresDB creates a new PostgreSQL database connection
func NewPostgresDB(host string, port int, user, password, dbname, sslmode string, maxConns, maxIdleConns int, maxLifetime time.Duration) (Database, error) {
	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(maxConns)
	db.SetMaxIdleConns(maxIdleConns)
	db.SetConnMaxLifetime(maxLifetime)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	pgDB := &postgresDB{db: db}
	pgDB.gameRepo = &gameRepository{db: db}
	pgDB.playerRepo = &playerRepository{db: db}

	return pgDB, nil
}

// Ping checks if the database connection is alive
func (p *postgresDB) Ping(ctx context.Context) error {
	return p.db.PingContext(ctx)
}

// Close closes the database connection
func (p *postgresDB) Close() error {
	return p.db.Close()
}

// GameRepository returns the game repository
func (p *postgresDB) GameRepository() GameRepository {
	return p.gameRepo
}

// PlayerRepository returns the player repository
func (p *postgresDB) PlayerRepository() PlayerRepository {
	return p.playerRepo
}

// gameRepository implements GameRepository interface
type gameRepository struct {
	db *sql.DB
}

// CreateSession creates a new game session
func (r *gameRepository) CreateSession(ctx context.Context, session *GameSession) error {
	query := `
		INSERT INTO game_sessions (id, num_players, seed, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.ExecContext(ctx, query,
		session.ID, session.NumPlayers, session.Seed, session.Status,
		session.CreatedAt, session.UpdatedAt)

	return err
}

// GetSession retrieves a game session by ID
func (r *gameRepository) GetSession(ctx context.Context, sessionID string) (*GameSession, error) {
	query := `
		SELECT id, num_players, seed, status, created_at, updated_at, completed_at, winner_id, game_state
		FROM game_sessions
		WHERE id = $1
	`

	session := &GameSession{}
	var gameStateJSON []byte

	err := r.db.QueryRowContext(ctx, query, sessionID).Scan(
		&session.ID, &session.NumPlayers, &session.Seed, &session.Status,
		&session.CreatedAt, &session.UpdatedAt, &session.CompletedAt,
		&session.WinnerID, &gameStateJSON)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("session not found")
	}
	if err != nil {
		return nil, err
	}

	if len(gameStateJSON) > 0 {
		if err := json.Unmarshal(gameStateJSON, &session.GameState); err != nil {
			return nil, fmt.Errorf("failed to unmarshal game state: %w", err)
		}
	}

	return session, nil
}

// UpdateSession updates a game session
func (r *gameRepository) UpdateSession(ctx context.Context, session *GameSession) error {
	var gameStateJSON []byte
	var err error

	if session.GameState != nil {
		gameStateJSON, err = json.Marshal(session.GameState)
		if err != nil {
			return fmt.Errorf("failed to marshal game state: %w", err)
		}
	}

	query := `
		UPDATE game_sessions
		SET num_players = $2, seed = $3, status = $4, updated_at = $5,
		    completed_at = $6, winner_id = $7, game_state = $8
		WHERE id = $1
	`

	_, err = r.db.ExecContext(ctx, query,
		session.ID, session.NumPlayers, session.Seed, session.Status,
		session.UpdatedAt, session.CompletedAt, session.WinnerID, gameStateJSON)

	return err
}

// DeleteSession deletes a game session
func (r *gameRepository) DeleteSession(ctx context.Context, sessionID string) error {
	query := `DELETE FROM game_sessions WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, sessionID)
	return err
}

// ListActiveSessions lists all active game sessions
func (r *gameRepository) ListActiveSessions(ctx context.Context) ([]*GameSession, error) {
	query := `
		SELECT id, num_players, seed, status, created_at, updated_at, completed_at, winner_id
		FROM game_sessions
		WHERE status = 'active'
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sessions := make([]*GameSession, 0)
	for rows.Next() {
		session := &GameSession{}
		err := rows.Scan(
			&session.ID, &session.NumPlayers, &session.Seed, &session.Status,
			&session.CreatedAt, &session.UpdatedAt, &session.CompletedAt, &session.WinnerID)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}

	return sessions, rows.Err()
}

// SaveGameState saves the current game state
func (r *gameRepository) SaveGameState(ctx context.Context, sessionID string, state map[string]interface{}) error {
	stateJSON, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("failed to marshal game state: %w", err)
	}

	query := `
		UPDATE game_sessions
		SET game_state = $2, updated_at = $3
		WHERE id = $1
	`

	_, err = r.db.ExecContext(ctx, query, sessionID, stateJSON, time.Now())
	return err
}

// GetGameState retrieves the last saved game state
func (r *gameRepository) GetGameState(ctx context.Context, sessionID string) (map[string]interface{}, error) {
	query := `SELECT game_state FROM game_sessions WHERE id = $1`

	var gameStateJSON []byte
	err := r.db.QueryRowContext(ctx, query, sessionID).Scan(&gameStateJSON)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("session not found")
	}
	if err != nil {
		return nil, err
	}

	if len(gameStateJSON) == 0 {
		return nil, nil
	}

	var state map[string]interface{}
	if err := json.Unmarshal(gameStateJSON, &state); err != nil {
		return nil, fmt.Errorf("failed to unmarshal game state: %w", err)
	}

	return state, nil
}

// playerRepository implements PlayerRepository interface
type playerRepository struct {
	db *sql.DB
}

// CreatePlayer creates a new player record
func (r *playerRepository) CreatePlayer(ctx context.Context, player *Player) error {
	query := `
		INSERT INTO players (id, name, avatar, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.db.ExecContext(ctx, query,
		player.ID, player.Name, player.Avatar,
		player.CreatedAt, player.UpdatedAt)

	return err
}

// GetPlayer retrieves a player by ID
func (r *playerRepository) GetPlayer(ctx context.Context, playerID int) (*Player, error) {
	query := `
		SELECT id, name, avatar, created_at, updated_at
		FROM players
		WHERE id = $1
	`

	player := &Player{}
	err := r.db.QueryRowContext(ctx, query, playerID).Scan(
		&player.ID, &player.Name, &player.Avatar,
		&player.CreatedAt, &player.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("player not found")
	}
	if err != nil {
		return nil, err
	}

	return player, nil
}

// UpdatePlayer updates a player record
func (r *playerRepository) UpdatePlayer(ctx context.Context, player *Player) error {
	query := `
		UPDATE players
		SET name = $2, avatar = $3, updated_at = $4
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query,
		player.ID, player.Name, player.Avatar, player.UpdatedAt)

	return err
}

// GetPlayerStats retrieves player statistics
func (r *playerRepository) GetPlayerStats(ctx context.Context, playerID int) (*PlayerStats, error) {
	query := `
		SELECT player_id, games_played, games_won, total_points, average_points, last_played
		FROM player_stats
		WHERE player_id = $1
	`

	stats := &PlayerStats{}
	err := r.db.QueryRowContext(ctx, query, playerID).Scan(
		&stats.PlayerID, &stats.GamesPlayed, &stats.GamesWon,
		&stats.TotalPoints, &stats.AveragePoints, &stats.LastPlayed)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("player stats not found")
	}
	if err != nil {
		return nil, err
	}

	return stats, nil
}

// SavePlayerStats saves player statistics
func (r *playerRepository) SavePlayerStats(ctx context.Context, stats *PlayerStats) error {
	query := `
		INSERT INTO player_stats (player_id, games_played, games_won, total_points, average_points, last_played)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (player_id)
		DO UPDATE SET
			games_played = $2,
			games_won = $3,
			total_points = $4,
			average_points = $5,
			last_played = $6
	`

	_, err := r.db.ExecContext(ctx, query,
		stats.PlayerID, stats.GamesPlayed, stats.GamesWon,
		stats.TotalPoints, stats.AveragePoints, stats.LastPlayed)

	return err
}
