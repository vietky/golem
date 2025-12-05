package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"golem_century/internal/config"
	"golem_century/internal/eventstore"
	"golem_century/internal/logger"
	"golem_century/internal/server"

	"go.uber.org/zap"
)

func main() {
	port := flag.Int("port", 8080, "Port to run the server on")
	flag.Parse()

	// Initialize logger
	log, err := logger.NewLogger(true) // true for development mode
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize logger: %v", err))
	}
	defer log.Sync()

	// Load configuration
	cfg := config.LoadConfig()

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
	})

	// Setup routes
	http.HandleFunc("/ws", gameServer.HandleWebSocket)
	http.HandleFunc("/api/create", gameServer.HandleCreateSession)
	http.HandleFunc("/api/single", gameServer.HandleCreateSinglePlayer)
	http.HandleFunc("/api/join", gameServer.HandleJoinSession)
	http.HandleFunc("/api/list", gameServer.HandleListSessions)

	// Admin API endpoints for event store
	http.HandleFunc("/api/events", gameServer.HandleGetEvents)
	http.HandleFunc("/api/snapshot", gameServer.HandleGetSnapshot)
	http.HandleFunc("/api/games", gameServer.HandleListGames)

	// Always serve images from static directory (both React and vanilla JS need this)
	staticDir := filepath.Join(".", "web", "static")
	imagesDir := filepath.Join(staticDir, "images")
	if _, err := os.Stat(imagesDir); err == nil {
		http.Handle("/images/", http.StripPrefix("/images/", http.FileServer(http.Dir(imagesDir))))
		log.Info("Serving images from ./web/static/images")
	}

	// Serve static files - try React build first, fallback to vanilla JS
	reactDir := filepath.Join(".", "web", "react")
	reactIndexPath := filepath.Join(reactDir, "index.html")

	// Check if React build exists and has content (index.html exists), otherwise serve vanilla JS
	if _, err := os.Stat(reactIndexPath); err == nil {
		// Serve React build
		http.Handle("/", http.FileServer(http.Dir("./web/react")))
		log.Info("Serving React frontend from ./web/react")
	} else {
		// Fallback to vanilla JS
		if _, err := os.Stat(staticDir); os.IsNotExist(err) {
			os.MkdirAll(staticDir, 0755)
		}
		http.Handle("/", http.FileServer(http.Dir("./web/static")))
		log.Info("Serving vanilla JS frontend from ./web/static")
	}

	addr := fmt.Sprintf(":%d", *port)
	log.Info("Century: Golem Edition - Web Server")
	log.Info("Server starting", zap.String("url", fmt.Sprintf("http://localhost%s", addr)))

	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal("Server failed to start", zap.Error(err))
	}
}
