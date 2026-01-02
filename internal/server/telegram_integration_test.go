package server

import (
	"testing"

	"golem_century/internal/config"
	"golem_century/internal/logger"
)

// TestTelegramNotifierIntegration verifies that the GameServer properly initializes
// the Telegram notifier based on configuration
func TestTelegramNotifierIntegration(t *testing.T) {
	log := logger.NewNopLogger()

	// Test 1: Server without Telegram configuration (disabled)
	cfg := config.Config{
		TelegramBotToken: "",
		TelegramChatID:   "",
	}
	gs := NewGameServer(NewGameServerRequest{
		Logger: log,
		Config: &cfg,
	})

	if gs.TelegramNotifier == nil {
		t.Error("Expected TelegramNotifier to be initialized (even when disabled)")
	}

	if gs.TelegramNotifier.IsEnabled() {
		t.Error("Expected TelegramNotifier to be disabled with empty config")
	}

	// Test 2: Server with Telegram configuration (enabled)
	cfg2 := config.Config{
		TelegramBotToken: "test-token-123",
		TelegramChatID:   "test-chat-id-456",
	}
	gs2 := NewGameServer(NewGameServerRequest{
		Logger: log,
		Config: &cfg2,
	})

	if gs2.TelegramNotifier == nil {
		t.Error("Expected TelegramNotifier to be initialized")
	}

	if !gs2.TelegramNotifier.IsEnabled() {
		t.Error("Expected TelegramNotifier to be enabled with valid config")
	}
}
