package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"golem_century/internal/config"
	"golem_century/internal/events/mongodb"
	"golem_century/internal/events/redis"
	"golem_century/internal/logger"
	"golem_century/internal/websocket"

	"github.com/gorilla/mux"
	gorillaws "github.com/gorilla/websocket"
	"go.uber.org/zap"
)

var upgrader = gorillaws.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

func main() {
	// Initialize logger
	if err := logger.InitLogger(true); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	log := logger.GetLogger()

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal("Failed to load config", zap.Error(err))
	}

	log.Info("Starting Golem Century Game Server",
		zap.String("host", cfg.ServerHost),
		zap.Int("port", cfg.ServerPort))

	// Initialize MongoDB event store
	ctx := context.Background()
	eventStore, err := mongodb.NewMongoEventStore(ctx, cfg.MongoURI, cfg.MongoDB)
	if err != nil {
		log.Fatal("Failed to initialize MongoDB event store", zap.Error(err))
	}
	defer eventStore.Close(ctx)

	log.Info("Connected to MongoDB event store")

	// Initialize Redis event publisher
	eventPub, err := redis.NewRedisEventPublisher(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		log.Fatal("Failed to initialize Redis event publisher", zap.Error(err))
	}
	defer eventPub.Close()

	log.Info("Connected to Redis event publisher")

	// Create WebSocket hub
	hub := websocket.NewHub(cfg, eventStore, eventPub)
	go hub.Run()

	log.Info("WebSocket hub started")

	// Setup HTTP routes
	router := mux.NewRouter()

	// Health check endpoint
	router.HandleFunc("/health", healthHandler).Methods("GET")

	// Create game endpoint
	router.HandleFunc("/api/games", createGameHandler(hub, cfg)).Methods("POST")

	// Get game state endpoint
	router.HandleFunc("/api/games/{gameId}", getGameHandler(hub)).Methods("GET")

	// WebSocket endpoint
	router.HandleFunc("/ws", wsHandler(hub)).Methods("GET")

	// Serve static files
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./web/static")))

	// Setup server
	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.ServerHost, cfg.ServerPort),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Info("Server listening", zap.String("addr", server.Addr))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server error", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	hub.Shutdown()

	if err := server.Shutdown(ctx); err != nil {
		log.Error("Server shutdown error", zap.Error(err))
	}

	log.Info("Server stopped")
}

// healthHandler handles health check requests
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "ok",
		"time":   time.Now().Format(time.RFC3339),
	})
}

// createGameHandler handles game creation requests
func createGameHandler(hub *websocket.Hub, cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			GameID     string `json:"gameId"`
			NumPlayers int    `json:"numPlayers"`
			Seed       int64  `json:"seed,omitempty"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate
		if req.GameID == "" {
			http.Error(w, "gameId is required", http.StatusBadRequest)
			return
		}

		if req.NumPlayers < 2 || req.NumPlayers > cfg.MaxPlayers {
			http.Error(w, fmt.Sprintf("numPlayers must be between 2 and %d", cfg.MaxPlayers), http.StatusBadRequest)
			return
		}

		if req.Seed == 0 {
			req.Seed = time.Now().UnixNano()
		}

		// Create game
		if err := hub.CreateGame(req.GameID, req.NumPlayers, req.Seed); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"gameId":  req.GameID,
			"message": "Game created successfully",
		})
	}
}

// getGameHandler handles get game state requests
func getGameHandler(hub *websocket.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		gameID := vars["gameId"]

		gameState, exists := hub.GetGameState(gameID)
		if !exists {
			http.Error(w, "Game not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"gameId":  gameID,
			"state":   gameState,
		})
	}
}

// wsHandler handles WebSocket upgrade requests
func wsHandler(hub *websocket.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get query parameters
		gameID := r.URL.Query().Get("gameId")
		playerIDStr := r.URL.Query().Get("playerId")
		lastEventIDStr := r.URL.Query().Get("lastEventId")

		if gameID == "" {
			http.Error(w, "gameId is required", http.StatusBadRequest)
			return
		}

		// Check if game exists
		_, exists := hub.GetGameState(gameID)
		if !exists {
			http.Error(w, "Game not found", http.StatusNotFound)
			return
		}

		// Parse player ID
		playerID := 0
		if playerIDStr != "" {
			if pid, err := strconv.Atoi(playerIDStr); err == nil {
				playerID = pid
			}
		}

		// Parse last event ID (for reconnection)
		lastEventID := int64(0)
		if lastEventIDStr != "" {
			if eid, err := strconv.ParseInt(lastEventIDStr, 10, 64); err == nil {
				lastEventID = eid
			}
		}

		// Upgrade to WebSocket
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			logger.GetLogger().Error("WebSocket upgrade error", zap.Error(err))
			return
		}

		// Serve client
		hub.ServeClient(conn, gameID, playerID, lastEventID)
	}
}
