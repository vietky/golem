package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// client implements RedisClient interface
type client struct {
	rdb *redis.Client
}

// NewRedisClient creates a new Redis client
func NewRedisClient(host string, port int, password string, db int, poolSize int) (RedisClient, error) {
	addr := fmt.Sprintf("%s:%d", host, port)

	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
		PoolSize: poolSize,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &client{rdb: rdb}, nil
}

// Ping checks if the connection to Redis is alive
func (c *client) Ping(ctx context.Context) error {
	return c.rdb.Ping(ctx).Err()
}

// Close closes the Redis connection
func (c *client) Close() error {
	return c.rdb.Close()
}

// AddToStream adds an event to a Redis stream
func (c *client) AddToStream(ctx context.Context, stream string, values map[string]interface{}) (string, error) {
	result := c.rdb.XAdd(ctx, &redis.XAddArgs{
		Stream: stream,
		Values: values,
	})
	return result.Val(), result.Err()
}

// ReadStream reads events from a stream starting from a specific ID
func (c *client) ReadStream(ctx context.Context, stream string, startID string, count int64) ([]StreamMessage, error) {
	if startID == "" {
		startID = "0" // Start from the beginning
	}

	result := c.rdb.XRead(ctx, &redis.XReadArgs{
		Streams: []string{stream, startID},
		Count:   count,
		Block:   0,
	})

	if err := result.Err(); err != nil {
		if err == redis.Nil {
			return []StreamMessage{}, nil
		}
		return nil, err
	}

	messages := make([]StreamMessage, 0)
	for _, stream := range result.Val() {
		for _, msg := range stream.Messages {
			messages = append(messages, StreamMessage{
				ID:     msg.ID,
				Values: msg.Values,
			})
		}
	}

	return messages, nil
}

// ReadStreamGroup reads events from a stream as part of a consumer group
func (c *client) ReadStreamGroup(ctx context.Context, group, consumer, stream, startID string, count int64) ([]StreamMessage, error) {
	if startID == "" {
		startID = ">" // Only new messages
	}

	result := c.rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
		Group:    group,
		Consumer: consumer,
		Streams:  []string{stream, startID},
		Count:    count,
		Block:    0,
	})

	if err := result.Err(); err != nil {
		if err == redis.Nil {
			return []StreamMessage{}, nil
		}
		return nil, err
	}

	messages := make([]StreamMessage, 0)
	for _, stream := range result.Val() {
		for _, msg := range stream.Messages {
			messages = append(messages, StreamMessage{
				ID:     msg.ID,
				Values: msg.Values,
			})
		}
	}

	return messages, nil
}

// CreateGroup creates a consumer group for a stream
func (c *client) CreateGroup(ctx context.Context, stream, group, startID string) error {
	if startID == "" {
		startID = "0" // Start from the beginning
	}

	// Check if stream exists, create it if not
	exists, err := c.rdb.Exists(ctx, stream).Result()
	if err != nil {
		return err
	}

	if exists == 0 {
		// Create stream with a dummy entry that we'll delete
		if _, err := c.AddToStream(ctx, stream, map[string]interface{}{"init": "true"}); err != nil {
			return err
		}
	}

	// Try to create the group
	err = c.rdb.XGroupCreateMkStream(ctx, stream, group, startID).Err()
	if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
		return err
	}

	return nil
}

// AckMessage acknowledges processing of a message in a consumer group
func (c *client) AckMessage(ctx context.Context, stream, group string, messageIDs ...string) error {
	return c.rdb.XAck(ctx, stream, group, messageIDs...).Err()
}

// TrimStream trims a stream to a maximum length
func (c *client) TrimStream(ctx context.Context, stream string, maxLen int64) error {
	return c.rdb.XTrimMaxLen(ctx, stream, maxLen).Err()
}

// Publish publishes a message to a channel
func (c *client) Publish(ctx context.Context, channel string, message interface{}) error {
	return c.rdb.Publish(ctx, channel, message).Err()
}

// Subscribe subscribes to one or more channels
func (c *client) Subscribe(ctx context.Context, handler MessageHandler, channels ...string) error {
	pubsub := c.rdb.Subscribe(ctx, channels...)
	defer pubsub.Close()

	// Wait for confirmation
	_, err := pubsub.Receive(ctx)
	if err != nil {
		return err
	}

	// Handle messages
	ch := pubsub.Channel()
	for msg := range ch {
		if err := handler(msg.Channel, []byte(msg.Payload)); err != nil {
			return err
		}
	}

	return nil
}

// Unsubscribe unsubscribes from channels
func (c *client) Unsubscribe(ctx context.Context, channels ...string) error {
	// This is a simplified implementation
	// In a real application, you'd need to manage subscriptions
	return nil
}
