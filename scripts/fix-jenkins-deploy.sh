#!/bin/bash
#
# Quick fix script to ensure deploy.sh is available for Jenkins
# Run this on the server if Jenkins job fails due to missing deploy script
#
# Usage: ./fix-jenkins-deploy.sh
#

set -e

# Configuration
JENKINS_HOME="${JENKINS_HOME:-/opt/jenkins}"
JENKINS_REPOS_DIR="${JENKINS_REPOS_DIR:-/opt/jenkins/repos}"
APP_DIR="${APP_DIR:-/opt/jenkins/repos/golem}"
GIT_REPO="${GIT_REPO:-https://github.com/vietky/golem.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"

echo "=== Jenkins Deploy Script Fix ==="
echo "Jenkins Home: $JENKINS_HOME"
echo "App Directory: $APP_DIR"

# Create necessary directories
echo "Creating directories..."
mkdir -p "$JENKINS_HOME/scripts"
mkdir -p "$JENKINS_REPOS_DIR"

# Clone or update repository
if [ -d "$APP_DIR/.git" ]; then
    echo "Updating existing repository..."
    cd "$APP_DIR"
    git fetch origin
    git checkout "$GIT_BRANCH"
    git pull origin "$GIT_BRANCH"
else
    echo "Cloning repository..."
    git clone -b "$GIT_BRANCH" "$GIT_REPO" "$APP_DIR"
fi

# Copy deploy script to Jenkins scripts directory
if [ -f "$APP_DIR/scripts/deploy.sh" ]; then
    echo "Copying deploy script to $JENKINS_HOME/scripts/"
    cp "$APP_DIR/scripts/deploy.sh" "$JENKINS_HOME/scripts/deploy.sh"
    chmod +x "$JENKINS_HOME/scripts/deploy.sh"
    echo "✓ Deploy script copied successfully"
else
    echo "ERROR: Deploy script not found at $APP_DIR/scripts/deploy.sh"
    exit 1
fi

# Verify
echo ""
echo "=== Verification ==="
echo "Repository location: $APP_DIR"
ls -la "$APP_DIR/scripts/deploy.sh" 2>/dev/null && echo "✓ Script in repo: OK" || echo "✗ Script in repo: NOT FOUND"
ls -la "$JENKINS_HOME/scripts/deploy.sh" 2>/dev/null && echo "✓ Script in Jenkins: OK" || echo "✗ Script in Jenkins: NOT FOUND"

echo ""
echo "=== Fix Complete ==="
echo "You can now run the Jenkins job again."
