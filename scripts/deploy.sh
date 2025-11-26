#!/bin/bash
#
# Deploy script for Golem Century Game Server
# This script is idempotent and can be run by both Ansible and Jenkins
#
# Requirements:
# - Docker and docker-compose installed
# - Git installed
# - Proper permissions for the user running the script
#

set -e  # Exit on error

# Configuration
APP_NAME="${APP_NAME:-golem-century}"
APP_DIR="${APP_DIR:-/opt/golem-century}"
APP_PORT="${APP_PORT:-8081}"
GIT_REPO="${GIT_REPO:-https://github.com/vietky/golem.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"
LOG_DIR="${LOG_DIR:-${APP_DIR}/logs}"
LOG_FILE="${LOG_FILE:-${LOG_DIR}/deploy-$(date +%Y%m%d-%H%M%S).log}"

# Function to log with timestamp
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] ${message}"
    if [ -f "$LOG_FILE" ]; then
        echo "[${timestamp}] ${message}" >> "$LOG_FILE"
    fi
}

# Function to run command and log output
run_cmd() {
    local cmd="$1"
    log "Running: ${cmd}"
    if [ -f "$LOG_FILE" ]; then
        if eval "$cmd" >> "$LOG_FILE" 2>&1; then
            log "✓ Success"
            return 0
        else
            local exit_code=$?
            log "✗ Failed with exit code ${exit_code}"
            return $exit_code
        fi
    else
        if eval "$cmd"; then
            log "✓ Success"
            return 0
        else
            local exit_code=$?
            log "✗ Failed with exit code ${exit_code}"
            return $exit_code
        fi
    fi
}

# Main deployment process
main() {
    # Create log directory if it doesn't exist
    mkdir -p "$LOG_DIR"
    
    log "=========================================="
    log "Starting deployment of ${APP_NAME}"
    log "=========================================="
    
    log "Configuration:"
    log "  APP_DIR: ${APP_DIR}"
    log "  GIT_REPO: ${GIT_REPO}"
    log "  GIT_BRANCH: ${GIT_BRANCH}"
    log "  LOG_FILE: ${LOG_FILE}"
    
    # Check if git repository exists
    if [ -d "${APP_DIR}/.git" ]; then
        log "Git repository exists, updating..."
        cd "${APP_DIR}"
        
        # Check if remote exists
        if ! git remote | grep -q "^origin$"; then
            log "Adding remote origin..."
            run_cmd "git remote add origin ${GIT_REPO}"
        fi
        
        # Fetch latest changes
        run_cmd "git fetch origin"
        
        # Reset to latest commit on the branch
        run_cmd "git reset --hard origin/${GIT_BRANCH}"
        
        # Recreate log directory before clean (in case it was created earlier)
        mkdir -p "$LOG_DIR"
        
        # Clean untracked files but preserve logs
        run_cmd "git clean -fd -e logs/"
        
        log "Repository updated successfully"
    else
        log "Git repository does not exist, cloning..."
        
        # If directory exists but is not a git repo, back it up
        if [ -d "${APP_DIR}" ] && [ "$(ls -A ${APP_DIR})" ]; then
            backup_dir="${APP_DIR}.backup.$(date +%Y%m%d-%H%M%S)"
            log "Backing up existing directory to ${backup_dir}"
            mv "${APP_DIR}" "${backup_dir}"
        fi
        
        # Create parent directory if needed
        mkdir -p "$(dirname ${APP_DIR})"
        
        # Clone the repository
        run_cmd "git clone -b ${GIT_BRANCH} ${GIT_REPO} ${APP_DIR}"
        
        cd "${APP_DIR}"
        log "Repository cloned successfully"
    fi
    
    # Display current commit
    current_commit=$(git rev-parse --short HEAD)
    commit_message=$(git log -1 --pretty=%B)
    log "Current commit: ${current_commit}"
    log "Commit message: ${commit_message}"
    
    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        log "ERROR: docker-compose.yml not found in ${APP_DIR}"
        exit 1
    fi
    
    # Stop existing containers
    log "Stopping existing containers..."
    if docker-compose ps -q 2>/dev/null | grep -q .; then
        run_cmd "docker-compose down"
    else
        log "No running containers found"
    fi
    
    # Build and start containers
    log "Building and starting containers..."
    run_cmd "docker-compose up -d --build"
    
    # Wait for containers to be healthy
    log "Waiting for containers to be ready..."
    sleep 5
    
    # Check container status
    if docker-compose ps | grep -q "Up"; then
        log "✓ Containers are running"
        
        # Display container status
        log "Container status:"
        if [ -f "$LOG_FILE" ]; then
            docker-compose ps >> "$LOG_FILE"
        fi
        docker-compose ps
        
        # Check health if healthcheck is defined
        if docker-compose ps | grep -q "healthy"; then
            log "✓ Health check passed"
        fi
    else
        log "✗ Containers failed to start"
        log "Container logs:"
        if [ -f "$LOG_FILE" ]; then
            docker-compose logs --tail=50 >> "$LOG_FILE"
        fi
        docker-compose logs --tail=50
        exit 1
    fi
    
    log "=========================================="
    log "Deployment completed successfully!"
    log "Application is running on port ${APP_PORT}"
    log "=========================================="
}

# Run main function
main "$@"
