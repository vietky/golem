#!/bin/bash

# Script to deploy Firebase authentication secrets to k3s
# This script reads credentials from the local secrets/ folder and deploys them to k3s

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SECRETS_DIR="$PROJECT_ROOT/secrets"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Firebase Authentication Secrets Deployment${NC}"
echo "=============================================="
echo

# Check if secrets directory exists
if [ ! -d "$SECRETS_DIR" ]; then
    echo -e "${RED}Error: secrets/ directory not found at $SECRETS_DIR${NC}"
    echo "Please create the secrets directory and add your Firebase credentials"
    exit 1
fi

# Check for Firebase service account JSON
FIREBASE_CREDS_FILE="$SECRETS_DIR/firebase-credentials.json"
if [ ! -f "$FIREBASE_CREDS_FILE" ]; then
    echo -e "${RED}Error: Firebase service account file not found at $FIREBASE_CREDS_FILE${NC}"
    echo "Please add your Firebase service account JSON file to the secrets/ directory"
    exit 1
fi

# Check for OAuth credentials file
OAUTH_FILE="$SECRETS_DIR/firebase-oauth.env"
if [ ! -f "$OAUTH_FILE" ]; then
    echo -e "${YELLOW}Warning: OAuth credentials file not found at $OAUTH_FILE${NC}"
    echo "Creating template file. Please fill in your credentials."
    cat > "$OAUTH_FILE" << 'EOF'
# Google OAuth credentials for Firebase authentication
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
EOF
    echo -e "${RED}Please edit $OAUTH_FILE and re-run this script${NC}"
    exit 1
fi

# Source OAuth credentials
source "$OAUTH_FILE"

if [ -z "$GOOGLE_OAUTH_CLIENT_ID" ] || [ "$GOOGLE_OAUTH_CLIENT_ID" == "your-client-id.apps.googleusercontent.com" ]; then
    echo -e "${RED}Error: GOOGLE_OAUTH_CLIENT_ID not set in $OAUTH_FILE${NC}"
    exit 1
fi

if [ -z "$GOOGLE_OAUTH_CLIENT_SECRET" ] || [ "$GOOGLE_OAUTH_CLIENT_SECRET" == "your-client-secret" ]; then
    echo -e "${RED}Error: GOOGLE_OAUTH_CLIENT_SECRET not set in $OAUTH_FILE${NC}"
    exit 1
fi

echo "✓ Found Firebase service account JSON"
echo "✓ Found OAuth credentials"
echo

# Base64 encode the Firebase credentials
echo "Encoding Firebase credentials..."
FIREBASE_CREDS_BASE64=$(base64 < "$FIREBASE_CREDS_FILE" | tr -d '\n')

# Create the secret YAML
echo "Creating Kubernetes secrets..."

cat > "$PROJECT_ROOT/deployment/base/firebase-auth.yaml" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: firebase-auth-secret
  namespace: golem
type: Opaque
stringData:
  GOOGLE_OAUTH_CLIENT_ID: "$GOOGLE_OAUTH_CLIENT_ID"
  GOOGLE_OAUTH_CLIENT_SECRET: "$GOOGLE_OAUTH_CLIENT_SECRET"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: firebase-auth-config
  namespace: golem
data:
  GOOGLE_OAUTH_REDIRECT_URL: "https://game.anhtran.dev/auth/google/callback"
  SESSION_COOKIE_DOMAIN: ".anhtran.dev"
---
apiVersion: v1
kind: Secret
metadata:
  name: firebase-service-account
  namespace: golem
type: Opaque
data:
  firebase-credentials.json: "$FIREBASE_CREDS_BASE64"
EOF

echo -e "${GREEN}✓ Created firebase-auth.yaml with credentials${NC}"
echo
echo "To deploy to k3s, run:"
echo "  kubectl apply -f deployment/base/firebase-auth.yaml"
echo
echo "Or deploy the full stack with:"
echo "  make k3s-deploy"
