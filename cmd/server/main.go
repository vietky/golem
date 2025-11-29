package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"golem_century/internal/config"
	"golem_century/internal/database"
	"golem_century/internal/redis"
	"golem_century/internal/server"
)

func main() {
	port := flag.Int("port", 0, "Port to run the server on (overrides config)")
	flag.Parse()

	// Load configuration
	cfg := config.LoadConfig()

	// Override port if provided via flag
	if *port != 0 {
		cfg.Server.Port = *port
	}

	log.Printf("Starting Century: Golem Edition Server")
	log.Printf("Environment: %s", os.Getenv("ENVIRONMENT"))

	// Initialize Redis client
	log.Printf("Connecting to Redis at %s:%d...", cfg.Redis.Host, cfg.Redis.Port)
	redisClient, err := redis.NewRedisClient(
		cfg.Redis.Host,
		cfg.Redis.Port,
		cfg.Redis.Password,
		cfg.Redis.DB,
		cfg.Redis.PoolSize,
	)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redisClient.Close()
	log.Printf("Connected to Redis successfully")

	// Initialize PostgreSQL database
	log.Printf("Connecting to PostgreSQL at %s:%d...", cfg.PostgreSQL.Host, cfg.PostgreSQL.Port)
	db, err := database.NewPostgresDB(
		cfg.PostgreSQL.Host,
		cfg.PostgreSQL.Port,
		cfg.PostgreSQL.User,
		cfg.PostgreSQL.Password,
		cfg.PostgreSQL.Database,
		cfg.PostgreSQL.SSLMode,
		cfg.PostgreSQL.MaxConnections,
		cfg.PostgreSQL.MaxIdleConnections,
		cfg.PostgreSQL.ConnectionMaxLifetime,
	)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	defer db.Close()
	log.Printf("Connected to PostgreSQL successfully")

	// Initialize event store and notification service
	eventStore := redis.NewEventStore(redisClient)
	notificationService := redis.NewNotificationService(redisClient)

	// Create game server with dependencies
	gameServer := server.NewGameServerWithDeps(db, eventStore, notificationService)

	// Setup routes
	http.HandleFunc("/ws", gameServer.HandleWebSocket)
	http.HandleFunc("/api/create", gameServer.HandleCreateSession)
	http.HandleFunc("/api/join", gameServer.HandleJoinSession)
	http.HandleFunc("/api/list", gameServer.HandleListSessions)
	http.HandleFunc("/api/health", gameServer.HandleHealthCheck)
	http.HandleFunc("/api/catchup", gameServer.HandleCatchUpRequest)

	// Always serve images from static directory (both React and vanilla JS need this)
	staticDir := filepath.Join(".", "web", "static")
	imagesDir := filepath.Join(staticDir, "images")
	if _, err := os.Stat(imagesDir); err == nil {
		http.Handle("/images/", http.StripPrefix("/images/", http.FileServer(http.Dir(imagesDir))))
		log.Printf("Serving images from ./web/static/images")
	}

	// Serve static files - try React build first, fallback to vanilla JS
	reactDir := filepath.Join(".", "web", "react")
	reactIndexPath := filepath.Join(reactDir, "index.html")

	// Check if React build exists and has content (index.html exists), otherwise serve vanilla JS
	if _, err := os.Stat(reactIndexPath); err == nil {
		// Serve React build
		http.Handle("/", http.FileServer(http.Dir("./web/react")))
		log.Printf("Serving React frontend from ./web/react")
	} else {
		// Fallback to vanilla JS
		if _, err := os.Stat(staticDir); os.IsNotExist(err) {
			os.MkdirAll(staticDir, 0755)
		}
		http.Handle("/", http.FileServer(http.Dir("./web/static")))
		log.Printf("Serving vanilla JS frontend from ./web/static")
	}

	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Channel to listen for interrupt signals
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	// Start server in a goroutine
	go func() {
		fmt.Printf("Century: Golem Edition - Web Server\n")
		fmt.Printf("Server starting on http://%s\n", addr)
		fmt.Printf("Open http://localhost:%d in your browser to play\n", cfg.Server.Port)
		fmt.Printf("Health check: http://localhost:%d/api/health\n", cfg.Server.Port)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal
	<-stop
	log.Println("Shutting down server...")

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Shutdown server gracefully
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server stopped gracefully")
}
