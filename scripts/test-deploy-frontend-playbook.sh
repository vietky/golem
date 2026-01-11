#!/bin/bash

# Test script for frontend deployment playbook
# Verifies the playbook structure and configurations

set -e

REPO_PATH="/Users/avietidol/codes/golem"
DEPLOY_ENV="${1:-test}"

if [ "$DEPLOY_ENV" != "test" ] && [ "$DEPLOY_ENV" != "prod" ]; then
    echo "❌ Invalid environment: $DEPLOY_ENV"
    echo "Usage: $0 [test|prod]"
    exit 1
fi

echo ""
echo "========================================="
echo "Frontend Deployment Playbook Test"
echo "========================================="
echo "Environment: $DEPLOY_ENV"
echo ""

# Test 1: Verify files exist
echo "[1/6] Verifying files..."
files=(
    "ansible/inventory.ini"
    "ansible/deploy-frontend.yml"
    "Dockerfile.fe"
)

for file in "${files[@]}"; do
    if [ ! -f "$REPO_PATH/$file" ]; then
        echo "❌ Missing: $file"
        exit 1
    fi
    echo "  ✓ $file"
done

# Test 2: Verify playbook syntax
echo "[2/6] Checking playbook syntax..."
cd "$REPO_PATH"
if ! ansible-playbook --syntax-check -i ansible/inventory.ini ansible/deploy-frontend.yml > /dev/null 2>&1; then
    echo "❌ Syntax error in playbook"
    exit 1
fi
echo "  ✓ Playbook syntax valid"

# Test 3: Verify environment configuration
echo "[3/6] Checking environment configuration..."
env_config=$(grep -A 5 "env_config:" ansible/deploy-frontend.yml)
if echo "$env_config" | grep -q "nginx_path:" && \
   echo "$env_config" | grep -q "api_host:" && \
   echo "$env_config" | grep -q "nginx_host:" && \
   echo "$env_config" | grep -q "url_path:"; then
    echo "  ✓ Environment configuration complete"
else
    echo "❌ Environment configuration incomplete"
    exit 1
fi

# Test 4: Verify git repo fetch logic
echo "[4/6] Checking git repository fetch logic..."
if grep -q "git_repo_path:" ansible/deploy-frontend.yml && \
   grep -q "git fetch origin" ansible/deploy-frontend.yml && \
   grep -q "git pull origin main" ansible/deploy-frontend.yml; then
    echo "  ✓ Git fetch logic present"
else
    echo "❌ Git fetch logic missing"
    exit 1
fi

# Test 5: Verify Docker build logic
echo "[5/6] Checking Docker build logic..."
if grep -q "docker build" ansible/deploy-frontend.yml && \
   grep -q "VITE_API_HOST" ansible/deploy-frontend.yml && \
   grep -q "Dockerfile.fe" ansible/deploy-frontend.yml; then
    echo "  ✓ Docker build logic present"
else
    echo "❌ Docker build logic missing"
    exit 1
fi

# Test 6: Verify deployment and verification steps
echo "[6/6] Checking deployment and verification logic..."
if grep -q "Deploy frontend to nginx" ansible/deploy-frontend.yml && \
   grep -q "Verify frontend deployment" ansible/deploy-frontend.yml && \
   grep -q "index.html" ansible/deploy-frontend.yml; then
    echo "  ✓ Deployment and verification logic present"
else
    echo "❌ Deployment and verification logic missing"
    exit 1
fi

# Summary
echo ""
echo "========================================="
echo "✓ All tests passed!"
echo "========================================="
echo ""
echo "Playbook Summary:"
echo "  - Fetches code from git repository at /opt/jenkins/repos/golem"
echo "  - Builds frontend using Docker and Dockerfile.fe"
echo "  - Injects environment-specific build arguments (API host, Nginx host)"
echo "  - Extracts build output to temporary directory"
echo "  - Deploys to nginx at $(grep -A 10 'env_config:' ansible/deploy-frontend.yml | grep -A 1 "$DEPLOY_ENV:" | grep nginx_path | awk '{print $NF}')"
echo "  - Verifies deployment by checking for index.html"
echo "  - Cleans up temporary files"
echo ""
echo "To run the playbook:"
echo "  DEPLOY_ENV=$DEPLOY_ENV make k3s-frontend-${DEPLOY_ENV}"
echo ""
