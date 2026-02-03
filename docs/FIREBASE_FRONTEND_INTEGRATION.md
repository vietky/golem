# Firebase Authentication Frontend Integration

## Overview
This document describes the React frontend integration for Firebase authentication in the Century: Golem Edition game.

## Components Created

### 1. AuthContext (`src/contexts/AuthContext.jsx`)
Central authentication state management using React Context API.

**Features:**
- Checks authentication status on mount
- Provides `user`, `isAuthenticated`, `authLoading` state
- Implements `login()`, `logout()`, `updateProfile()` functions
- Automatically redirects to Google OAuth flow
- Fetches user profile from backend `/auth/profile`

**Usage:**
```javascript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, authLoading, login, logout } = useAuth();
  
  if (authLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <button onClick={login}>Login</button>;
  
  return <div>Welcome {user.display_name}!</div>;
}
```

### 2. LoginButton (`src/components/LoginButton.jsx`)
Reusable login/logout button with user profile display.

**Features:**
- Shows "Sign in with Google" button when logged out
- Displays user avatar, name, email when logged in
- Includes logout button for authenticated users
- Google branding with logo
- Responsive Tailwind CSS styling

### 3. Lobby Integration (`src/components/Lobby.jsx`)
Main lobby component with authentication checks.

**Changes Made:**
1. **Import Auth Hooks:** Added `useAuth` and `LoginButton`
2. **State Management:**
   - `authLoading`: Shows loading state during auth check
   - `authError`: Displays authentication error messages
   - Auto-populate `playerName` from user profile
3. **Auth Checks:**
   - `createGame()`: Requires authentication, sets error if not logged in
   - `joinGame()`: Requires auth for players, allows spectators without auth
4. **UI Elements:**
   - Auth status section with LoginButton
   - Error message display (red box)
   - Warning for unauthenticated users (yellow box)

## Authentication Flow

### Login Flow
1. User clicks "Sign in with Google" button
2. Frontend calls `login()` from AuthContext
3. Redirects to `/auth/google` backend endpoint
4. Backend redirects to Google OAuth
5. Google redirects back to `/auth/google/callback`
6. Backend verifies token, creates session, sets HttpOnly cookie
7. Backend redirects to frontend
8. Frontend checks `/auth/profile` to get user data
9. AuthContext updates state with user info

### Create Game Flow (Protected)
1. User enters game details
2. Clicks "Create Room" button
3. Lobby checks `isAuthenticated`
4. If not authenticated: Show error "Please login to create a game"
5. If authenticated: POST to `/api/create` with `credentials: 'include'`
6. Backend verifies session cookie
7. Returns session ID on success or 401 on auth failure

### Join Game Flow (Conditional)
1. User clicks "Join" or "Spectate" button
2. Lobby checks if joining as spectator
3. **As Player:** Requires authentication
   - Not logged in: Show error "Please login to join a game as a player"
   - Logged in: Use `playerName` from state (auto-filled from profile)
4. **As Spectator:** No authentication required
   - Generate random name using `generatePlayerName()`
   - Join with `asSpectator=true` flag

### Logout Flow
1. User clicks logout button in LoginButton
2. Frontend calls `logout()` from AuthContext
3. POST to `/auth/logout` with `credentials: 'include'`
4. Backend deletes session from Redis
5. Backend clears session cookie
6. AuthContext updates state (user=null, isAuthenticated=false)

## API Integration

All authenticated requests must include `credentials: 'include'` to send HttpOnly cookies:

```javascript
const response = await apiFetch("/api/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include", // IMPORTANT: Send session cookie
  body: JSON.stringify(data),
});

if (response.status === 401) {
  // Handle authentication error
  setAuthError("Please login to continue");
}
```

## Error Handling

### Authentication Errors
- **401 Unauthorized:** User session expired or invalid
  - Display: "Please login to create/join a game"
  - Action: Clear auth state, show login button
  
- **Network Errors:** Failed to reach backend
  - Display: "Failed to create game. Please try again."
  - Action: Keep user logged in, allow retry

### UI Error States
1. **AuthLoading:** Show "Loading authentication..." message
2. **AuthError:** Red box with error message
3. **Not Authenticated:** Yellow warning box with instructions

## Responsive Design

The auth UI is responsive across all screen sizes:

```jsx
<div className="col-span-full space-y-3">
  <LoginButton /> {/* Full width on mobile */}
  
  {authError && (
    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
      {authError}
    </div>
  )}
  
  {!isAuthenticated && (
    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
      <p className="font-semibold mb-1">Login Required</p>
      <p>You need to login to create or join as a player...</p>
    </div>
  )}
</div>
```

## Configuration

### Environment Variables
Frontend uses backend API URL from `vite.config.js`:

```javascript
// vite.config.js
export default defineConfig({
  // Backend API base URL
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/auth': 'http://localhost:8080',
    }
  }
});
```

### Production Configuration
- Backend: `https://game.anhtran.dev/api/golem`
- WebSocket: `wss://game.anhtran.dev/ws`
- Auth endpoints: `https://game.anhtran.dev/auth/*`
- Cookie domain: `.anhtran.dev` (enables SSO across subdomains)

## Security Considerations

1. **HttpOnly Cookies:** Session cookies are HttpOnly to prevent XSS attacks
2. **CORS:** Backend must allow credentials from frontend origin
3. **CSRF:** Session cookies include SameSite=Lax protection
4. **Token Expiration:** Sessions expire after 7 days (backend config)
5. **Secure Flag:** Cookies use Secure flag in production (HTTPS only)

## Testing

### Manual Testing Steps
1. **Unauthenticated User:**
   - Visit lobby page
   - See yellow warning box
   - Click "Sign in with Google"
   - Complete Google OAuth
   - See user name/avatar in LoginButton
   - Warning box disappears

2. **Create Game:**
   - Without login: See error message
   - After login: Successfully create game
   - Session ID appears

3. **Join Game:**
   - As player without login: See error
   - As spectator: No error, uses random name
   - As player after login: Uses profile name

4. **Logout:**
   - Click logout button
   - User info disappears
   - Login button reappears
   - Create/Join shows errors again

5. **Session Persistence:**
   - Login and refresh page
   - User should still be logged in (cookie persists)
   - Close browser and reopen
   - User should remain logged in (7-day expiry)

## Future Enhancements

1. **Profile Customization:**
   - Allow users to update display name
   - Upload custom avatar
   - Change email preferences

2. **Social Features:**
   - Friend lists
   - Game history
   - Leaderboards

3. **Additional Auth Providers:**
   - GitHub OAuth
   - Facebook Login
   - Email/Password auth

4. **Session Management:**
   - View active sessions
   - Remote logout from all devices
   - Security notifications

## Troubleshooting

### Common Issues

**Problem:** Login button doesn't work
- Check browser console for errors
- Verify backend is running on correct port
- Check CORS configuration

**Problem:** User keeps getting logged out
- Check cookie settings in browser
- Verify Redis is running (session storage)
- Check session expiration time in backend config

**Problem:** Can't create game after login
- Check network tab for 401 responses
- Verify `credentials: 'include'` in fetch call
- Check backend logs for auth middleware errors

**Problem:** Spectators can't join
- Verify `asSpectator=true` is passed correctly
- Check WebSocket connection includes `spectate` param
- Backend should not require auth for spectators

## Related Documentation
- [Backend Firebase Implementation](./FIREBASE_AUTHENTICATION.md)
- [Quick Start Guide](./FIREBASE_QUICK_START.md)
- [Deployment Configuration](./K3S_DEPLOYMENT_QUICK_REFERENCE.md)
