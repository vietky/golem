# Firebase Authentication - Quick Start Guide

## Setup (One-time)

### 1. Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create/select project
3. Enable Google Sign-in (Authentication → Sign-in method)
4. Download service account:
   - Project Settings → Service Accounts
   - Generate New Private Key
   - Save as `secrets/firebase-credentials.json`

### 2. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add redirect URI: `https://game.anhtran.dev/auth/google/callback`
5. Create `secrets/firebase-oauth.env`:

```bash
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-secret
```

### 3. Local Development (Optional)

```bash
# Run without auth
go run ./cmd/server

# Run with auth
export FIREBASE_CREDENTIALS_FILE=./secrets/firebase-credentials.json
source ./secrets/firebase-oauth.env
export GOOGLE_OAUTH_REDIRECT_URL=http://localhost:8080/auth/google/callback
export SESSION_COOKIE_DOMAIN=""
go run ./cmd/server
```

### 4. Deploy to k3s

```bash
# 1. Setup secrets
make firebase-setup

# 2. Deploy secrets
make firebase-deploy

# 3. Deploy application
make k3s-deploy
```

## Usage

### Authentication Flow

1. **Login**: Navigate to `GET /auth/google`
2. **Authorize**: Login with Google account
3. **Callback**: Redirected to `GET /auth/google/callback`
4. **Session**: Cookie set, redirect to homepage
5. **Use**: Session cookie automatically sent with requests

### API Endpoints

**Public** (no login required):
- `GET /health` - Health check
- `GET /api/list` - List games
- `WebSocket /ws?spectate=true` - Watch games

**Protected** (login required):
- `POST /api/create` - Create game
- `POST /api/single` - Single player
- `POST /api/join` - Join game
- `WebSocket /ws` - Play game
- `GET /auth/profile` - Get profile
- `POST /auth/profile/update` - Update profile

**Auth**:
- `GET /auth/google` - Login
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/logout` - Logout

### cURL Examples

```bash
# Try creating game without auth (fails)
curl -X POST http://localhost:8080/api/create \
  -H "Content-Type: application/json" \
  -d '{"numPlayers": 2}'
# Response: {"error":"Unauthorized","status":"error"}

# Login via browser first, then:
curl -X POST http://localhost:8080/api/create \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=YOUR_SESSION_ID" \
  -d '{"numPlayers": 2}'
# Response: {"sessionID":"session_...","numPlayers":2}

# Get profile
curl http://localhost:8080/auth/profile \
  -H "Cookie: session_id=YOUR_SESSION_ID"
# Response: {"uid":"...","email":"...","display_name":"..."}

# Logout
curl http://localhost:8080/auth/logout \
  -H "Cookie: session_id=YOUR_SESSION_ID"
# Response: {"status":"success","message":"Logged out successfully"}
```

### WebSocket Examples

```bash
# Join as player (requires auth)
# Get session cookie from browser first
wscat -c "ws://localhost:8080/ws?session=SESSION_ID&name=Player1&clientID=YOUR_UID"

# Join as spectator (no auth)
wscat -c "ws://localhost:8080/ws?session=SESSION_ID&name=Spectator&spectate=true"
```

## Cross-Device Reconnection

1. Login on Device A with Google account
2. Join a game
3. Close browser/switch to Device B
4. Login on Device B with **same Google account**
5. Join same game session
6. System recognizes you by Firebase UID and reconnects you

**Key**: Must use same Google account on both devices.

## Troubleshooting

### Server won't start with auth enabled

**Check**:
- `FIREBASE_CREDENTIALS_FILE` points to valid JSON
- Redis is running (`docker-compose up -d redis` or k3s redis pod)
- OAuth credentials are correct

**Logs**:
```bash
# Look for:
INFO  Firebase authentication initialized successfully
# Or:
WARN  Failed to initialize Firebase auth - auth disabled
```

### Can't login / OAuth error

**Check**:
- Redirect URI matches in Google Cloud Console
- `GOOGLE_OAUTH_REDIRECT_URL` is correct
- Cookies are enabled in browser
- Using HTTPS in production

### Cross-device reconnection not working

**Check**:
- Same Google account on both devices
- Session hasn't expired (7 days)
- Redis is running and persisting data
- Check logs for "Player reconnected" message

### Session cookie not set

**Check**:
- `SESSION_COOKIE_DOMAIN` matches your domain
- HTTPS in production (cookie has Secure flag)
- No browser extensions blocking cookies

## Environment Variables Reference

```bash
# Firebase
FIREBASE_CREDENTIALS_FILE=/path/to/firebase-credentials.json
GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=xxx
GOOGLE_OAUTH_REDIRECT_URL=https://game.anhtran.dev/auth/google/callback
SESSION_COOKIE_DOMAIN=.anhtran.dev

# Redis (session storage)
REDIS_ADDR=localhost:6379
REDIS_DB=0
```

## Testing Checklist

- [ ] Login with Google works
- [ ] Session cookie is set after login
- [ ] Can create game after login
- [ ] Can join game after login
- [ ] Can't create game without login
- [ ] Can spectate without login
- [ ] Logout clears cookie
- [ ] Cross-device reconnection works
- [ ] Profile endpoint returns user data
- [ ] Profile update persists changes

## Quick Commands

```bash
# Setup Firebase secrets
make firebase-setup

# Deploy secrets to k3s
make firebase-deploy

# Deploy full stack
make k3s-deploy

# Check deployment
make k3s-status

# View logs
make k3s-logs

# Local dev with auth
export FIREBASE_CREDENTIALS_FILE=./secrets/firebase-credentials.json
source ./secrets/firebase-oauth.env
go run ./cmd/server

# Test auth endpoints
curl http://localhost:8080/auth/google  # Redirects to Google
curl http://localhost:8080/auth/logout  # Logout
```

## Support

For detailed information, see:
- [docs/FIREBASE_AUTHENTICATION.md](FIREBASE_AUTHENTICATION.md) - Full documentation
- [docs/FIREBASE_IMPLEMENTATION_SUMMARY.md](FIREBASE_IMPLEMENTATION_SUMMARY.md) - Implementation details
