package server

import (
	"context"
	"net/http"
	"sync"
	"time"

	"golem_century/internal/config"
	"golem_century/internal/eventstore"
	"golem_century/internal/logger"
	"golem_century/internal/session"
	"golem_century/internal/telegram"
	"golem_century/internal/training"

	"github.com/go-redis/redis/v8"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for local play
	},
}

// GameServer manages multiple game sessions
type GameServer struct {
	SessionsV2       map[string]*session.GameSession
	EventStore       eventstore.EventStore
	TrainingLogger   training.TrainingLogger
	Logger           *logger.Logger
	TelegramNotifier *telegram.Notifier
	RedisClient      *redis.Client
	mu               sync.RWMutex
	config           *config.Config
}

// NewGameServerRequest represents request to create a new game server
type NewGameServerRequest struct {
	EventStore eventstore.EventStore
	Logger     *logger.Logger
	Config     *config.Config
}

// NewGameServer creates a new game server
func NewGameServer(req NewGameServerRequest) *GameServer {
	log := req.Logger
	if log == nil {
		log = logger.NewNopLogger()
	}
	if req.Config == nil {
		cfg := config.LoadConfig()
		req.Config = &cfg
	}
	telegramNotifier := telegram.NewNotifier(req.Config.TelegramBotToken, req.Config.TelegramChatID, log)

	var redisClient *redis.Client
	if req.Config.RedisAddr != "" {
		redisClient = redis.NewClient(&redis.Options{
			Addr: req.Config.RedisAddr,
		})
	}

	var trainingLogger training.TrainingLogger
	if redisClient != nil {
		trainingLogger = training.NewRedisTrainingLogger(redisClient, "training:moves", log.Logger)
	}

	return &GameServer{
		SessionsV2:       make(map[string]*session.GameSession),
		EventStore:       req.EventStore,
		TrainingLogger:   trainingLogger,
		Logger:           log,
		TelegramNotifier: telegramNotifier,
		RedisClient:      redisClient,
		config:           req.Config,
	}
}

func (gs *GameServer) CreateSessionV2(sessionID string, maxPlayers int, turnTimeoutInSeconds int) *session.GameSession {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	session := session.NewGameSession(sessionID, maxPlayers, turnTimeoutInSeconds, gs.EventStore, gs.TrainingLogger, gs.Logger)
	gs.SessionsV2[sessionID] = session

	gs.Logger.Info("Session V2 created",
		zap.String("sessionID", sessionID),
		zap.Int("maxPlayers", maxPlayers),
		zap.Int("turnTimeoutInSeconds", turnTimeoutInSeconds),
	)

	// Register session in Redis for multi-instance routing
	if gs.RedisClient != nil {
		instanceHost := gs.config.ServerHost + ":" + gs.config.ServerPort
		err := gs.RedisClient.Set(context.Background(), "session:"+sessionID, instanceHost, 72*time.Hour).Err()
		if err != nil {
			gs.Logger.Error("Failed to register session in Redis", zap.Error(err))
		}
	}

	// Start cleanup timer for empty rooms
	go gs.startCleanupTimerV2(sessionID)

	return session
}

// startCleanupTimerV2 starts a timer to clean up empty rooms after 5 minutes
func (gs *GameServer) startCleanupTimerV2(sessionID string) {
	ticker := time.NewTicker(30 * time.Second) // Check every 30 seconds
	defer ticker.Stop()

	for range ticker.C {
		session, exists := gs.GetSessionV2(sessionID)
		if !exists {
			return // Session already deleted
		}

		if session.CanBeDeleted() {
			gs.mu.Lock()
			delete(gs.SessionsV2, sessionID)
			gs.mu.Unlock()

			// Remove from Redis
			if gs.RedisClient != nil {
				gs.RedisClient.Del(context.Background(), "session:"+sessionID)
			}
			return
		}
	}
}

func (gs *GameServer) GetSessionV2(sessionID string) (*session.GameSession, bool) {
	gs.mu.RLock()
	defer gs.mu.RUnlock()
	session, ok := gs.SessionsV2[sessionID]
	return session, ok
}

func (gs *GameServer) checkSessionExists(sessionID string) bool {
	gs.mu.RLock()
	defer gs.mu.RUnlock()
	if _, ok := gs.SessionsV2[sessionID]; ok {
		return true
	}
	return false
}

// Shutdown gracefully shuts down the game server, closing all sessions and connections
func (gs *GameServer) Shutdown() error {
	gs.Logger.Info("Starting graceful shutdown of game server")

	gs.mu.Lock()
	defer gs.mu.Unlock()

	// Close all V2 sessions
	for sessionID, session := range gs.SessionsV2 {
		gs.Logger.Info("Closing V2 session", zap.String("sessionID", sessionID))
		if err := session.Close(); err != nil {
			gs.Logger.Error("Error closing V2 session",
				zap.String("sessionID", sessionID),
				zap.Error(err),
			)
		}
	}

	// Clear session map
	gs.SessionsV2 = make(map[string]*session.GameSession)

	gs.Logger.Info("Game server shutdown complete")
	return nil
}
