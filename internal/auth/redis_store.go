package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisSessionStore implements SessionStore using Redis
type RedisSessionStore struct {
	client *redis.Client
	prefix string
}

// NewRedisSessionStore creates a new Redis-based session store
func NewRedisSessionStore(redisAddr string, redisDB int) (*RedisSessionStore, error) {
	client := redis.NewClient(&redis.Options{
		Addr: redisAddr,
		DB:   redisDB,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &RedisSessionStore{
		client: client,
		prefix: "session:",
	}, nil
}

// Set stores a session with the given user ID and duration
func (s *RedisSessionStore) Set(ctx context.Context, sessionID string, userID string, duration time.Duration) error {
	key := s.prefix + sessionID
	return s.client.Set(ctx, key, userID, duration).Err()
}

// Get retrieves the user ID for a given session ID
func (s *RedisSessionStore) Get(ctx context.Context, sessionID string) (string, error) {
	key := s.prefix + sessionID
	return s.client.Get(ctx, key).Result()
}

// Delete removes a session from the store
func (s *RedisSessionStore) Delete(ctx context.Context, sessionID string) error {
	key := s.prefix + sessionID
	return s.client.Del(ctx, key).Err()
}

// Close closes the Redis connection
func (s *RedisSessionStore) Close() error {
	return s.client.Close()
}
