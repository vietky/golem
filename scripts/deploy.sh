#!/bin/bash
#
# Deployment script for Golem Century
# This script handles git pull and docker-compose deployment
# Can be used by both Jenkins and Ansible
#

set -e

# Default values
APP_NAME="${APP_NAME:-golem-century}"
APP_DIR="${APP_DIR:-/opt/jenkins/repos/golem}"
APP_PORT="${APP_PORT:-8081}"
GIT_REPO="${GIT_REPO:-https://github.com/vietky/golem.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"

# Logging
LOG_DIR="${LOG_DIR:-/var/log/golem-deploy}"
LOG_FILE="${LOG_DIR}/deploy-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Create log directory
mkdir -p "$LOG_DIR"

log "Starting deployment for ${APP_NAME}"
log "App directory: ${APP_DIR}"
log "Git branch: ${GIT_BRANCH}"
log "Log file: ${LOG_FILE}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first."
fi

# Check if docker-compose is installed (v1 or v2)
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    log "Using Docker Compose v1 (docker-compose)"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
    log "Using Docker Compose v2 (docker compose)"
else
    error "Docker Compose is not installed. Please install docker-compose or docker compose plugin."
fi

# Create application directory if it doesn't exist
if [ ! -d "$APP_DIR" ]; then
    log "Creating application directory: ${APP_DIR}"
    mkdir -p "$APP_DIR"
fi

# Navigate to application directory
cd "$APP_DIR" || error "Failed to change to ${APP_DIR}"

# Clone repository if it doesn't exist
if [ ! -d ".git" ]; then
    log "Repository not found. Cloning from ${GIT_REPO}..."
    git clone -b "$GIT_BRANCH" "$GIT_REPO" .
else
    log "Repository exists. Pulling latest changes from ${GIT_BRANCH}..."
    git fetch origin
    git reset --hard origin/"$GIT_BRANCH" || warning "Failed to reset to origin/${GIT_BRANCH}"
    git checkout "$GIT_BRANCH" || warning "Failed to checkout ${GIT_BRANCH}, staying on current branch"
    git pull origin "$GIT_BRANCH" || error "Failed to pull latest changes"
fi

# Verify docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    error "docker-compose.yml not found in ${APP_DIR}"
fi

# Stop existing containers
log "Stopping existing containers..."
$DOCKER_COMPOSE_CMD down || warning "No existing containers to stop"

# Build and start containers
log "Building and starting containers..."
if $DOCKER_COMPOSE_CMD up -d --build; then
    log "✓ Containers started successfully"
else
    error "Failed to start containers"
fi

# Wait a bit for containers to start
sleep 5

# Verify container is running
if docker ps --filter "name=${APP_NAME}-server" --format "{{.Status}}" | grep -q "Up"; then
    log "✓ Container is running"
    log "Application should be available at: http://localhost:${APP_PORT}"
else
    error "Container failed to start. Check logs with: $DOCKER_COMPOSE_CMD logs"
fi

# Show container status
log "Container status:"
docker ps --filter "name=${APP_NAME}-server" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

log "Deployment completed successfully!"
log "View logs: tail -f ${LOG_FILE}"

