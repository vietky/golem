package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"golem_century/internal/events"

	"github.com/redis/go-redis/v9"
)

// RedisEventPublisher implements the EventPublisher interface using Redis Pub/Sub
type RedisEventPublisher struct {
	client       *redis.Client
	subscribers  map[string][]chan *events.Event
	subscriberMu sync.RWMutex
	pubsub       *redis.PubSub
	closed       bool
	closeMu      sync.RWMutex
}

// NewRedisEventPublisher creates a new Redis event publisher
func NewRedisEventPublisher(addr, password string, db int) (*RedisEventPublisher, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	// Test connection
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &RedisEventPublisher{
		client:      client,
		subscribers: make(map[string][]chan *events.Event),
	}, nil
}

// Publish publishes an event to all subscribers
func (r *RedisEventPublisher) Publish(ctx context.Context, gameID string, event *events.Event) error {
	r.closeMu.RLock()
	defer r.closeMu.RUnlock()

	if r.closed {
		return fmt.Errorf("publisher is closed")
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	channel := fmt.Sprintf("game:%s:events", gameID)
	if err := r.client.Publish(ctx, channel, eventJSON).Err(); err != nil {
		return fmt.Errorf("failed to publish event: %w", err)
	}

	return nil
}

// Subscribe subscribes to events for a specific game
func (r *RedisEventPublisher) Subscribe(ctx context.Context, gameID string) (<-chan *events.Event, error) {
	r.closeMu.RLock()
	defer r.closeMu.RUnlock()

	if r.closed {
		return nil, fmt.Errorf("publisher is closed")
	}

	channel := fmt.Sprintf("game:%s:events", gameID)
	eventCh := make(chan *events.Event, 100)

	// Add to subscribers map
	r.subscriberMu.Lock()
	r.subscribers[gameID] = append(r.subscribers[gameID], eventCh)
	r.subscriberMu.Unlock()

	// Subscribe to Redis channel
	pubsub := r.client.Subscribe(ctx, channel)

	// Start goroutine to forward messages
	go func() {
		defer close(eventCh)
		defer pubsub.Close()

		ch := pubsub.Channel()
		for msg := range ch {
			var event events.Event
			if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
				continue
			}

			select {
			case eventCh <- &event:
			case <-ctx.Done():
				return
			}
		}
	}()

	return eventCh, nil
}

// Unsubscribe unsubscribes from events for a specific game
func (r *RedisEventPublisher) Unsubscribe(ctx context.Context, gameID string, ch <-chan *events.Event) error {
	r.subscriberMu.Lock()
	defer r.subscriberMu.Unlock()

	subscribers := r.subscribers[gameID]
	for i, sub := range subscribers {
		if sub == ch {
			r.subscribers[gameID] = append(subscribers[:i], subscribers[i+1:]...)
			break
		}
	}

	return nil
}

// Close closes the publisher connection
func (r *RedisEventPublisher) Close() error {
	r.closeMu.Lock()
	defer r.closeMu.Unlock()

	if r.closed {
		return nil
	}

	r.closed = true

	// Close all subscriber channels
	r.subscriberMu.Lock()
	for _, subs := range r.subscribers {
		for _, ch := range subs {
			close(ch)
		}
	}
	r.subscribers = make(map[string][]chan *events.Event)
	r.subscriberMu.Unlock()

	return r.client.Close()
}

// RedisStreamPublisher implements event publishing using Redis Streams
type RedisStreamPublisher struct {
	client *redis.Client
	closed bool
	mu     sync.RWMutex
}

// NewRedisStreamPublisher creates a new Redis Streams publisher
func NewRedisStreamPublisher(addr, password string, db int) (*RedisStreamPublisher, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	// Test connection
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &RedisStreamPublisher{
		client: client,
	}, nil
}

// PublishToStream publishes an event to a Redis Stream
func (r *RedisStreamPublisher) PublishToStream(ctx context.Context, gameID string, event *events.Event) error {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.closed {
		return fmt.Errorf("stream publisher is closed")
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	streamKey := fmt.Sprintf("game:%s:stream", gameID)
	values := map[string]interface{}{
		"event": eventJSON,
	}

	if err := r.client.XAdd(ctx, &redis.XAddArgs{
		Stream: streamKey,
		Values: values,
	}).Err(); err != nil {
		return fmt.Errorf("failed to add to stream: %w", err)
	}

	return nil
}

// ReadStream reads events from a Redis Stream
func (r *RedisStreamPublisher) ReadStream(ctx context.Context, gameID string, lastID string, count int64) ([]*events.Event, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.closed {
		return nil, fmt.Errorf("stream publisher is closed")
	}

	streamKey := fmt.Sprintf("game:%s:stream", gameID)
	if lastID == "" {
		lastID = "0"
	}

	streams, err := r.client.XRead(ctx, &redis.XReadArgs{
		Streams: []string{streamKey, lastID},
		Count:   count,
		Block:   0,
	}).Result()

	if err == redis.Nil {
		return []*events.Event{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to read from stream: %w", err)
	}

	var eventList []*events.Event
	for _, stream := range streams {
		for _, message := range stream.Messages {
			eventJSON, ok := message.Values["event"].(string)
			if !ok {
				continue
			}

			var event events.Event
			if err := json.Unmarshal([]byte(eventJSON), &event); err != nil {
				continue
			}

			eventList = append(eventList, &event)
		}
	}

	return eventList, nil
}

// Close closes the stream publisher connection
func (r *RedisStreamPublisher) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.closed {
		return nil
	}

	r.closed = true
	return r.client.Close()
}
