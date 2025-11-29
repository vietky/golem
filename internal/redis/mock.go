package redis

import (
	"context"
	"time"
)

// MockRedisClient implements RedisClient for testing (exported for use in other packages)
type MockRedisClient struct {
	Streams map[string][]StreamMessage
}

// NewMockRedisClient creates a new mock Redis client
func NewMockRedisClient() *MockRedisClient {
	return &MockRedisClient{
		Streams: make(map[string][]StreamMessage),
	}
}

func (m *MockRedisClient) Ping(ctx context.Context) error {
	return nil
}

func (m *MockRedisClient) Close() error {
	return nil
}

func (m *MockRedisClient) AddToStream(ctx context.Context, stream string, values map[string]interface{}) (string, error) {
	if m.Streams[stream] == nil {
		m.Streams[stream] = make([]StreamMessage, 0)
	}

	id := time.Now().Format("15:04:05.000")
	msg := StreamMessage{
		ID:     id,
		Values: values,
	}
	m.Streams[stream] = append(m.Streams[stream], msg)
	return id, nil
}

func (m *MockRedisClient) ReadStream(ctx context.Context, stream string, startID string, count int64) ([]StreamMessage, error) {
	messages, ok := m.Streams[stream]
	if !ok {
		return []StreamMessage{}, nil
	}

	// Simple implementation - return all messages after startID
	result := make([]StreamMessage, 0)
	startFound := startID == "" || startID == "0"

	for _, msg := range messages {
		if startFound {
			result = append(result, msg)
			if int64(len(result)) >= count && count > 0 {
				break
			}
		} else if msg.ID == startID {
			startFound = true
		}
	}

	return result, nil
}

func (m *MockRedisClient) ReadStreamGroup(ctx context.Context, group, consumer, stream, startID string, count int64) ([]StreamMessage, error) {
	return m.ReadStream(ctx, stream, startID, count)
}

func (m *MockRedisClient) CreateGroup(ctx context.Context, stream, group, startID string) error {
	return nil
}

func (m *MockRedisClient) AckMessage(ctx context.Context, stream, group string, messageIDs ...string) error {
	return nil
}

func (m *MockRedisClient) TrimStream(ctx context.Context, stream string, maxLen int64) error {
	return nil
}

func (m *MockRedisClient) Publish(ctx context.Context, channel string, message interface{}) error {
	return nil
}

func (m *MockRedisClient) Subscribe(ctx context.Context, handler MessageHandler, channels ...string) error {
	return nil
}

func (m *MockRedisClient) Unsubscribe(ctx context.Context, channels ...string) error {
	return nil
}
