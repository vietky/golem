# Firebase Authentication - Setup Checklist

Use this checklist to set up Firebase authentication for your project.

## 🔧 Initial Setup

### 1. Firebase Console Setup
- [ ] Create Firebase project at https://console.firebase.google.com
- [ ] Enable Google Sign-In provider in Authentication
- [ ] Register web app and copy config
- [ ] Generate service account key (download JSON)
- [ ] Enable Firestore Database
- [ ] Configure Firestore security rules (optional for dev)

### 2. Backend Configuration
- [ ] Place service account JSON as `firebase-service-account.json` in project root
- [ ] Copy `.env.example` to `.env`
- [ ] Set `FIREBASE_PROJECT_ID` in `.env`
- [ ] Set `FIREBASE_CREDENTIALS_PATH` in `.env` (default: `./firebase-service-account.json`)
- [ ] Verify `firebase-service-account.json` is in `.gitignore`

### 3. Frontend Configuration
- [ ] Copy `web/react-frontend/.env.example` to `web/react-frontend/.env`
- [ ] Set `VITE_FIREBASE_API_KEY` from Firebase console
- [ ] Set `VITE_FIREBASE_AUTH_DOMAIN` from Firebase console
- [ ] Set `VITE_FIREBASE_PROJECT_ID` from Firebase console
- [ ] Set `VITE_FIREBASE_STORAGE_BUCKET` from Firebase console
- [ ] Set `VITE_FIREBASE_MESSAGING_SENDER_ID` from Firebase console
- [ ] Set `VITE_FIREBASE_APP_ID` from Firebase console

## ✅ Verification

### 4. Run Tests
- [ ] Run `./scripts/test-firebase-auth.sh`
- [ ] All tests should pass
- [ ] Backend builds without errors
- [ ] Frontend dependencies installed

### 5. Manual Testing
- [ ] Start backend: `go run cmd/server/main.go`
- [ ] Backend shows "Firebase initialized successfully" in logs
- [ ] Start frontend: `cd web/react-frontend && npm run dev`
- [ ] Open browser to `http://localhost:5173`
- [ ] See login page (not game menu)
- [ ] Click "Sign in with Google"
- [ ] Google popup appears
- [ ] Sign in with Google account
- [ ] Redirect to game menu after sign-in
- [ ] See user profile with avatar and email
- [ ] Create a game session
- [ ] Join the session
- [ ] WebSocket connection succeeds
- [ ] See "Firebase authentication successful" in backend logs

### 6. Reconnection Testing
- [ ] Join a game session while authenticated
- [ ] Note your player ID
- [ ] Close browser tab
- [ ] Reopen `http://localhost:5173`
- [ ] Still logged in (session persists)
- [ ] Rejoin same session
- [ ] Retain same player ID
- [ ] Game state restored

### 7. Sign Out Testing
- [ ] Click "Sign Out" button in user profile
- [ ] Redirect to login page
- [ ] Try to access `http://localhost:5173` directly
- [ ] Should redirect to login page
- [ ] Sign in again with different Google account
- [ ] Try to join previous session
- [ ] Should be denied (not a member)

## 📋 Production Deployment

### 8. Production Checklist
- [ ] Set Firebase environment variables on production server
- [ ] Copy service account JSON to production server
- [ ] Update Firestore security rules for production
- [ ] Add production domain to Firebase authorized domains
- [ ] Use HTTPS for production deployment
- [ ] Test authentication in production environment
- [ ] Monitor Firebase Console for auth events
- [ ] Set up error monitoring/logging

### 9. Security Review
- [ ] Firestore security rules prevent client writes
- [ ] Service account JSON not committed to git
- [ ] Environment variables not committed to git
- [ ] HTTPS enabled in production
- [ ] CORS configured correctly
- [ ] Token expiration handled properly

## 📚 Documentation Review

### 10. Documentation
- [ ] Read [FIREBASE_AUTH.md](./FIREBASE_AUTH.md)
- [ ] Read [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
- [ ] Understand authentication flow
- [ ] Know how to debug auth issues
- [ ] Understand Firestore data structure

## 🐛 Troubleshooting

If tests fail or authentication doesn't work:

1. **Backend won't start**
   - Check service account JSON exists
   - Verify project ID matches
   - Check for syntax errors in .env

2. **Frontend can't sign in**
   - Check Firebase config in frontend .env
   - Verify authorized domains in Firebase Console
   - Check browser console for errors

3. **WebSocket connection rejected**
   - Check ID token is being sent
   - Verify backend logs for verification errors
   - Ensure user is in session members

4. **Token verification fails**
   - Check system time is correct
   - Verify service account has correct permissions
   - Check for network connectivity issues

## ✨ Optional Enhancements

### 11. Future Features (Not Required)
- [ ] Add email/password authentication
- [ ] Add other OAuth providers
- [ ] Implement session invite system
- [ ] Add user profiles and stats
- [ ] Build friend system
- [ ] Create leaderboards
- [ ] Add matchmaking

## 🎉 Completion

When all items are checked:
- [ ] Firebase authentication is fully configured
- [ ] All tests pass
- [ ] Manual testing successful
- [ ] Ready for production deployment
- [ ] Team trained on authentication system

---

**Need Help?**
- See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed setup instructions
- See [FIREBASE_AUTH.md](./FIREBASE_AUTH.md) for architecture documentation
- Check Firebase Console for error logs
- Review backend/frontend console logs
