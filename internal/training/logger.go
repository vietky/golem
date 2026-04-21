package training

import (
	"context"
	"encoding/json"
	"time"

	"github.com/go-redis/redis/v8"
	"go.uber.org/zap"
	"golem_century/internal/game"
)

type TrainingLogger interface {
	LogMove(gameID string, playerID int, isAI bool, action game.Action, state *game.GameState) error
}

type RedisTrainingLogger struct {
	client *redis.Client
	stream string
	logger *zap.Logger
}

func NewRedisTrainingLogger(redisClient *redis.Client, streamName string, logger *zap.Logger) *RedisTrainingLogger {
	if streamName == "" {
		streamName = "training:moves"
	}
	return &RedisTrainingLogger{
		client: redisClient,
		stream: streamName,
		logger: logger,
	}
}

type MoveEvent struct {
	GameID    string          `json:"game_id"`
	PlayerID  int             `json:"player_id"`
	IsAI      bool            `json:"is_ai"`
	Action    game.Action     `json:"action"`
	GameState *game.GameState `json:"game_state"`
	Timestamp time.Time       `json:"timestamp"`
}

func (r *RedisTrainingLogger) LogMove(gameID string, playerID int, isAI bool, action game.Action, state *game.GameState) error {
	if r.client == nil {
		return nil // Nop if redis is not configured
	}

	event := MoveEvent{
		GameID:    gameID,
		PlayerID:  playerID,
		IsAI:      isAI,
		Action:    action,
		GameState: state,
		Timestamp: time.Now(),
	}

	data, err := json.Marshal(event)
	if err != nil {
		r.logger.Error("Failed to marshal move event", zap.Error(err))
		return err
	}

	err = r.client.XAdd(context.Background(), &redis.XAddArgs{
		Stream: r.stream,
		Values: map[string]interface{}{
			"data": data,
		},
	}).Err()

	if err != nil {
		r.logger.Error("Failed to log move to Redis stream", zap.Error(err))
		return err
	}

	return nil
}
