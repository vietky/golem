# Quick Setup Guide - Firebase Authentication

This is a step-by-step guide to set up Google OAuth authentication for development.

## Prerequisites

- Google account
- Firebase project (free tier is sufficient)

## Setup Steps

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "golem-century-dev")
4. Disable Google Analytics (optional for development)
5. Click "Create project"

### 2. Enable Google Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click "Get started"
3. Click **Sign-in method** tab
4. Click **Google** provider
5. Click the **Enable** toggle
6. Select your support email
7. Click "Save"

### 3. Register Web App

1. In Firebase Console project overview, click the **</>** (Web) icon
2. Enter app nickname: "Golem Frontend"
3. Click "Register app"
4. Copy the config object (you'll need this for step 5)
5. Click "Continue to console"

### 4. Generate Service Account Key

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Go to **Service accounts** tab
3. Click **Generate new private key**
4. Click "Generate key" in the popup
5. Save the downloaded JSON file

### 5. Configure Backend

1. Move the downloaded JSON file to project root:
   ```bash
   mv ~/Downloads/your-project-firebase-adminsdk-xxxxx-xxxxxxxxxx.json firebase-service-account.json
   ```

2. Create `.env` file in project root:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and set Firebase variables:
   ```bash
   # Replace with your Firebase project ID
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
   ```

### 6. Configure Frontend

1. Create `.env` file in `web/react-frontend/`:
   ```bash
   cd web/react-frontend
   cp .env.example .env
   ```

2. Edit `web/react-frontend/.env` with your Firebase config from step 3:
   ```bash
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
   
   # Backend URL (default for local development)
   VITE_API_URL=http://localhost:8080
   VITE_WS_URL=ws://localhost:8080
   ```

### 7. Enable Firestore

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click "Create database"
3. Select **Start in test mode** (for development)
4. Choose a Cloud Firestore location (closest to you)
5. Click "Enable"

### 8. Configure Firestore Security Rules (Optional but Recommended)

1. In Firestore Database, go to **Rules** tab
2. Replace the rules with:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow authenticated users to read their session data
       match /game_sessions/{sessionId} {
         allow read: if request.auth != null;
         allow write: if false;
       }
       
       match /session_members/{memberId} {
         allow read: if request.auth != null && 
                        resource.data.userId == request.auth.uid;
         allow write: if false;
       }
     }
   }
   ```
3. Click "Publish"

### 9. Test the Setup

1. Run the test script:
   ```bash
   ./scripts/test-firebase-auth.sh
   ```

2. Start the backend:
   ```bash
   go run cmd/server/main.go
   ```

3. Start the frontend (in another terminal):
   ```bash
   cd web/react-frontend
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`
5. Click "Sign in with Google"
6. Authenticate with your Google account
7. You should see the game menu with your profile

## Troubleshooting

### "Failed to initialize Firebase" in backend logs

- Check that `firebase-service-account.json` exists in project root
- Verify `FIREBASE_PROJECT_ID` matches your Firebase project ID
- Ensure the service account JSON is valid (not corrupted)

### "Invalid authentication token" when connecting

- Clear browser cache and cookies
- Sign out and sign in again
- Check that Firebase config is correct in frontend `.env`
- Verify that your IP is not blocked by Firebase

### "Authentication required" but Firebase is not configured

- Firebase authentication is optional
- To disable auth, remove Firebase env vars from `.env` files
- Server will work without authentication for local development

### Firestore permission denied errors

- Ensure Firestore security rules are in test mode for development
- Check that the service account has Firestore permissions
- Verify you're authenticated in the frontend

## Development Workflow

### With Authentication (Recommended)

```bash
# Terminal 1 - Backend
go run cmd/server/main.go

# Terminal 2 - Frontend
cd web/react-frontend && npm run dev
```

Access at `http://localhost:5173`, sign in required.

### Without Authentication (Quick Testing)

```bash
# Remove or comment out Firebase config in .env files
# Terminal 1 - Backend
go run cmd/server/main.go

# Terminal 2 - Frontend  
cd web/react-frontend && npm run dev
```

Access at `http://localhost:5173`, no sign in required.

## Next Steps

- See [FIREBASE_AUTH.md](./FIREBASE_AUTH.md) for detailed architecture documentation
- Review [Firestore data structure](./FIREBASE_AUTH.md#firestore-data-structure)
- Learn about [security considerations](./FIREBASE_AUTH.md#security-considerations)
- Explore [future enhancements](./FIREBASE_AUTH.md#future-enhancements)

## Common Development Tasks

### Reset test data

```bash
# In Firestore Console, delete collections:
# - game_sessions
# - session_members
```

### Add test users

Just sign in with different Google accounts through the frontend.

### View authentication logs

Backend logs include:
- Firebase initialization status
- Token verification results
- Session membership checks
- User authentication events

### Debug authentication issues

1. Check browser console for frontend errors
2. Check server logs for backend errors
3. Verify Firebase Console for auth events
4. Check Firestore Console for data

## Support

For issues or questions:
- Check [FIREBASE_AUTH.md](./FIREBASE_AUTH.md) documentation
- Review Firebase Console for errors
- Check server and browser console logs
- Ensure all configuration values are correct
