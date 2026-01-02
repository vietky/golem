package telegram

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"golem_century/internal/logger"

	"go.uber.org/zap"
)

// Notifier handles sending notifications to Telegram
type Notifier struct {
	botToken string
	chatID   string
	enabled  bool
	logger   *logger.Logger
}

// NewNotifier creates a new Telegram notifier
func NewNotifier(botToken, chatID string, log *logger.Logger) *Notifier {
	enabled := botToken != "" && chatID != ""
	if enabled {
		log.Info("Telegram notifier enabled",
			zap.String("chatID", chatID),
		)
	} else {
		log.Info("Telegram notifier disabled (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)")
	}

	return &Notifier{
		botToken: botToken,
		chatID:   chatID,
		enabled:  enabled,
		logger:   log,
	}
}

// IsEnabled returns whether the notifier is enabled
func (n *Notifier) IsEnabled() bool {
	return n.enabled
}

// SendRoomCreatedNotification sends a notification when a room is created
func (n *Notifier) SendRoomCreatedNotification(roomID string, playerName string, numPlayers int) error {
	if !n.enabled {
		return nil
	}

	// Format the message with emojis and formatting
	message := fmt.Sprintf(
		"🎮 <b>New Game Room Created!</b>\n\n"+
			"🏷️ <b>Room ID:</b> <code>%s</code>\n"+
			"👤 <b>Created by:</b> %s\n"+
			"👥 <b>Max Players:</b> %d\n"+
			"⏰ <b>Time:</b> %s",
		roomID,
		playerName,
		numPlayers,
		time.Now().Format("2006-01-02 15:04:05"),
	)

	return n.sendMessage(message)
}

// sendMessage sends a message to Telegram
func (n *Notifier) sendMessage(message string) error {
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", n.botToken)

	payload := map[string]interface{}{
		"chat_id":    n.chatID,
		"text":       message,
		"parse_mode": "HTML",
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		n.logger.Error("Failed to marshal Telegram message", zap.Error(err))
		return err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		n.logger.Error("Failed to create Telegram request", zap.Error(err))
		return err
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		n.logger.Error("Failed to send Telegram message", zap.Error(err))
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		n.logger.Warn("Telegram API returned non-200 status",
			zap.Int("statusCode", resp.StatusCode),
		)
		return fmt.Errorf("telegram API returned status code %d", resp.StatusCode)
	}

	n.logger.Debug("Telegram notification sent successfully",
		zap.String("message", message),
	)

	return nil
}
