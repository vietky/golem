package firebase

import (
	"context"
	"fmt"
	"sync"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

// Client wraps Firebase Auth and Firestore clients
type Client struct {
	Auth      *auth.Client
	Firestore *firestore.Client
	ctx       context.Context
}

var (
	instance *Client
	once     sync.Once
	initErr  error
)

// Initialize creates a singleton Firebase client
// credentialsPath: path to Firebase service account JSON file
// projectID: Firebase project ID
func Initialize(ctx context.Context, credentialsPath, projectID string) (*Client, error) {
	once.Do(func() {
		opt := option.WithCredentialsFile(credentialsPath)
		config := &firebase.Config{
			ProjectID: projectID,
		}

		app, err := firebase.NewApp(ctx, config, opt)
		if err != nil {
			initErr = fmt.Errorf("error initializing firebase app: %w", err)
			return
		}

		authClient, err := app.Auth(ctx)
		if err != nil {
			initErr = fmt.Errorf("error getting Auth client: %w", err)
			return
		}

		firestoreClient, err := app.Firestore(ctx)
		if err != nil {
			initErr = fmt.Errorf("error getting Firestore client: %w", err)
			return
		}

		instance = &Client{
			Auth:      authClient,
			Firestore: firestoreClient,
			ctx:       ctx,
		}
	})

	return instance, initErr
}

// GetInstance returns the singleton Firebase client instance
func GetInstance() (*Client, error) {
	if instance == nil {
		return nil, fmt.Errorf("firebase client not initialized, call Initialize first")
	}
	return instance, nil
}

// Close closes the Firestore client
func (c *Client) Close() error {
	if c.Firestore != nil {
		return c.Firestore.Close()
	}
	return nil
}

// VerifyIDToken verifies a Firebase ID token and returns the user ID
func (c *Client) VerifyIDToken(ctx context.Context, idToken string) (string, error) {
	token, err := c.Auth.VerifyIDToken(ctx, idToken)
	if err != nil {
		return "", fmt.Errorf("error verifying ID token: %w", err)
	}
	return token.UID, nil
}

// UserInfo contains basic user information
type UserInfo struct {
	UID         string `json:"uid"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	PhotoURL    string `json:"photoURL"`
}

// GetUser retrieves user information by UID
func (c *Client) GetUser(ctx context.Context, uid string) (*UserInfo, error) {
	user, err := c.Auth.GetUser(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("error getting user: %w", err)
	}

	return &UserInfo{
		UID:         user.UID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		PhotoURL:    user.PhotoURL,
	}, nil
}
