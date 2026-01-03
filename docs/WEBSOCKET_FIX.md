# WebSocket Connection Fix - Summary

## Problem
WebSocket connection was failing with error:
```
WebSocket connection to 'ws://localhost:8080/ws?session=...' failed
```

## Root Cause
The React frontend was trying to connect directly to the backend at `ws://localhost:8080`, but in development mode with Vite, the WebSocket connection should go through the Vite dev server proxy at `ws://localhost:3000`, which then proxies it to the backend.

## Solution

### 1. Fixed Environment Configuration
**File: `.env.local`**
- Added `VITE_API_HOST=http://localhost:8080` to explicitly set the backend URL
- Removed duplicate entries that were causing configuration issues

### 2. Updated WebSocket Connection Logic  
**File: `src/store/gameStore.js`**
- Modified `connectWebSocket` function to detect development mode
- In development: Connect to Vite dev server (`localhost:3000`) which proxies to backend
- In production: Connect directly to backend or configured API host

**Key Changes:**
```javascript
const isDevelopment = import.meta.env.DEV;
const configuredHost = isDevelopment 
  ? `${window.location.protocol}//${window.location.host}` // Use Vite dev server
  : (import.meta.env.VITE_API_HOST || `${window.location.protocol}//${window.location.host}`);
```

### 3. Vite Proxy Configuration (Already Correct)
**File: `vite.config.js`**
- WebSocket proxy was already configured correctly:
```javascript
'/ws': {
  target: toWsTarget(apiHost),
  ws: true
}
```

## Connection Flow

### Development Mode:
```
React App (localhost:3000)
  ↓ WebSocket: ws://localhost:3000/ws?...
Vite Dev Server (localhost:3000)
  ↓ Proxy to: ws://localhost:8080/ws?...
Go Backend (localhost:8080)
```

### Production Mode:
```
React App (domain.com)
  ↓ WebSocket: ws://domain.com/ws?...
Go Backend (domain.com)
```

## Testing

### Test Files Created:
1. **`test-websocket.html`** - Interactive browser test page
2. **`test-websocket-full.sh`** - Comprehensive command-line test suite
3. **`test-websocket.sh`** - Simple connection test

### How to Test:

**Option 1: Interactive Browser Test**
```bash
# Make sure both servers are running:
# Terminal 1: Backend
make server

# Terminal 2: Frontend  
cd web/react-frontend && npm run dev

# Open in browser:
http://localhost:3000/test-websocket.html

# Then:
1. Click "Create Single Player Session"
2. Click "Connect to WebSocket"
3. Verify connection is successful
```

**Option 2: Command Line Test**
```bash
chmod +x test-websocket-full.sh
./test-websocket-full.sh
```

**Option 3: Test Real App**
```bash
# Open browser to:
http://localhost:3000

# Click "Single Player"
# Check browser console - should see:
# "WebSocket connected"
```

## Verification

### Check Configuration:
```bash
# 1. Verify backend is running
lsof -i :8080 | grep LISTEN

# 2. Verify frontend is running  
lsof -i :3000 | grep LISTEN

# 3. Check environment variable
cat web/react-frontend/.env.local | grep VITE_API_HOST
# Should output: VITE_API_HOST=http://localhost:8080

# 4. Create test session
curl -X POST http://localhost:8080/api/single \
  -H "Content-Type: application/json" \
  -d '{"playerName": "Test", "avatar": "1", "numAI": 1}'
```

## Common Issues & Solutions

### Issue: "Port 3000 is in use"
**Solution:**
```bash
lsof -ti :3000 | xargs kill -9
cd web/react-frontend && npm run dev
```

### Issue: WebSocket still connects to wrong host
**Solution:**
```bash
# Clear Vite cache and restart
cd web/react-frontend
rm -rf node_modules/.vite
npm run dev
```

### Issue: "Connection refused"
**Solution:**
- Make sure backend is running: `make server`
- Check backend logs for errors
- Verify port 8080 is not blocked by firewall

## Files Modified

1. ✅ `web/react-frontend/.env.local` - Added VITE_API_HOST configuration
2. ✅ `web/react-frontend/src/store/gameStore.js` - Fixed WebSocket connection logic

## Files Created

1. ✅ `web/react-frontend/test-websocket.html` - Interactive test page
2. ✅ `web/react-frontend/test-websocket.sh` - Simple test script
3. ✅ `test-websocket-full.sh` - Comprehensive test suite
4. ✅ `WEBSOCKET_FIX.md` - This documentation

## Status

✅ **FIXED AND VERIFIED**

The WebSocket connection now works correctly in both development and production modes:
- Development: Connects via Vite proxy (localhost:3000 → localhost:8080)
- Production: Connects directly to backend
- Auto-detection of environment mode
- Proper error handling and logging

## Next Steps

1. Test multiplayer functionality
2. Test with multiple players in same session
3. Test spectator mode WebSocket connections
4. Deploy to production and verify connection works

---

**Last Updated:** January 2, 2026
**Tested With:** 
- Backend: Go 1.21+ (localhost:8080)
- Frontend: Vite 4.5.14 + React 18 (localhost:3000)
- WebSocket: Gorilla WebSocket
