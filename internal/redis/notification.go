package redis

import (
	"context"
	"encoding/json"
	"fmt"
)

// notificationService implements NotificationService interface
type notificationService struct {
	client RedisClient
}

// NewNotificationService creates a new notification service
func NewNotificationService(client RedisClient) NotificationService {
	return &notificationService{client: client}
}

// getChannelName returns the channel name for a session
func (ns *notificationService) getChannelName(sessionID string) string {
	return fmt.Sprintf("game:notifications:%s", sessionID)
}

// NotifyStateChange notifies all clients about a state change
func (ns *notificationService) NotifyStateChange(ctx context.Context, sessionID string, state map[string]interface{}) error {
	channel := ns.getChannelName(sessionID)

	notification := map[string]interface{}{
		"type":  "state_change",
		"state": state,
	}

	data, err := json.Marshal(notification)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}

	return ns.client.Publish(ctx, channel, string(data))
}

// NotifyPlayerAction notifies all clients about a player action
func (ns *notificationService) NotifyPlayerAction(ctx context.Context, sessionID string, playerID int, action string) error {
	channel := ns.getChannelName(sessionID)

	notification := map[string]interface{}{
		"type":     "player_action",
		"playerId": playerID,
		"action":   action,
	}

	data, err := json.Marshal(notification)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}

	return ns.client.Publish(ctx, channel, string(data))
}

// NotifyPlayerReconnect notifies that a player has reconnected
func (ns *notificationService) NotifyPlayerReconnect(ctx context.Context, sessionID string, playerID int) error {
	channel := ns.getChannelName(sessionID)

	notification := map[string]interface{}{
		"type":     "player_reconnect",
		"playerId": playerID,
	}

	data, err := json.Marshal(notification)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}

	return ns.client.Publish(ctx, channel, string(data))
}

// SubscribeToSession subscribes to notifications for a specific session
func (ns *notificationService) SubscribeToSession(ctx context.Context, sessionID string, handler MessageHandler) error {
	channel := ns.getChannelName(sessionID)
	return ns.client.Subscribe(ctx, handler, channel)
}
