#!/bin/bash
#
# Setup GitHub Actions secrets from .env file
# This script configures the required secrets for the GitHub Actions workflow
# to trigger Jenkins deployments
#
# Requirements:
# - GitHub CLI (gh) installed and authenticated
# - .env file with required variables
# - Repository write access
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if GitHub CLI is installed
if ! command_exists gh; then
    print_error "GitHub CLI (gh) is not installed."
    echo "Install it from: https://cli.github.com/"
    echo "Or run: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status >/dev/null 2>&1; then
    print_error "GitHub CLI is not authenticated."
    echo "Run: gh auth login"
    exit 1
fi

print_success "GitHub CLI is installed and authenticated"

# Get the current repository
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")

if [ -z "$REPO" ]; then
    print_error "Not in a GitHub repository or repository not found."
    echo "Make sure you're in the golem repository directory."
    exit 1
fi

print_info "Repository: ${REPO}"

# Check if .env file exists
ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
    print_error ".env file not found at: $ENV_FILE"
    echo ""
    echo "Create a .env file with the following variables:"
    echo "JENKINS_URL=http://your-jenkins-server:8080"
    echo "JENKINS_USER=your_username"
    echo "JENKINS_TOKEN=your_api_token"
    echo "JENKINS_JOB_NAME=golem-century-deploy"
    exit 1
fi

print_success ".env file found at: $ENV_FILE"

# Source the .env file
set -a  # automatically export all variables
source "$ENV_FILE"
set +a

# Required variables
REQUIRED_VARS=(
    "JENKINS_URL"
    "JENKINS_USER"
    "JENKINS_TOKEN"
)

# Optional variables with defaults
JENKINS_JOB_NAME="${JENKINS_JOB_NAME:-golem-century-deploy}"

# Check required variables
missing_vars=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    print_error "Missing required variables in .env file:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

print_success "All required variables found in .env file"

# Display configuration
echo ""
print_info "Configuration to be set:"
echo "  JENKINS_URL: ${JENKINS_URL}"
echo "  JENKINS_USER: ${JENKINS_USER}"
echo "  JENKINS_TOKEN: ${JENKINS_TOKEN:0:4}****${JENKINS_TOKEN: -4}"
echo "  JENKINS_JOB_NAME: ${JENKINS_JOB_NAME}"
echo ""

# Ask for confirmation
read -p "Do you want to set these secrets for ${REPO}? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Aborted by user"
    exit 0
fi

# Set secrets
print_info "Setting GitHub Actions secrets..."

# Function to set a secret
set_secret() {
    local name=$1
    local value=$2
    
    if gh secret set "$name" --body "$value" 2>/dev/null; then
        print_success "Secret ${name} set successfully"
        return 0
    else
        print_error "Failed to set secret ${name}"
        return 1
    fi
}

# Set each secret
secrets_set=0
secrets_failed=0

for var in "${REQUIRED_VARS[@]}"; do
    if set_secret "$var" "${!var}"; then
        ((secrets_set++))
    else
        ((secrets_failed++))
    fi
done

# Set optional secret
if set_secret "JENKINS_JOB_NAME" "$JENKINS_JOB_NAME"; then
    ((secrets_set++))
else
    ((secrets_failed++))
fi

# Summary
echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo "Secrets set: ${secrets_set}"
echo "Failed: ${secrets_failed}"
echo "=========================================="

if [ $secrets_failed -eq 0 ]; then
    print_success "All secrets configured successfully!"
    echo ""
    print_info "Next steps:"
    echo "  1. Push to main branch to trigger deployment"
    echo "  2. Or manually trigger workflow at:"
    echo "     https://github.com/${REPO}/actions"
else
    print_error "Some secrets failed to set. Please check the errors above."
    exit 1
fi

# List current secrets (without values)
echo ""
print_info "Current secrets in repository:"
gh secret list

echo ""
print_success "Setup complete!"
