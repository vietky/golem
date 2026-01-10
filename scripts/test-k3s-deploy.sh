#!/bin/bash
# Test k3s deployment setup before running actual deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Testing K3S Deployment Configuration ===${NC}"
echo ""

# Test 1: Check Ansible syntax
echo -e "${BLUE}[1/8] Checking Ansible playbook syntax...${NC}"
cd "$PROJECT_ROOT/ansible"
if ansible-playbook --syntax-check deploy-k3s.yml -i inventory.ini > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Ansible syntax is valid${NC}"
else
    echo -e "${RED}✗ Ansible syntax check failed${NC}"
    ansible-playbook --syntax-check deploy-k3s.yml -i inventory.ini
    exit 1
fi

# Test 2: Verify inventory connection
echo -e "${BLUE}[2/8] Testing SSH connection to k3s server...${NC}"
if ansible k3s_cluster -i inventory.ini -m ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
else
    echo -e "${YELLOW}⚠ SSH connection failed - checking manual connection...${NC}"
    if ssh -o ConnectTimeout=5 root@157.66.101.66 "echo connected" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Manual SSH works (Ansible inventory may need adjustment)${NC}"
    else
        echo -e "${RED}✗ Cannot connect to server${NC}"
        exit 1
    fi
fi

# Test 3: Check k3s on remote server
echo -e "${BLUE}[3/8] Checking k3s installation on remote server...${NC}"
if ssh root@157.66.101.66 "test -f /usr/local/bin/k3s" 2>/dev/null; then
    K3S_VERSION=$(ssh root@157.66.101.66 "k3s --version" 2>/dev/null | head -n1)
    echo -e "${GREEN}✓ k3s is installed: $K3S_VERSION${NC}"
else
    echo -e "${RED}✗ k3s is not installed on the server${NC}"
    echo -e "${YELLOW}  Install k3s with: ssh root@157.66.101.66 'curl -sfL https://get.k3s.io | sh -'${NC}"
    exit 1
fi

# Test 4: Check secrets
echo -e "${BLUE}[4/8] Checking secrets configuration...${NC}"
if [ -f "$PROJECT_ROOT/secrets/.env" ]; then
    if grep -q "TELEGRAM_BOT_TOKEN=" "$PROJECT_ROOT/secrets/.env" && grep -q "TELEGRAM_CHAT_ID=" "$PROJECT_ROOT/secrets/.env"; then
        echo -e "${GREEN}✓ Secrets file found with required variables${NC}"
    else
        echo -e "${YELLOW}⚠ Secrets file exists but missing required variables${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No secrets file found (Telegram notifications will be disabled)${NC}"
fi

# Test 5: Check Docker
echo -e "${BLUE}[5/8] Checking Docker installation...${NC}"
if command -v docker > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker is installed: $(docker --version)${NC}"
else
    echo -e "${RED}✗ Docker is not installed (required for building images)${NC}"
    exit 1
fi

# Test 6: Check frontend build directory
echo -e "${BLUE}[6/8] Checking frontend setup...${NC}"
if [ -d "$PROJECT_ROOT/web/react-frontend" ]; then
    echo -e "${GREEN}✓ Frontend source directory exists${NC}"
    if [ -f "$PROJECT_ROOT/web/react-frontend/package.json" ]; then
        echo -e "${GREEN}✓ package.json found${NC}"
    else
        echo -e "${RED}✗ package.json not found${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Frontend directory not found${NC}"
    exit 1
fi

# Test 7: Check nginx directory on server
echo -e "${BLUE}[7/8] Checking nginx directory on server...${NC}"
if ssh root@157.66.101.66 "test -d /opt/nginx/apps" 2>/dev/null; then
    echo -e "${GREEN}✓ Nginx apps directory exists${NC}"
else
    echo -e "${YELLOW}⚠ Nginx directory does not exist (will be created during deployment)${NC}"
fi

# Test 8: Validate Kubernetes manifests
echo -e "${BLUE}[8/8] Validating Kubernetes manifests...${NC}"
if command -v kubectl > /dev/null 2>&1 && kubectl config current-context > /dev/null 2>&1; then
    INVALID_MANIFESTS=0
    for yaml_file in $(find "$PROJECT_ROOT/deployment" -name "*.yaml" -not -name "*.template"); do
        if ! kubectl apply --dry-run=client -f "$yaml_file" > /dev/null 2>&1; then
            echo -e "${RED}✗ Invalid manifest: $yaml_file${NC}"
            INVALID_MANIFESTS=$((INVALID_MANIFESTS + 1))
        fi
    done

    if [ $INVALID_MANIFESTS -eq 0 ]; then
        echo -e "${GREEN}✓ All Kubernetes manifests are valid${NC}"
    else
        echo -e "${RED}✗ Found $INVALID_MANIFESTS invalid manifests${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ kubectl not configured (skipping manifest validation)${NC}"
    echo -e "${YELLOW}  Manifests will be validated on the k3s server during deployment${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}=== Pre-deployment Check Complete ===${NC}"
echo ""
echo -e "${GREEN}All checks passed! Ready to deploy.${NC}"
echo ""
echo "Deployment commands:"
echo -e "${BLUE}  make k3s-deploy-full${NC}     - Deploy both backend (k3s) and frontend (nginx)"
echo -e "${BLUE}  make k3s-deploy${NC}          - Deploy backend only (k3s)"
echo -e "${BLUE}  make k3s-frontend${NC}        - Deploy frontend only (nginx)"
echo ""
echo "To proceed with deployment:"
echo -e "${YELLOW}  make k3s-deploy-full${NC}"
echo ""
