package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"golem_century/internal/config"
	"golem_century/internal/eventstore"
	"golem_century/internal/logger"
	"golem_century/internal/server"

	"go.uber.org/zap"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Initialize logger
	log, err := logger.NewLogger(true) // true for development mode
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize logger: %v", err))
	}
	defer log.Sync()

	// Initialize event store
	eventStoreConfig := eventstore.EventStoreConfig{
		MongoURI:      cfg.MongoURI,
		Database:      cfg.MongoDB,
		EventsColl:    cfg.MongoEventsColl,
		SnapshotsColl: cfg.MongoSnapshotsColl,
	}

	storeResp := eventstore.NewMongoEventStore(eventstore.NewMongoEventStoreRequest{
		Config: eventStoreConfig,
	})

	var store eventstore.EventStore
	if storeResp.Error != nil {
		log.Warn("Failed to initialize event store - continuing without event store",
			zap.Error(storeResp.Error))
		store = nil
	} else {
		store = storeResp.Store
		log.Info("Event store initialized successfully")
		defer store.Close()
	}

	// Create game server with event store
	gameServer := server.NewGameServer(server.NewGameServerRequest{
		EventStore: store,
		Logger:     log,
		Config:     &cfg,
	})

	// Setup routes on a ServeMux so we can wrap with CORS middleware
	mux := http.NewServeMux()

	// Health check endpoint for k8s probes
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	mux.HandleFunc("/ws", gameServer.HandleWebSocket)
	mux.HandleFunc("/api/create", gameServer.HandleCreateSession)
	mux.HandleFunc("/api/single", gameServer.HandleCreateSinglePlayer)
	mux.HandleFunc("/api/join", gameServer.HandleJoinSession)
	mux.HandleFunc("/api/list", gameServer.HandleListSessions)
	mux.HandleFunc("/api/sessions/start", gameServer.HandleStartGame)

	// Admin API endpoints for event store
	mux.HandleFunc("/api/events", gameServer.HandleGetEvents)
	mux.HandleFunc("/api/snapshot", gameServer.HandleGetSnapshot)
	mux.HandleFunc("/api/games", gameServer.HandleListGames)
	mux.HandleFunc("/admin/sessions/state", gameServer.HandleGetSessionState)

	// Always serve images from static directory (both React and vanilla JS need this)
	staticDir := filepath.Join(".", "web", "static")
	imagesDir := filepath.Join(staticDir, "images")
	if _, err := os.Stat(imagesDir); err == nil {
		mux.Handle("/static/images/", http.StripPrefix("/static/images/", http.FileServer(http.Dir(imagesDir))))
		log.Info("Serving images from ./web/static/images")
	} else {
		log.Error("Images directory does not exist or is inaccessible", zap.String("path", imagesDir), zap.Error(err))
	}

	// Serve static files - try React build first, fallback to vanilla JS
	reactDir := filepath.Join(".", "web", "react")
	reactIndexPath := filepath.Join(reactDir, "index.html")

	// Check if React build exists and has content (index.html exists), otherwise serve vanilla JS
	if _, err := os.Stat(reactIndexPath); err == nil {
		// Serve React build
		mux.Handle("/", http.FileServer(http.Dir("./web/react")))
		log.Info("Serving React frontend from ./web/react")
	} else {
		// Fallback to vanilla JS
		if _, err := os.Stat(staticDir); os.IsNotExist(err) {
			os.MkdirAll(staticDir, 0755)
		}
		mux.Handle("/", http.FileServer(http.Dir("./web/static")))
		log.Info("Serving vanilla JS frontend from ./web/static")
	}

	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	log.Info("Century: Golem Edition - Web Server")
	log.Info("Server starting", zap.String("url", fmt.Sprintf("http://localhost%s", addr)))

	// Wrap the mux with CORS middleware so both HTTP endpoints and websocket
	// upgrade requests receive the appropriate CORS headers.
	handler := server.WrapWithCORS(mux)

	// Create HTTP server
	httpServer := &http.Server{
		Addr:    addr,
		Handler: handler,
	}

	// Channel to listen for errors coming from the HTTP server
	serverErrors := make(chan error, 1)

	// Start the HTTP server in a goroutine
	go func() {
		log.Info("HTTP server starting")
		serverErrors <- httpServer.ListenAndServe()
	}()

	// Channel to listen for interrupt or terminate signals from the OS
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

	// Block until we receive a signal or the server errors out
	select {
	case err := <-serverErrors:
		log.Fatal("Server error", zap.Error(err))

	case sig := <-shutdown:
		log.Info("Shutdown signal received", zap.String("signal", sig.String()))

		// Give outstanding requests a deadline for completion
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// Gracefully shutdown the game server (close all WebSocket connections)
		log.Info("Shutting down game sessions...")
		if err := gameServer.Shutdown(); err != nil {
			log.Error("Error during game server shutdown", zap.Error(err))
		}

		// Gracefully shutdown the HTTP server
		log.Info("Shutting down HTTP server...")
		if err := httpServer.Shutdown(ctx); err != nil {
			log.Error("Error during HTTP server shutdown", zap.Error(err))
			// Force close if graceful shutdown fails
			httpServer.Close()
		}

		log.Info("Server shutdown complete")
	}
}
