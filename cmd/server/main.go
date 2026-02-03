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

	"golem_century/internal/auth"
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

	// Initialize Firebase authentication if configured
	var firebaseAuth *auth.FirebaseAuth
	if cfg.FirebaseCredentialsFile != "" && cfg.GoogleOAuthClientID != "" {
		sessionStore, err := auth.NewRedisSessionStore(cfg.RedisAddr, cfg.RedisDB)
		if err != nil {
			log.Warn("Failed to initialize Redis session store - auth disabled",
				zap.Error(err))
		} else {
			firebaseAuth, err = auth.NewFirebaseAuth(auth.FirebaseAuthConfig{
				CredentialsFile: cfg.FirebaseCredentialsFile,
				OAuthClientID:   cfg.GoogleOAuthClientID,
				OAuthSecret:     cfg.GoogleOAuthClientSecret,
				RedirectURL:     cfg.GoogleOAuthRedirectURL,
				SessionStore:    sessionStore,
				Logger:          log,
				Domain:          cfg.SessionCookieDomain,
			})
			if err != nil {
				log.Warn("Failed to initialize Firebase auth - auth disabled",
					zap.Error(err))
				firebaseAuth = nil
			} else {
				log.Info("Firebase authentication initialized successfully")
			}
		}
	} else {
		log.Info("Firebase authentication not configured - running without auth")
	}

	// Create game server with event store and auth
	gameServer := server.NewGameServer(server.NewGameServerRequest{
		EventStore:   store,
		Logger:       log,
		Config:       &cfg,
		FirebaseAuth: firebaseAuth,
	})

	// Setup routes on a ServeMux so we can wrap with CORS middleware
	mux := http.NewServeMux()

	// Health check endpoint for k8s probes (must be at root level)
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Get API prefix from environment (default to empty for backward compatibility)
	apiPrefix := os.Getenv("API_PREFIX")
	if apiPrefix == "" {
		apiPrefix = "" // No prefix by default
	} else if apiPrefix[0] != '/' {
		apiPrefix = "/" + apiPrefix
	}

	// Helper to add prefix to paths
	prefixPath := func(path string) string {
		if apiPrefix == "" {
			return path
		}
		return apiPrefix + path
	}

	// Authentication endpoints (no auth middleware required)
	if firebaseAuth != nil {
		mux.HandleFunc(prefixPath("/auth/google"), firebaseAuth.HandleGoogleLogin)
		mux.HandleFunc(prefixPath("/auth/google/callback"), firebaseAuth.HandleGoogleCallback)
		mux.HandleFunc(prefixPath("/auth/logout"), firebaseAuth.HandleLogout)

		// Profile endpoints (require auth)
		mux.Handle(prefixPath("/auth/profile"), firebaseAuth.AuthMiddleware(http.HandlerFunc(firebaseAuth.HandleProfile)))
		mux.Handle(prefixPath("/auth/profile/update"), firebaseAuth.AuthMiddleware(http.HandlerFunc(firebaseAuth.HandleUpdateProfile)))

		log.Info("Authentication endpoints registered")
	}

	// WebSocket endpoint - uses optional auth middleware (required for players, not for spectators)
	if firebaseAuth != nil {
		mux.Handle(prefixPath("/ws"), firebaseAuth.OptionalAuthMiddleware(http.HandlerFunc(gameServer.HandleWebSocket)))
	} else {
		mux.HandleFunc(prefixPath("/ws"), gameServer.HandleWebSocket)
	}

	// Game creation/joining endpoints - require auth if Firebase is configured
	if firebaseAuth != nil {
		mux.Handle(prefixPath("/api/create"), firebaseAuth.AuthMiddleware(http.HandlerFunc(gameServer.HandleCreateSession)))
		mux.Handle(prefixPath("/api/single"), firebaseAuth.AuthMiddleware(http.HandlerFunc(gameServer.HandleCreateSinglePlayer)))
		mux.Handle(prefixPath("/api/join"), firebaseAuth.AuthMiddleware(http.HandlerFunc(gameServer.HandleJoinSession)))
	} else {
		mux.HandleFunc(prefixPath("/api/create"), gameServer.HandleCreateSession)
		mux.HandleFunc(prefixPath("/api/single"), gameServer.HandleCreateSinglePlayer)
		mux.HandleFunc(prefixPath("/api/join"), gameServer.HandleJoinSession)
	}

	// Public endpoints (no auth required)
	mux.HandleFunc(prefixPath("/api/list"), gameServer.HandleListSessions)
	mux.HandleFunc(prefixPath("/api/sessions/start"), gameServer.HandleStartGame)

	// Admin API endpoints for event store
	mux.HandleFunc(prefixPath("/api/events"), gameServer.HandleGetEvents)
	mux.HandleFunc(prefixPath("/api/snapshot"), gameServer.HandleGetSnapshot)
	mux.HandleFunc(prefixPath("/api/games"), gameServer.HandleListGames)
	mux.HandleFunc(prefixPath("/admin/sessions/state"), gameServer.HandleGetSessionState)

	// Always serve images from static directory (both React and vanilla JS need this)
	staticDir := filepath.Join(".", "web", "static")
	imagesDir := filepath.Join(staticDir, "images")
	if _, err := os.Stat(imagesDir); err == nil {
		mux.Handle("/assets/images/", http.StripPrefix("/assets/images/", http.FileServer(http.Dir(imagesDir))))
		log.Info("Serving images from ./web/assets/images")
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
