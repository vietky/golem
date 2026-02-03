# Firebase Authentication Implementation - Summary

## What was implemented

Firebase Authentication with Google OAuth has been successfully integrated into the Century: Golem Edition game server. This provides secure user authentication, session management, and cross-device reconnection support.

## Changes Made

### 1. New Packages Created

- **`internal/auth/firebase.go`**: Firebase Admin SDK integration
  - `FirebaseAuth` struct manages authentication
  - Handles Google OAuth flow (initiation, callback, verification)
  - Session creation and validation
  - User profile management
  - Two middleware types: `AuthMiddleware` (required) and `OptionalAuthMiddleware` (optional)

- **`internal/auth/redis_store.go`**: Redis-based session storage
  - Implements `SessionStore` interface
  - Stores session ID → Firebase UID mapping
  - Configurable session expiration (default 7 days)

- **`internal/auth/utils.go`**: Helper functions
  - Random state generation for CSRF protection
  - Session ID generation

- **`internal/auth/auth_test.go`**: Unit tests for auth utilities

### 2. Configuration Updates

**`internal/config/config.go`**:
- Added Firebase configuration fields:
  - `FirebaseCredentialsFile`: Path to service account JSON
  - `GoogleOAuthClientID`: OAuth 2.0 client ID
  - `GoogleOAuthClientSecret`: OAuth 2.0 client secret
  - `GoogleOAuthRedirectURL`: Callback URL
  - `SessionCookieDomain`: Domain for SSO cookies

### 3. Server Updates

**`internal/server/server.go`**:
- Added `FirebaseAuth` field to `GameServer` struct
- Updated `NewGameServerRequest` to accept `FirebaseAuth`

**`internal/server/handlers.go`**:
- Updated `HandleWebSocketV2` to check authentication for players
- Uses Firebase UID as `clientID` for authenticated users (enables cross-device reconnection)
- Spectators can still connect without authentication
- Updated `HandleCreateSession` to require authentication

**`cmd/server/main.go`**:
- Initialize Firebase Auth and Redis session store
- Wire up authentication endpoints:
  - `GET /auth/google` - Initiate OAuth
  - `GET /auth/google/callback` - OAuth callback
  - `GET /auth/logout` - Logout
  - `GET /auth/profile` - Get user profile
  - `POST /auth/profile/update` - Update profile
- Apply middleware to protected endpoints:
  - `POST /api/create` - Create game (requires auth)
  - `POST /api/single` - Create single-player (requires auth)
  - `POST /api/join` - Join game (requires auth)
  - `WebSocket /ws` - Join as player (requires auth)
- Public endpoints remain unauthenticated:
  - `GET /api/list` - List sessions
  - `WebSocket /ws?spectate=true` - Spectator mode

### 4. Deployment Configuration

**`deployment/base/firebase-auth.yaml`**:
- Kubernetes Secret for OAuth credentials
- ConfigMap for auth configuration (redirect URL, cookie domain)
- Secret for Firebase service account JSON (base64 encoded)

**`deployment/base/golem-app/deployment.yaml`**:
- Added volume mount for Firebase credentials
- Added environment variables from ConfigMap and Secrets

**`deployment/base/kustomization.yaml`**:
- Added `firebase-auth.yaml` to resources

**`scripts/setup-firebase-secrets.sh`**:
- Helper script to generate Kubernetes secrets from local `secrets/` folder
- Reads `secrets/firebase-credentials.json` and `secrets/firebase-oauth.env`
- Creates base64-encoded secrets

**`Makefile`**:
- Added `firebase-setup` target to generate secrets
- Added `firebase-deploy` target to deploy secrets to k3s

### 5. Documentation

**`docs/FIREBASE_AUTHENTICATION.md`**:
- Comprehensive guide covering:
  - Architecture and authentication flow
  - API endpoints
  - Configuration setup
  - Firebase project setup instructions
  - Deployment guide (local and k3s)
  - Cross-device reconnection details
  - Security considerations
  - Troubleshooting guide
  - Future enhancements

## Key Features

### 1. Google OAuth Authentication
- Secure login using Google accounts
- CSRF protection with state parameter
- ID token verification via Firebase Admin SDK

### 2. Session Management
- Redis-backed session storage
- 7-day session expiration (configurable)
- HttpOnly, Secure, SameSite cookies
- SSO support across subdomains

### 3. Cross-Device Reconnection
- Authenticated users use Firebase UID as `clientID`
- Can reconnect to games from any device after logging in
- Same Google account = same player across devices

### 4. Flexible Authentication
- **Required for**: Creating games, joining as player
- **Optional for**: Spectating games
- Graceful degradation: Server runs without auth if not configured

### 5. User Profile Management
- Get user profile (UID, email, display name, photo)
- Update display name and photo URL

## Testing

All existing tests pass:
```bash
$ go test ./... -short
ok      golem_century/internal/auth     2.414s
ok      golem_century/internal/eventstore       0.950s
ok      golem_century/internal/game     2.085s
ok      golem_century/internal/server   1.731s
ok      golem_century/internal/session  20.567s
ok      golem_century/internal/telegram 1.663s
```

## Dependencies Added

- `firebase.google.com/go/v4` - Firebase Admin SDK
- `firebase.google.com/go/v4/auth` - Firebase Auth
- `google.golang.org/api/option` - Google API options
- `golang.org/x/oauth2` - OAuth 2.0 client
- `golang.org/x/oauth2/google` - Google OAuth endpoints
- `cloud.google.com/go/firestore` - Firestore (dependency)
- `github.com/redis/go-redis/v9` - Redis client

## Deployment Instructions

### 1. Local Development (Optional Auth)

```bash
# Without auth - server runs normally
go run ./cmd/server

# With auth - set up secrets first
mkdir -p secrets
# Add firebase-credentials.json and firebase-oauth.env
export FIREBASE_CREDENTIALS_FILE=./secrets/firebase-credentials.json
source ./secrets/firebase-oauth.env
go run ./cmd/server
```

### 2. Kubernetes (k3s) Deployment

```bash
# 1. Add credentials to secrets/ folder
# - secrets/firebase-credentials.json
# - secrets/firebase-oauth.env

# 2. Generate Kubernetes secrets
make firebase-setup

# 3. Deploy secrets to k3s
make firebase-deploy

# 4. Deploy application
make k3s-deploy
```

## Security Considerations

1. ✅ **HTTPS Required**: Session cookies use Secure flag
2. ✅ **CSRF Protection**: OAuth state parameter prevents attacks
3. ✅ **HttpOnly Cookies**: Not accessible via JavaScript
4. ✅ **SameSite Protection**: Cookies use SameSite=Lax
5. ✅ **Token Verification**: All ID tokens verified with Firebase
6. ✅ **Session Expiration**: 7-day default expiration
7. ✅ **Secrets Management**: Credentials stored in Kubernetes Secrets

## Backward Compatibility

- Server runs without authentication if Firebase is not configured
- Spectator mode still works without auth
- All existing features remain functional
- No breaking changes to WebSocket protocol

## Files Changed/Created

### Created (8 files)
- `internal/auth/firebase.go`
- `internal/auth/redis_store.go`
- `internal/auth/utils.go`
- `internal/auth/auth_test.go`
- `deployment/base/firebase-auth.yaml`
- `scripts/setup-firebase-secrets.sh`
- `docs/FIREBASE_AUTHENTICATION.md`
- `docs/FIREBASE_IMPLEMENTATION_SUMMARY.md` (this file)

### Modified (9 files)
- `internal/config/config.go` - Added Firebase config fields
- `internal/server/server.go` - Added FirebaseAuth field
- `internal/server/handlers.go` - Added auth checks
- `cmd/server/main.go` - Initialize auth, wire endpoints
- `deployment/base/golem-app/deployment.yaml` - Mount credentials
- `deployment/base/kustomization.yaml` - Include firebase-auth.yaml
- `Makefile` - Added firebase-setup, firebase-deploy targets
- `go.mod` - Added Firebase dependencies
- `go.sum` - Dependency checksums

## Next Steps

1. **Frontend Integration**: Update React frontend to support login flow
2. **Testing**: Add integration tests for auth endpoints
3. **Admin Dashboard**: Create admin interface for user management
4. **Analytics**: Track user activity and engagement
5. **Extended Features**: Email/password auth, 2FA, profile customization

## Success Criteria ✅

- [x] Firebase Admin SDK integrated
- [x] Google OAuth flow implemented
- [x] Session management with Redis
- [x] Cross-device reconnection support
- [x] Authentication middleware created
- [x] Protected endpoints secured
- [x] Spectator mode remains open
- [x] Deployment configuration updated
- [x] Documentation created
- [x] All tests passing
- [x] Build successful

The Firebase authentication implementation is complete and ready for deployment!
