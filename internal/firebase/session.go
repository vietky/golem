package firebase

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

// SessionMember represents a user's membership in a game session
type SessionMember struct {
	UserID    string    `firestore:"userId"`
	SessionID string    `firestore:"sessionId"`
	PlayerID  int       `firestore:"playerId"` // Player number in the game (1-indexed)
	JoinedAt  time.Time `firestore:"joinedAt"`
	LeftAt    time.Time `firestore:"leftAt,omitempty"`
	IsActive  bool      `firestore:"isActive"`
}

// Session represents a game session in Firestore
type Session struct {
	SessionID  string         `firestore:"sessionId"`
	CreatedAt  time.Time      `firestore:"createdAt"`
	StartedAt  time.Time      `firestore:"startedAt,omitempty"`
	EndedAt    time.Time      `firestore:"endedAt,omitempty"`
	Status     string         `firestore:"status"`  // "waiting", "in_progress", "completed"
	Members    map[string]int `firestore:"members"` // userID -> playerID
	MaxPlayers int            `firestore:"maxPlayers"`
}

const (
	sessionsCollection = "game_sessions"
	membersCollection  = "session_members"
)

// CreateSession creates a new game session in Firestore
func (c *Client) CreateSession(ctx context.Context, sessionID string, maxPlayers int) error {
	session := Session{
		SessionID:  sessionID,
		CreatedAt:  time.Now(),
		Status:     "waiting",
		Members:    make(map[string]int),
		MaxPlayers: maxPlayers,
	}

	_, err := c.Firestore.Collection(sessionsCollection).Doc(sessionID).Set(ctx, session)
	if err != nil {
		return fmt.Errorf("error creating session: %w", err)
	}

	return nil
}

// AddSessionMember adds a user to a game session
func (c *Client) AddSessionMember(ctx context.Context, sessionID, userID string, playerID int) error {
	// Start a transaction to ensure atomicity
	err := c.Firestore.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		// Get session document
		sessionRef := c.Firestore.Collection(sessionsCollection).Doc(sessionID)
		sessionDoc, err := tx.Get(sessionRef)
		if err != nil {
			return fmt.Errorf("error getting session: %w", err)
		}

		var session Session
		if err := sessionDoc.DataTo(&session); err != nil {
			return fmt.Errorf("error parsing session: %w", err)
		}

		// Check if session is full
		if len(session.Members) >= session.MaxPlayers {
			return fmt.Errorf("session is full")
		}

		// Check if user is already in the session
		if _, exists := session.Members[userID]; exists {
			return fmt.Errorf("user already in session")
		}

		// Update session members
		session.Members[userID] = playerID
		if err := tx.Set(sessionRef, session); err != nil {
			return fmt.Errorf("error updating session: %w", err)
		}

		// Create member record
		member := SessionMember{
			UserID:    userID,
			SessionID: sessionID,
			PlayerID:  playerID,
			JoinedAt:  time.Now(),
			IsActive:  true,
		}

		memberID := fmt.Sprintf("%s_%s", sessionID, userID)
		memberRef := c.Firestore.Collection(membersCollection).Doc(memberID)
		if err := tx.Set(memberRef, member); err != nil {
			return fmt.Errorf("error creating member record: %w", err)
		}

		return nil
	})

	return err
}

// RemoveSessionMember marks a user as inactive in a session
func (c *Client) RemoveSessionMember(ctx context.Context, sessionID, userID string) error {
	memberID := fmt.Sprintf("%s_%s", sessionID, userID)
	_, err := c.Firestore.Collection(membersCollection).Doc(memberID).Update(ctx, []firestore.Update{
		{Path: "isActive", Value: false},
		{Path: "leftAt", Value: time.Now()},
	})

	if err != nil {
		return fmt.Errorf("error removing session member: %w", err)
	}

	return nil
}

// IsUserInSession checks if a user is an active member of a session
func (c *Client) IsUserInSession(ctx context.Context, sessionID, userID string) (bool, int, error) {
	memberID := fmt.Sprintf("%s_%s", sessionID, userID)
	doc, err := c.Firestore.Collection(membersCollection).Doc(memberID).Get(ctx)
	if err != nil {
		if err.Error() == "rpc error: code = NotFound desc = document not found" {
			return false, 0, nil
		}
		return false, 0, fmt.Errorf("error checking user membership: %w", err)
	}

	var member SessionMember
	if err := doc.DataTo(&member); err != nil {
		return false, 0, fmt.Errorf("error parsing member data: %w", err)
	}

	return member.IsActive, member.PlayerID, nil
}

// GetSessionMembers retrieves all active members of a session
func (c *Client) GetSessionMembers(ctx context.Context, sessionID string) ([]SessionMember, error) {
	iter := c.Firestore.Collection(membersCollection).
		Where("sessionId", "==", sessionID).
		Where("isActive", "==", true).
		Documents(ctx)

	var members []SessionMember
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error iterating members: %w", err)
		}

		var member SessionMember
		if err := doc.DataTo(&member); err != nil {
			return nil, fmt.Errorf("error parsing member: %w", err)
		}
		members = append(members, member)
	}

	return members, nil
}

// UpdateSessionStatus updates the status of a game session
func (c *Client) UpdateSessionStatus(ctx context.Context, sessionID, status string) error {
	updates := []firestore.Update{
		{Path: "status", Value: status},
	}

	if status == "in_progress" {
		updates = append(updates, firestore.Update{Path: "startedAt", Value: time.Now()})
	} else if status == "completed" {
		updates = append(updates, firestore.Update{Path: "endedAt", Value: time.Now()})
	}

	_, err := c.Firestore.Collection(sessionsCollection).Doc(sessionID).Update(ctx, updates)
	if err != nil {
		return fmt.Errorf("error updating session status: %w", err)
	}

	return nil
}

// GetSession retrieves a session by ID
func (c *Client) GetSession(ctx context.Context, sessionID string) (*Session, error) {
	doc, err := c.Firestore.Collection(sessionsCollection).Doc(sessionID).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("error getting session: %w", err)
	}

	var session Session
	if err := doc.DataTo(&session); err != nil {
		return nil, fmt.Errorf("error parsing session: %w", err)
	}

	return &session, nil
}
