package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
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

	var store eventstore.EventStore
	if cfg.MongoURI != "" {
		eventStoreConfig := eventstore.EventStoreConfig{
			MongoURI:      cfg.MongoURI,
			Database:      cfg.MongoDB,
			EventsColl:    cfg.MongoEventsColl,
			SnapshotsColl: cfg.MongoSnapshotsColl,
		}
		storeResp := eventstore.NewMongoEventStore(eventstore.NewMongoEventStoreRequest{
			Config: eventStoreConfig,
		})
		if storeResp.Error != nil {
			log.Warn("Failed to initialize event store - continuing without event store",
				zap.Error(storeResp.Error))
			store = nil
		} else {
			store = storeResp.Store
			log.Info("Event store initialized successfully")
			defer store.Close()
		}
	} else {
		log.Info("MongoDB disabled (MONGO_URI unset); running without event store")
	}

	// Create game server with event store
	gameServer := server.NewGameServer(server.NewGameServerRequest{
		EventStore: store,
		Logger:     log,
		Config:     &cfg,
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

	mux.HandleFunc(prefixPath("/ws"), gameServer.HandleWebSocket)
	mux.HandleFunc(prefixPath("/api/create"), gameServer.HandleCreateSession)
	mux.HandleFunc(prefixPath("/api/single"), gameServer.HandleCreateSinglePlayer)
	mux.HandleFunc(prefixPath("/api/join"), gameServer.HandleJoinSession)
	mux.HandleFunc(prefixPath("/api/list"), gameServer.HandleListSessions)
	mux.HandleFunc(prefixPath("/api/sessions/start"), gameServer.HandleStartGame)

	// Admin API endpoints for event store
	mux.HandleFunc(prefixPath("/api/events"), gameServer.HandleGetEvents)
	mux.HandleFunc(prefixPath("/api/snapshot"), gameServer.HandleGetSnapshot)
	mux.HandleFunc(prefixPath("/api/games"), gameServer.HandleListGames)
	mux.HandleFunc(prefixPath("/admin/sessions/state"), gameServer.HandleGetSessionState)

	mountStaticFrontend(mux, log.Logger)

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

// detectViteBasePath reads dist/index.html (script src) to infer Vite base path, e.g. /apps/golem or /.
func detectViteBasePath(distDir string) string {
	data, err := os.ReadFile(filepath.Join(distDir, "index.html"))
	if err != nil {
		return "/apps/golem"
	}
	s := string(data)
	if idx := strings.Index(s, `src="/`); idx != -1 {
		rest := s[idx+len(`src="/`):]
		if j := strings.Index(rest, `/assets/`); j > 0 {
			return "/" + rest[:j]
		}
		if strings.HasPrefix(rest, "assets/") {
			return "/"
		}
	}
	if strings.Contains(s, `src="./assets/`) {
		return "/"
	}
	return "/apps/golem"
}

// mountStaticFrontend prefers web/react-frontend/dist (Vite), then legacy web/react, then web/static.
func mountStaticFrontend(mux *http.ServeMux, log *zap.Logger) {
	distDir := filepath.Join(".", "web", "react-frontend", "dist")
	if _, err := os.Stat(filepath.Join(distDir, "index.html")); err == nil {
		base := detectViteBasePath(distDir)
		fs := http.FileServer(http.Dir(distDir))
		if base == "/" {
			mux.Handle("/", fs)
			log.Info("Serving React SPA from ./web/react-frontend/dist at / (same origin as API)")
			return
		}
		// Strip Vite base so /apps/golem/assets/* maps to dist/assets/* (matches nginx alias behavior).
		mux.Handle(base+"/", http.StripPrefix(base, fs))
		mux.HandleFunc(base, func(w http.ResponseWriter, r *http.Request) {
			http.Redirect(w, r, base+"/", http.StatusFound)
		})
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/" {
				http.NotFound(w, r)
				return
			}
			http.Redirect(w, r, base+"/", http.StatusFound)
		})
		log.Info("Serving React SPA from ./web/react-frontend/dist",
			zap.String("vite_base_path", base),
			zap.String("tip", "open http://localhost:<port>/ → redirects to app"),
		)
		return
	}

	legacyDir := filepath.Join(".", "web", "react")
	if _, err := os.Stat(filepath.Join(legacyDir, "index.html")); err == nil {
		mux.Handle("/", http.FileServer(http.Dir(legacyDir)))
		log.Info("Serving legacy React bundle from ./web/react")
		return
	}

	staticDir := filepath.Join(".", "web", "static")
	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		_ = os.MkdirAll(staticDir, 0755)
	}
	mux.Handle("/", http.FileServer(http.Dir(staticDir)))
	log.Info("Serving vanilla JS frontend from ./web/static (no React dist found)")
}
