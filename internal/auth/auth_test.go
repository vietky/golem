package auth

import (
	"context"
	"testing"
	"time"
)

// TestRedisSessionStore tests the Redis session store functionality
func TestRedisSessionStore(t *testing.T) {
	t.Skip("Integration test - requires Redis")

	// This is an integration test that requires a running Redis instance
	// To run: docker-compose up -d redis && go test -v ./internal/auth -run TestRedisSessionStore

	store, err := NewRedisSessionStore("localhost:6379", 0)
	if err != nil {
		t.Fatalf("Failed to create session store: %v", err)
	}
	defer store.Close()

	ctx := context.Background()
	sessionID := "test-session-123"
	userID := "test-user-456"

	// Test Set
	err = store.Set(ctx, sessionID, userID, 5*time.Minute)
	if err != nil {
		t.Fatalf("Failed to set session: %v", err)
	}

	// Test Get
	retrievedUserID, err := store.Get(ctx, sessionID)
	if err != nil {
		t.Fatalf("Failed to get session: %v", err)
	}

	if retrievedUserID != userID {
		t.Errorf("Expected userID %s, got %s", userID, retrievedUserID)
	}

	// Test Delete
	err = store.Delete(ctx, sessionID)
	if err != nil {
		t.Fatalf("Failed to delete session: %v", err)
	}

	// Verify deletion
	_, err = store.Get(ctx, sessionID)
	if err == nil {
		t.Error("Expected error when getting deleted session")
	}
}

func TestGenerateRandomState(t *testing.T) {
	// Test that generateRandomState produces unique values
	state1 := generateRandomState()
	state2 := generateRandomState()

	if state1 == state2 {
		t.Error("generateRandomState produced duplicate values")
	}

	if len(state1) == 0 {
		t.Error("generateRandomState produced empty string")
	}
}

func TestGenerateSessionID(t *testing.T) {
	// Test that generateSessionID produces unique values
	id1 := generateSessionID()
	id2 := generateSessionID()

	if id1 == id2 {
		t.Error("generateSessionID produced duplicate values")
	}

	if len(id1) == 0 {
		t.Error("generateSessionID produced empty string")
	}
}
