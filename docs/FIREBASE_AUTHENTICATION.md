# Firebase Authentication Implementation

## Overview

The application now supports Firebase Authentication with Google OAuth for secure user authentication and session management. This enables:

- **Authenticated players**: Users must log in with Google to create or join games
- **Cross-device reconnection**: Authenticated users can rejoin games from any device
- **SSO support**: Session cookies work across subdomains (e.g., game.anhtran.dev, admin.anhtran.dev)
- **Spectator mode**: Spectators can view games without authentication

## Architecture

### Components

1. **Firebase Admin SDK** (`internal/auth/firebase.go`)
   - Verifies Google OAuth ID tokens
   - Manages user profiles
   - Handles session creation/validation

2. **Redis Session Store** (`internal/auth/redis_store.go`)
   - Stores user sessions with configurable expiration (default 7 days)
   - Maps session IDs to Firebase UIDs

3. **Authentication Middleware**
   - `AuthMiddleware`: Requires authentication (for game creation/joining)
   - `OptionalAuthMiddleware`: Attaches user info if available (for WebSocket connections)

### Authentication Flow

```
1. User clicks "Login with Google"
   ↓
2. GET /auth/google
   - Generates OAuth state for CSRF protection
   - Redirects to Google OAuth consent page
   ↓
3. User authorizes on Google
   ↓
4. GET /auth/google/callback?code=...&state=...
   - Verifies state parameter
   - Exchanges code for tokens
   - Verifies ID token with Firebase
   - Creates session in Redis
   - Sets session cookie (HttpOnly, Secure, SameSite=Lax)
   - Redirects to homepage
   ↓
5. User interacts with authenticated endpoints
   - Session cookie automatically sent with requests
   - Middleware validates session and attaches user info to context
```

## API Endpoints

### Public Endpoints (No Authentication Required)

- `GET /health` - Health check
- `GET /api/list` - List active game sessions
- `GET /api/sessions/start` - Start a game session (after joining)
- `WebSocket /ws?spectate=true` - Join as spectator

### Authentication Endpoints

- `GET /auth/google` - Initiate Google OAuth login
- `GET /auth/google/callback` - OAuth callback handler
- `GET /auth/logout` - Clear session and logout
- `GET /auth/profile` - Get current user's profile (requires auth)
- `POST /auth/profile/update` - Update user profile (requires auth)

### Protected Endpoints (Authentication Required)

- `POST /api/create` - Create new game session
- `POST /api/single` - Create single-player game
- `POST /api/join` - Join existing game session
- `WebSocket /ws` - Join game as player

## Configuration

### Environment Variables

```bash
# Firebase Authentication
FIREBASE_CREDENTIALS_FILE=/path/to/firebase-credentials.json
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URL=https://game.anhtran.dev/auth/google/callback
SESSION_COOKIE_DOMAIN=.anhtran.dev

# Redis (for session storage)
REDIS_ADDR=localhost:6379
REDIS_DB=0
```

### Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use existing

2. **Enable Google Sign-In**
   - Navigate to Authentication → Sign-in method
   - Enable Google provider

3. **Download Service Account**
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `secrets/firebase-credentials.json`

4. **Set up OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URI: `https://game.anhtran.dev/auth/google/callback`
   - Save credentials to `secrets/firebase-oauth.env`:

```bash
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
```

## Deployment

### Local Development

```bash
# Set up secrets
mkdir -p secrets
# Add firebase-credentials.json and firebase-oauth.env to secrets/

# Export environment variables
export FIREBASE_CREDENTIALS_FILE=./secrets/firebase-credentials.json
source ./secrets/firebase-oauth.env

# Run server
go run ./cmd/server
```

### Kubernetes (k3s)

```bash
# 1. Set up secrets in secrets/ folder
./scripts/setup-firebase-secrets.sh

# 2. Deploy to k3s
make k3s-deploy
```

The deployment script will:
- Read credentials from `secrets/` folder
- Create Kubernetes Secrets and ConfigMaps
- Mount Firebase credentials as a volume in pods
- Configure environment variables

## Cross-Device Reconnection

Authenticated users can reconnect from any device:

1. User logs in on Device A and joins a game
2. User's Firebase UID is used as their `clientID`
3. User closes browser/switches devices
4. User logs in on Device B with the same Google account
5. When joining the same game session, the system recognizes the Firebase UID and reconnects the player

**Implementation**: In `HandleWebSocketV2`, authenticated users use their Firebase UID as `clientID`:

```go
if !spectateMode && gs.FirebaseAuth != nil {
    userInfo, ok := ctx.Value("user").(*auth.UserInfo)
    if ok {
        if clientID == "" {
            clientID = userInfo.UID
        }
    }
}
```

## Security Considerations

1. **HTTPS Only**: Session cookies have `Secure` flag, requiring HTTPS in production
2. **CSRF Protection**: OAuth flow uses state parameter to prevent CSRF attacks
3. **HttpOnly Cookies**: Session cookies are not accessible via JavaScript
4. **SameSite Protection**: Cookies use `SameSite=Lax` to prevent cross-site request forgery
5. **Token Verification**: All ID tokens are verified with Firebase before creating sessions
6. **Session Expiration**: Sessions expire after 7 days (configurable)

## Testing

### Manual Testing

1. **Authentication Flow**
```bash
# Start server
go run ./cmd/server

# Navigate to http://localhost:8080
# Click "Login with Google"
# Authorize with Google account
# Should redirect back to homepage with session
```

2. **Protected Endpoints**
```bash
# Try creating a game without auth (should fail)
curl -X POST http://localhost:8080/api/create \
  -H "Content-Type: application/json" \
  -d '{"numPlayers": 2}'

# Response: {"error":"Unauthorized","status":"error"}

# Login via browser, then use session cookie
curl -X POST http://localhost:8080/api/create \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=..." \
  -d '{"numPlayers": 2}'

# Response: {"sessionID":"session_...","numPlayers":2,"turnTimeout":60}
```

3. **Spectator Mode (No Auth)**
```bash
# Connect as spectator via WebSocket (no auth required)
wscat -c "ws://localhost:8080/ws?session=SESSION_ID&name=Spectator&spectate=true"
```

### Integration Tests

Integration tests should be added to verify:
- [ ] OAuth flow completes successfully
- [ ] Protected endpoints require authentication
- [ ] Spectator mode works without authentication
- [ ] Cross-device reconnection with same Firebase UID
- [ ] Session expiration and cleanup
- [ ] Profile updates persist correctly

## Troubleshooting

### "Failed to initialize Firebase auth - auth disabled"

**Cause**: Missing or invalid Firebase credentials

**Solution**:
1. Check `FIREBASE_CREDENTIALS_FILE` points to valid JSON
2. Verify service account has necessary permissions
3. Check logs for specific error message

### "Authentication required to join game"

**Cause**: User not logged in or session expired

**Solution**:
1. Navigate to `/auth/google` to login
2. Check if session cookie is set (browser dev tools)
3. Verify Redis is running and accessible

### "State mismatch" during OAuth callback

**Cause**: CSRF protection triggered (possible MITM attack or cookie issue)

**Solution**:
1. Ensure cookies are enabled in browser
2. Check that `SESSION_COOKIE_DOMAIN` matches your domain
3. Verify HTTPS is being used in production

### Cross-Device Reconnection Not Working

**Cause**: Different Firebase UIDs or session expired

**Solution**:
1. Verify user is logging in with same Google account on both devices
2. Check session hasn't expired (7 day default)
3. Verify Redis session data is persisting

## Future Enhancements

- [ ] Email/password authentication (in addition to Google OAuth)
- [ ] User profile customization (avatar upload, display name)
- [ ] Account linking (link multiple OAuth providers)
- [ ] Admin dashboard for user management
- [ ] Two-factor authentication (2FA)
- [ ] Rate limiting for auth endpoints
- [ ] User analytics and activity tracking
- [ ] Remember me functionality (extended session duration)
