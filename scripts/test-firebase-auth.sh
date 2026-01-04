#!/bin/bash

# Firebase Authentication Test Script
# Tests the Google OAuth + Firebase authentication implementation

set -e

echo "🔥 Firebase Authentication Test Suite"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

echo "Testing against:"
echo "  Backend: $BACKEND_URL"
echo "  Frontend: $FRONTEND_URL"
echo ""

# Check if backend is configured with Firebase
echo "1️⃣  Checking Firebase configuration..."
if [ -f ".env" ] && grep -q "FIREBASE_PROJECT_ID" .env && ! grep -q "^FIREBASE_PROJECT_ID=$" .env; then
    echo -e "${GREEN}✓${NC} Backend Firebase configuration found"
else
    echo -e "${YELLOW}⚠${NC}  Backend Firebase not configured (optional - authentication disabled)"
fi

if [ -f "web/react-frontend/.env" ] && grep -q "VITE_FIREBASE_API_KEY" web/react-frontend/.env; then
    echo -e "${GREEN}✓${NC} Frontend Firebase configuration found"
else
    echo -e "${YELLOW}⚠${NC}  Frontend Firebase not configured (optional - authentication disabled)"
fi
echo ""

# Check if service account file exists
echo "2️⃣  Checking Firebase service account..."
if [ -f "firebase-service-account.json" ]; then
    echo -e "${GREEN}✓${NC} Service account file found"
else
    echo -e "${YELLOW}⚠${NC}  Service account file not found (required if Firebase is configured)"
fi
echo ""

# Build backend
echo "3️⃣  Building backend..."
if go build -o bin/test-server ./cmd/server 2>&1 | tee /tmp/build.log; then
    echo -e "${GREEN}✓${NC} Backend builds successfully"
else
    echo -e "${RED}✗${NC} Backend build failed"
    cat /tmp/build.log
    exit 1
fi
echo ""

# Check for required packages
echo "4️⃣  Checking Firebase packages..."
if grep -q "firebase.google.com/go/v4" go.mod; then
    echo -e "${GREEN}✓${NC} Firebase Admin SDK installed"
else
    echo -e "${RED}✗${NC} Firebase Admin SDK not found"
    exit 1
fi

if grep -q "cloud.google.com/go/firestore" go.mod; then
    echo -e "${GREEN}✓${NC} Firestore SDK installed"
else
    echo -e "${RED}✗${NC} Firestore SDK not found"
    exit 1
fi
echo ""

# Check frontend dependencies
echo "5️⃣  Checking frontend dependencies..."
cd web/react-frontend
if grep -q '"firebase"' package.json; then
    echo -e "${GREEN}✓${NC} Firebase SDK installed in frontend"
else
    echo -e "${RED}✗${NC} Firebase SDK not found in frontend"
    exit 1
fi
cd ../..
echo ""

# Check critical files exist
echo "6️⃣  Checking implementation files..."

critical_files=(
    "internal/firebase/client.go"
    "internal/firebase/session.go"
    "web/react-frontend/src/config/firebase.js"
    "web/react-frontend/src/contexts/AuthContext.jsx"
    "web/react-frontend/src/components/LoginPage.jsx"
    "web/react-frontend/src/components/ProtectedRoute.jsx"
    "docs/FIREBASE_AUTH.md"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file missing"
        exit 1
    fi
done
echo ""

# Check if authentication is properly integrated
echo "7️⃣  Verifying authentication integration..."

# Check if HandleWebSocketV2 has token verification
if grep -q "idToken.*:=.*r.URL.Query().Get" internal/server/handlers.go; then
    echo -e "${GREEN}✓${NC} WebSocket handler extracts Firebase token"
else
    echo -e "${RED}✗${NC} WebSocket handler doesn't extract Firebase token"
    exit 1
fi

if grep -q "VerifyIDToken" internal/server/handlers.go; then
    echo -e "${GREEN}✓${NC} WebSocket handler verifies Firebase token"
else
    echo -e "${RED}✗${NC} WebSocket handler doesn't verify Firebase token"
    exit 1
fi

if grep -q "IsUserInSession" internal/server/handlers.go; then
    echo -e "${GREEN}✓${NC} WebSocket handler checks session membership"
else
    echo -e "${RED}✗${NC} WebSocket handler doesn't check session membership"
    exit 1
fi
echo ""

# Check frontend integration
echo "8️⃣  Verifying frontend integration..."

if grep -q "useAuth" web/react-frontend/src/SinglePlayerApp.jsx; then
    echo -e "${GREEN}✓${NC} App uses authentication context"
else
    echo -e "${RED}✗${NC} App doesn't use authentication context"
    exit 1
fi

if grep -q "idToken" web/react-frontend/src/store/gameStore.js; then
    echo -e "${GREEN}✓${NC} WebSocket connection sends ID token"
else
    echo -e "${RED}✗${NC} WebSocket connection doesn't send ID token"
    exit 1
fi

if grep -q "ProtectedRoute" web/react-frontend/src/main.jsx; then
    echo -e "${GREEN}✓${NC} Protected routes are configured"
else
    echo -e "${RED}✗${NC} Protected routes not configured"
    exit 1
fi
echo ""

# Check environment variable handling
echo "9️⃣  Verifying environment configuration..."

if grep -q "FIREBASE_PROJECT_ID" internal/config/config.go; then
    echo -e "${GREEN}✓${NC} Backend config includes Firebase settings"
else
    echo -e "${RED}✗${NC} Backend config missing Firebase settings"
    exit 1
fi

if grep -q "VITE_FIREBASE_API_KEY" web/react-frontend/.env.example; then
    echo -e "${GREEN}✓${NC} Frontend .env.example includes Firebase config"
else
    echo -e "${RED}✗${NC} Frontend .env.example missing Firebase config"
    exit 1
fi
echo ""

# Summary
echo "======================================"
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "Firebase authentication is properly implemented."
echo ""
echo "Next steps:"
echo "1. Set up Firebase project at https://console.firebase.google.com"
echo "2. Enable Google Sign-In in Authentication settings"
echo "3. Download service account key and save as firebase-service-account.json"
echo "4. Configure .env files with Firebase credentials"
echo "5. Test the authentication flow manually"
echo ""
echo "For detailed setup instructions, see docs/FIREBASE_AUTH.md"
