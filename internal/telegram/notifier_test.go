package telegram

import (
	"testing"

	"golem_century/internal/logger"
)

func TestNewNotifier(t *testing.T) {
	log := logger.NewNopLogger()

	// Test with empty credentials (should be disabled)
	notifier := NewNotifier("", "", log)
	if notifier.IsEnabled() {
		t.Error("Expected notifier to be disabled with empty credentials")
	}

	// Test with only token (should be disabled)
	notifier = NewNotifier("test-token", "", log)
	if notifier.IsEnabled() {
		t.Error("Expected notifier to be disabled with missing chatID")
	}

	// Test with only chatID (should be disabled)
	notifier = NewNotifier("", "test-chat-id", log)
	if notifier.IsEnabled() {
		t.Error("Expected notifier to be disabled with missing token")
	}

	// Test with both credentials (should be enabled)
	notifier = NewNotifier("test-token", "test-chat-id", log)
	if !notifier.IsEnabled() {
		t.Error("Expected notifier to be enabled with both credentials")
	}
}

func TestSendRoomCreatedNotification_Disabled(t *testing.T) {
	log := logger.NewNopLogger()
	notifier := NewNotifier("", "", log)

	// Should not return error when disabled
	err := notifier.SendRoomCreatedNotification("test-room", "TestPlayer", 4)
	if err != nil {
		t.Errorf("Expected no error from disabled notifier, got: %v", err)
	}
}
