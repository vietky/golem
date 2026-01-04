# Firebase Authentication Implementation

## Overview

Century: Golem Edition now supports Google OAuth authentication via Firebase. This ensures only authenticated users can join games, and only users registered in a game session can reconnect to that specific session.

## Architecture

### Authentication Flow

```
1. User → Firebase Google Sign-In → ID Token
2. Frontend → WebSocket Connection (with ID token) → Backend
3. Backend → Firebase Admin SDK → Verify Token → User ID
4. Backend → Firestore → Check Session Membership → Allow/Deny
```

### Security Features

1. **Token Verification**: All WebSocket connections verify Firebase ID tokens
2. **Session Authorization**: Users can only join sessions they're registered in
3. **User-Based Reconnection**: Reconnection uses Firebase user ID, not device ID
4. **Automatic Token Refresh**: Frontend refreshes tokens every 50 minutes (tokens expire after 1 hour)

## Configuration

### Firebase Console Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Google Sign-In:
   - Go to Authentication → Sign-in method
   - Enable Google provider
3. Create a web app:
   - Project Settings → General → Your apps
   - Add a web app
   - Copy the config values
4. Generate service account key:
   - Project Settings → Service Accounts
   - Generate new private key
   - Download JSON file as `firebase-service-account.json`

### Backend Configuration

Create `.env` file in project root:

```bash
# Firebase Authentication
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
```

Place the downloaded service account JSON file in the project root as `firebase-service-account.json`.

### Frontend Configuration

Create `web/react-frontend/.env` file:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Backend Implementation

### Firebase Client

Location: `internal/firebase/client.go`

```go
// Initialize Firebase
client, err := firebase.Initialize(ctx, credentialsPath, projectID)

// Verify ID token
userID, err := client.VerifyIDToken(ctx, idToken)

// Get user info
userInfo, err := client.GetUser(ctx, userID)
```

### Session Management

Location: `internal/firebase/session.go`

```go
// Create session in Firestore
err := client.CreateSession(ctx, sessionID, maxPlayers)

// Add user to session
err := client.AddSessionMember(ctx, sessionID, userID, playerID)

// Check if user can join
isAllowed, playerID, err := client.IsUserInSession(ctx, sessionID, userID)

// Update session status
err := client.UpdateSessionStatus(ctx, sessionID, "in_progress")
```

### WebSocket Handler

Location: `internal/server/handlers.go`

The `HandleWebSocketV2` function now:

1. Extracts Firebase ID token from query parameters
2. Verifies the token with Firebase Admin SDK
3. Checks if user is registered in the requested session
4. Retrieves the user's assigned player ID from Firestore
5. Allows or denies connection based on authorization

```go
// Extract token
idToken := r.URL.Query().Get("token")

// Verify and get user ID
userID, err := gs.FirebaseClient.VerifyIDToken(r.Context(), idToken)

// Check session membership
isAllowed, playerID, err := gs.FirebaseClient.IsUserInSession(
    r.Context(), sessionID, userID,
)
```

## Frontend Implementation

### Firebase Configuration

Location: `web/react-frontend/src/config/firebase.js`

Initializes Firebase app with configuration from environment variables.

### Authentication Context

Location: `web/react-frontend/src/contexts/AuthContext.jsx`

Provides:
- `user`: Current authenticated user object
- `idToken`: Firebase ID token for backend authentication
- `loading`: Authentication state loading indicator
- `signInWithGoogle()`: Sign in with Google popup
- `signOut()`: Sign out current user

### Protected Routes

Location: `web/react-frontend/src/components/ProtectedRoute.jsx`

Wraps routes that require authentication. Redirects to login page if user is not authenticated.

### Login Page

Location: `web/react-frontend/src/components/LoginPage.jsx`

Simple Google Sign-In button with error handling.

### WebSocket Integration

Location: `web/react-frontend/src/store/gameStore.js`

Updated `connectWebSocket` function to accept and send ID token:

```javascript
const { idToken } = useAuth()
connectWebSocket(sessionId, playerName, playerAvatar, false, idToken)
```

## Firestore Data Structure

### Collections

#### `game_sessions`

```javascript
{
  sessionId: "abc123",
  createdAt: Timestamp,
  startedAt: Timestamp,
  endedAt: Timestamp,
  status: "waiting" | "in_progress" | "completed",
  members: {
    "user_id_1": 1,  // userID -> playerID mapping
    "user_id_2": 2
  },
  maxPlayers: 2
}
```

#### `session_members`

Document ID: `{sessionId}_{userID}`

```javascript
{
  userId: "firebase_user_id",
  sessionId: "abc123",
  playerId: 1,
  joinedAt: Timestamp,
  leftAt: Timestamp,
  isActive: true
}
```

## Security Considerations

### Token Verification

- ID tokens are verified on every WebSocket connection attempt
- Tokens are validated using Firebase Admin SDK (server-side verification)
- Invalid or expired tokens result in connection rejection

### Session Authorization

- Users can only join sessions they're explicitly registered in
- Session membership is tracked in Firestore
- Spectators don't require session membership (if spectate mode is enabled)

### Token Refresh

- Frontend automatically refreshes tokens every 50 minutes
- Token expiration is 1 hour (Firebase default)
- Refresh happens in the background without user interaction

## Backward Compatibility

Firebase authentication is **optional**. The system works without Firebase:

- If Firebase credentials are not provided, authentication is disabled
- All WebSocket connections are allowed (same as before)
- Useful for local development and testing

To disable authentication:
- Simply don't set `FIREBASE_PROJECT_ID` and `FIREBASE_CREDENTIALS_PATH` in backend `.env`
- Don't set Firebase config in frontend `.env`

## Error Handling

### Backend Errors

- `401 Unauthorized`: Invalid or missing Firebase token
- `403 Forbidden`: User not authorized for this session
- `500 Internal Server Error`: Firestore/Firebase service error

### Frontend Errors

- Connection errors are displayed as toast notifications
- Failed sign-in shows error message on login page
- Token refresh failures trigger re-authentication

## Testing

### Manual Testing

1. **Setup Firebase Project**:
   ```bash
   # Configure environment variables
   cp .env.example .env
   cp web/react-frontend/.env.example web/react-frontend/.env
   # Edit both files with your Firebase credentials
   ```

2. **Start Backend**:
   ```bash
   go run cmd/server/main.go
   ```

3. **Start Frontend**:
   ```bash
   cd web/react-frontend
   npm run dev
   ```

4. **Test Authentication Flow**:
   - Visit http://localhost:5173
   - Click "Sign in with Google"
   - After sign-in, you should see the game menu
   - Create a session and join as a player

5. **Test Reconnection**:
   - Join a game session
   - Close the browser tab
   - Reopen and try to rejoin the same session
   - You should be able to reconnect with your player ID

### Development Mode

For local development without Firebase:
- Don't set Firebase environment variables
- Server will start with authentication disabled
- All connections will be allowed (useful for testing game logic)

## Deployment

### Production Checklist

1. ✅ Set up Firebase project
2. ✅ Enable Google Sign-In
3. ✅ Download service account key
4. ✅ Set environment variables in production
5. ✅ Add `firebase-service-account.json` to `.gitignore`
6. ✅ Configure CORS in Firebase console for production domain
7. ✅ Set up Firestore security rules

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Game sessions - authenticated users can read, only server can write
    match /game_sessions/{sessionId} {
      allow read: if request.auth != null;
      allow write: if false; // Server-side only
    }
    
    // Session members - authenticated users can read their own membership
    match /session_members/{memberId} {
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      allow write: if false; // Server-side only
    }
  }
}
```

## Troubleshooting

### "Authentication required" error

- Check that Firebase credentials are properly set in `.env`
- Verify that the service account JSON file exists
- Check server logs for Firebase initialization errors

### "User not authorized for this session"

- User is trying to join a session they're not registered in
- This is expected behavior - only session members can join
- Create a new session or join one you're invited to

### Token verification failures

- Token may be expired (refresh by signing out and back in)
- Check that Firebase project ID matches in both frontend and backend config
- Verify that Google Sign-In is enabled in Firebase console

### Firestore connection issues

- Check that Firestore is enabled in Firebase console
- Verify service account has Firestore access
- Check network connectivity to Firestore

## Future Enhancements

Potential improvements for future iterations:

1. **Email/Password Authentication**: Add support for email/password sign-in
2. **Social Providers**: Add Facebook, Twitter, GitHub authentication
3. **Session Invites**: Allow users to invite others to sessions via email
4. **User Profiles**: Store additional user data (avatar, stats, preferences)
5. **Friend System**: Add friend lists and private games
6. **Leaderboards**: Track wins/losses in Firestore
7. **Matchmaking**: Automatic pairing of players based on skill level

## References

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK for Go](https://firebase.google.com/docs/admin/setup)
- [Cloud Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
