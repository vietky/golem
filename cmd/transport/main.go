package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-redis/redis/v8"
)

var (
	redisClient *redis.Client
	ctx         = context.Background()
)

type Router struct {
	ProxyMap map[string]*httputil.ReverseProxy
}

func initRedis() {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	redisClient = redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatalf("Could not connect to Redis: %v", err)
	}
}

func getGameInstance(sessionID string) (string, error) {
	// Query Redis to find which instance is hosting this session
	val, err := redisClient.Get(ctx, "session:"+sessionID).Result()
	if err == redis.Nil {
		return "", nil // Session not found
	} else if err != nil {
		return "", err
	}
	return val, nil
}

func assignGameInstance(sessionID string, targetInstance string) error {
	// Expire after a while if no activity, matching firestore retention policy
	return redisClient.Set(ctx, "session:"+sessionID, targetInstance, 72*time.Hour).Err()
}

func getAvailableGameInstance() (string, error) {
	// Poor man's round robin from a set of known instances
	// In a real system, game instances would register themselves to Redis
	// Here we just pull from an env var for simplicity
	instancesStr := os.Getenv("GAME_INSTANCES")
	if instancesStr == "" {
		instancesStr = "http://localhost:8080"
	}
	instances := strings.Split(instancesStr, ",")
	if len(instances) == 0 {
		return "", fmt.Errorf("no game instances configured")
	}

	// Just pick the first for now - could do real LB
	// Or pop from a list of instances in Redis
	val, _ := redisClient.Get(ctx, "last_instance").Result()
	idx := 0
	if val != "" {
		idx, _ = strconv.Atoi(val)
		idx = (idx + 1) % len(instances)
	}
	redisClient.Set(ctx, "last_instance", strconv.Itoa(idx), 0)

	return instances[idx], nil
}

func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	// Extract session ID
	sessionID := req.URL.Query().Get("session")

	// If it's a create session request, we assign it
	if req.URL.Path == "/api/session" && req.Method == "POST" {
		instance, err := getAvailableGameInstance()
		if err != nil {
			http.Error(w, "Failed to get available game instance", http.StatusInternalServerError)
			return
		}

		// For create session, we don't know the ID yet until the backend responds.
		// So we proxy to an available instance, and it's the backend's job to register
		// its session in Redis once created.
		r.proxyRequest(w, req, instance)
		return
	}

	if sessionID == "" {
		// General requests that don't belong to a session, just load balance
		instance, _ := getAvailableGameInstance()
		r.proxyRequest(w, req, instance)
		return
	}

	instance, err := getGameInstance(sessionID)
	if err != nil {
		http.Error(w, "Error resolving game instance", http.StatusInternalServerError)
		return
	}

	if instance == "" {
		// Session not actively tracked, maybe the instance crashed and state is only in DB.
		// Assign it to a new available instance which will recover it from Firestore.
		instance, err = getAvailableGameInstance()
		if err != nil {
			http.Error(w, "Failed to assign game instance", http.StatusInternalServerError)
			return
		}
		assignGameInstance(sessionID, instance)
	}

	r.proxyRequest(w, req, instance)
}

func (r *Router) proxyRequest(w http.ResponseWriter, req *http.Request, target string) {
	proxy, ok := r.ProxyMap[target]
	if !ok {
		u, _ := url.Parse(target)
		proxy = httputil.NewSingleHostReverseProxy(u)
		r.ProxyMap[target] = proxy
	}

	proxy.ServeHTTP(w, req)
}

func main() {
	initRedis()

	router := &Router{
		ProxyMap: make(map[string]*httputil.ReverseProxy),
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	log.Printf("Transport service listening on :%s", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("Failed to start transport server: %v", err)
	}
}
