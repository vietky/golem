package training

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
	"go.uber.org/zap"
)

type StorageBackend interface {
	Upload(ctx context.Context, data []byte, filename string) error
}

type Worker struct {
	client    *redis.Client
	stream    string
	group     string
	consumer  string
	storage   StorageBackend
	logger    *zap.Logger
}

func NewWorker(redisClient *redis.Client, stream, group, consumer string, storage StorageBackend, logger *zap.Logger) *Worker {
	if stream == "" {
		stream = "training:moves"
	}
	if group == "" {
		group = "s3-uploader-group"
	}
	if consumer == "" {
		consumer = "worker-1"
	}

	// Ensure group exists
	err := redisClient.XGroupCreateMkStream(context.Background(), stream, group, "$").Err()
	if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
		logger.Error("Error creating consumer group", zap.Error(err))
	}

	return &Worker{
		client:   redisClient,
		stream:   stream,
		group:    group,
		consumer: consumer,
		storage:  storage,
		logger:   logger,
	}
}

func (w *Worker) Start(ctx context.Context) {
	w.logger.Info("Starting training data worker")

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("Stopping training data worker")
			return
		default:
			// Read from stream
			res, err := w.client.XReadGroup(ctx, &redis.XReadGroupArgs{
				Group:    w.group,
				Consumer: w.consumer,
				Streams:  []string{w.stream, ">"},
				Count:    10, // batch size
				Block:    5 * time.Second,
			}).Result()

			if err == redis.Nil {
				continue // No new messages
			} else if err != nil {
				w.logger.Error("Failed to read from Redis stream", zap.Error(err))
				time.Sleep(1 * time.Second)
				continue
			}

			for _, stream := range res {
				for _, msg := range stream.Messages {
					dataStr, ok := msg.Values["data"].(string)
					if !ok {
						w.logger.Warn("Invalid data in message", zap.String("id", msg.ID))
						w.client.XAck(ctx, w.stream, w.group, msg.ID)
						continue
					}

					var event MoveEvent
					if err := json.Unmarshal([]byte(dataStr), &event); err != nil {
						w.logger.Error("Failed to unmarshal event", zap.Error(err))
						w.client.XAck(ctx, w.stream, w.group, msg.ID)
						continue
					}

					filename := fmt.Sprintf("%s_%d_%s.json", event.GameID, event.Timestamp.Unix(), msg.ID)
					if err := w.storage.Upload(ctx, []byte(dataStr), filename); err != nil {
						w.logger.Error("Failed to upload data to storage", zap.Error(err))
						continue // Don't ack so it gets retried or picked up by another consumer
					}

					w.client.XAck(ctx, w.stream, w.group, msg.ID)
					w.logger.Debug("Successfully uploaded event", zap.String("id", msg.ID))
				}
			}
		}
	}
}

// fmt dependency missing, will fix below.
