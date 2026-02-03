package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"golem_century/internal/logger"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/option"

	"go.uber.org/zap"
)

// FirebaseAuth manages Firebase authentication
type FirebaseAuth struct {
	app          *firebase.App
	authClient   *auth.Client
	oauthConfig  *oauth2.Config
	logger       *logger.Logger
	sessionStore SessionStore
	domain       string // Domain for session cookies (e.g., ".anhtran.dev" for SSO)
}

// SessionStore interface for storing user sessions
type SessionStore interface {
	Set(ctx context.Context, sessionID string, userID string, duration time.Duration) error
	Get(ctx context.Context, sessionID string) (string, error)
	Delete(ctx context.Context, sessionID string) error
}

// UserInfo represents authenticated user information
type UserInfo struct {
	UID           string `json:"uid"`
	Email         string `json:"email"`
	DisplayName   string `json:"display_name"`
	PhotoURL      string `json:"photo_url"`
	EmailVerified bool   `json:"email_verified"`
}

// FirebaseAuthConfig holds Firebase authentication configuration
type FirebaseAuthConfig struct {
	CredentialsFile string       // Path to Firebase service account JSON
	OAuthClientID   string       // Google OAuth client ID
	OAuthSecret     string       // Google OAuth client secret
	RedirectURL     string       // OAuth redirect URL
	SessionStore    SessionStore // Session storage backend
	Logger          *logger.Logger
	Domain          string // Domain for session cookies
}

// NewFirebaseAuth creates a new Firebase authentication manager
func NewFirebaseAuth(config FirebaseAuthConfig) (*FirebaseAuth, error) {
	ctx := context.Background()

	// Initialize Firebase app with service account
	opt := option.WithCredentialsFile(config.CredentialsFile)
	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Firebase app: %w", err)
	}

	// Get Auth client
	authClient, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get Firebase Auth client: %w", err)
	}

	// Setup OAuth2 config for Google
	oauthConfig := &oauth2.Config{
		ClientID:     config.OAuthClientID,
		ClientSecret: config.OAuthSecret,
		RedirectURL:  config.RedirectURL,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
			"openid",
		},
		Endpoint: google.Endpoint,
	}

	log := config.Logger
	if log == nil {
		log = logger.NewNopLogger()
	}

	return &FirebaseAuth{
		app:          app,
		authClient:   authClient,
		oauthConfig:  oauthConfig,
		logger:       log,
		sessionStore: config.SessionStore,
		domain:       config.Domain,
	}, nil
}

// HandleGoogleLogin initiates the Google OAuth flow
func (fa *FirebaseAuth) HandleGoogleLogin(w http.ResponseWriter, r *http.Request) {
	// Generate random state for CSRF protection
	state := generateRandomState()

	// Store state in a short-lived cookie (5 minutes)
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		Domain:   fa.domain,
		MaxAge:   300, // 5 minutes
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	// Redirect to Google OAuth consent page
	url := fa.oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// HandleGoogleCallback handles the OAuth callback from Google
func (fa *FirebaseAuth) HandleGoogleCallback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Verify state for CSRF protection
	stateCookie, err := r.Cookie("oauth_state")
	if err != nil {
		fa.logger.Warn("Missing oauth_state cookie", zap.Error(err))
		http.Error(w, "Invalid state parameter", http.StatusBadRequest)
		return
	}

	state := r.URL.Query().Get("state")
	if state != stateCookie.Value {
		fa.logger.Warn("State mismatch", zap.String("expected", stateCookie.Value), zap.String("got", state))
		http.Error(w, "State mismatch", http.StatusBadRequest)
		return
	}

	// Clear the state cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    "",
		Path:     "/",
		Domain:   fa.domain,
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
	})

	// Exchange authorization code for tokens
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Missing authorization code", http.StatusBadRequest)
		return
	}

	token, err := fa.oauthConfig.Exchange(ctx, code)
	if err != nil {
		fa.logger.Error("Failed to exchange code for token", zap.Error(err))
		http.Error(w, "Failed to exchange authorization code", http.StatusInternalServerError)
		return
	}

	// Extract ID token
	idToken, ok := token.Extra("id_token").(string)
	if !ok {
		fa.logger.Error("No id_token in OAuth response")
		http.Error(w, "No ID token in response", http.StatusInternalServerError)
		return
	}

	// Verify ID token with Firebase
	firebaseToken, err := fa.authClient.VerifyIDToken(ctx, idToken)
	if err != nil {
		fa.logger.Error("Failed to verify ID token", zap.Error(err))
		http.Error(w, "Failed to verify ID token", http.StatusUnauthorized)
		return
	}

	// Get user information
	userRecord, err := fa.authClient.GetUser(ctx, firebaseToken.UID)
	if err != nil {
		fa.logger.Error("Failed to get user record", zap.String("uid", firebaseToken.UID), zap.Error(err))
		http.Error(w, "Failed to get user information", http.StatusInternalServerError)
		return
	}

	// Create session
	sessionID := generateSessionID()
	sessionDuration := 7 * 24 * time.Hour // 7 days

	err = fa.sessionStore.Set(ctx, sessionID, userRecord.UID, sessionDuration)
	if err != nil {
		fa.logger.Error("Failed to store session", zap.Error(err))
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		Domain:   fa.domain,
		MaxAge:   int(sessionDuration.Seconds()),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	fa.logger.Info("User logged in successfully",
		zap.String("uid", userRecord.UID),
		zap.String("email", userRecord.Email),
		zap.String("sessionID", sessionID),
	)

	// Redirect to home page or dashboard
	http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
}

// HandleLogout logs out the user by clearing the session
func (fa *FirebaseAuth) HandleLogout(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get session cookie
	cookie, err := r.Cookie("session_id")
	if err == nil {
		// Delete session from store
		if err := fa.sessionStore.Delete(ctx, cookie.Value); err != nil {
			fa.logger.Warn("Failed to delete session from store", zap.Error(err))
		}
	}

	// Clear session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		Domain:   fa.domain,
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
	})

	fa.logger.Info("User logged out")

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Logged out successfully",
	})
}

// HandleProfile returns the current user's profile information
func (fa *FirebaseAuth) HandleProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get user info from context (set by middleware)
	userInfo, ok := ctx.Value("user").(*UserInfo)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Return user profile
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userInfo)
}

// HandleUpdateProfile updates the current user's profile
func (fa *FirebaseAuth) HandleUpdateProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get user info from context
	userInfo, ok := ctx.Value("user").(*UserInfo)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse update request
	var updateReq struct {
		DisplayName string `json:"display_name"`
		PhotoURL    string `json:"photo_url"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updateReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Update user profile in Firebase
	params := (&auth.UserToUpdate{}).
		DisplayName(updateReq.DisplayName).
		PhotoURL(updateReq.PhotoURL)

	updatedUser, err := fa.authClient.UpdateUser(ctx, userInfo.UID, params)
	if err != nil {
		fa.logger.Error("Failed to update user profile", zap.String("uid", userInfo.UID), zap.Error(err))
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

	fa.logger.Info("User profile updated",
		zap.String("uid", userInfo.UID),
		zap.String("displayName", updateReq.DisplayName),
	)

	// Return updated user info
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"user": &UserInfo{
			UID:           updatedUser.UID,
			Email:         updatedUser.Email,
			DisplayName:   updatedUser.DisplayName,
			PhotoURL:      updatedUser.PhotoURL,
			EmailVerified: updatedUser.EmailVerified,
		},
	})
}

// AuthMiddleware is a middleware that checks if the user is authenticated
func (fa *FirebaseAuth) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// Get session cookie
		cookie, err := r.Cookie("session_id")
		if err != nil {
			fa.logger.Debug("No session cookie found")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Get user ID from session store
		userID, err := fa.sessionStore.Get(ctx, cookie.Value)
		if err != nil {
			fa.logger.Debug("Invalid session", zap.String("sessionID", cookie.Value), zap.Error(err))
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Get user information from Firebase
		userRecord, err := fa.authClient.GetUser(ctx, userID)
		if err != nil {
			fa.logger.Error("Failed to get user record", zap.String("uid", userID), zap.Error(err))
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Set user info in context
		userInfo := &UserInfo{
			UID:           userRecord.UID,
			Email:         userRecord.Email,
			DisplayName:   userRecord.DisplayName,
			PhotoURL:      userRecord.PhotoURL,
			EmailVerified: userRecord.EmailVerified,
		}

		ctx = context.WithValue(ctx, "user", userInfo)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// OptionalAuthMiddleware is a middleware that attaches user info if authenticated, but doesn't require it
func (fa *FirebaseAuth) OptionalAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// Try to get session cookie
		cookie, err := r.Cookie("session_id")
		if err != nil {
			// No cookie, continue without auth
			next.ServeHTTP(w, r)
			return
		}

		// Try to get user ID from session store
		userID, err := fa.sessionStore.Get(ctx, cookie.Value)
		if err != nil {
			// Invalid session, continue without auth
			next.ServeHTTP(w, r)
			return
		}

		// Get user information from Firebase
		userRecord, err := fa.authClient.GetUser(ctx, userID)
		if err != nil {
			// Failed to get user, continue without auth
			next.ServeHTTP(w, r)
			return
		}

		// Set user info in context
		userInfo := &UserInfo{
			UID:           userRecord.UID,
			Email:         userRecord.Email,
			DisplayName:   userRecord.DisplayName,
			PhotoURL:      userRecord.PhotoURL,
			EmailVerified: userRecord.EmailVerified,
		}

		ctx = context.WithValue(ctx, "user", userInfo)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
