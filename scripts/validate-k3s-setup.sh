#!/bin/bash
# Validate k3s deployment setup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== K3S Deployment Setup Validation ===${NC}"
echo ""

# Check 1: Deployment directory structure
echo -n "Checking deployment directory structure... "
if [ -d "$PROJECT_ROOT/deployment" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ deployment/ directory not found${NC}"
    exit 1
fi

# Check 2: Required namespace manifests
echo -n "Checking namespace manifests... "
NAMESPACES=("golem-database" "golem-cache" "golem-app")
for ns in "${NAMESPACES[@]}"; do
    if [ ! -f "$PROJECT_ROOT/deployment/namespaces/${ns}.yaml" ]; then
        echo -e "${RED}✗ Missing ${ns}.yaml${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓${NC}"

# Check 3: MongoDB manifests
echo -n "Checking MongoDB manifests... "
MONGODB_FILES=("pvc.yaml" "deployment.yaml" "service.yaml")
for file in "${MONGODB_FILES[@]}"; do
    if [ ! -f "$PROJECT_ROOT/deployment/mongodb/$file" ]; then
        echo -e "${RED}✗ Missing mongodb/$file${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓${NC}"

# Check 4: Redis manifests
echo -n "Checking Redis manifests... "
REDIS_FILES=("pvc.yaml" "deployment.yaml" "service.yaml")
for file in "${REDIS_FILES[@]}"; do
    if [ ! -f "$PROJECT_ROOT/deployment/redis/$file" ]; then
        echo -e "${RED}✗ Missing redis/$file${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓${NC}"

# Check 5: Application manifests
echo -n "Checking application manifests... "
APP_FILES=("configmap.yaml" "secret.yaml.template" "deployment.yaml" "service.yaml")
for file in "${APP_FILES[@]}"; do
    if [ ! -f "$PROJECT_ROOT/deployment/golem-app/$file" ]; then
        echo -e "${RED}✗ Missing golem-app/$file${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓${NC}"

# Check 6: Ansible inventory
echo -n "Checking Ansible inventory... "
if [ -f "$PROJECT_ROOT/ansible/inventory.ini" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ ansible/inventory.ini not found${NC}"
    exit 1
fi

# Check 7: Ansible playbook
echo -n "Checking Ansible playbook... "
if [ -f "$PROJECT_ROOT/ansible/deploy-k3s.yml" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ ansible/deploy-k3s.yml not found${NC}"
    exit 1
fi

# Check 8: Deployment script
echo -n "Checking deployment script... "
if [ -f "$PROJECT_ROOT/scripts/deploy-k3s.sh" ] && [ -x "$PROJECT_ROOT/scripts/deploy-k3s.sh" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ scripts/deploy-k3s.sh not found or not executable${NC}"
    exit 1
fi

# Check 9: Ansible installed
echo -n "Checking Ansible installation... "
if command -v ansible-playbook &> /dev/null; then
    echo -e "${GREEN}✓ $(ansible-playbook --version | head -n1)${NC}"
else
    echo -e "${YELLOW}⚠ Ansible not installed (optional for local validation)${NC}"
fi

# Check 10: Docker installed
echo -n "Checking Docker installation... "
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ $(docker --version)${NC}"
else
    echo -e "${YELLOW}⚠ Docker not installed (required for deployment)${NC}"
fi

# Check 11: SSH access to k3s server
echo -n "Checking SSH access to k3s server... "
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@157.66.101.66 "exit" &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Cannot connect to 157.66.101.66 (may need VPN or SSH key)${NC}"
fi

# Check 12: Secrets directory (optional)
echo -n "Checking secrets directory... "
if [ -d "$PROJECT_ROOT/secrets" ] && [ -f "$PROJECT_ROOT/secrets/.env" ]; then
    echo -e "${GREEN}✓ (Telegram notifications enabled)${NC}"
else
    echo -e "${YELLOW}⚠ No secrets found (Telegram notifications disabled)${NC}"
fi

# Check 13: Validate YAML syntax
echo -n "Validating YAML manifests... "
YAML_VALID=true
for yaml_file in $(find "$PROJECT_ROOT/deployment" -name "*.yaml" -not -name "*.template"); do
    if command -v yamllint &> /dev/null; then
        if ! yamllint -d relaxed "$yaml_file" &> /dev/null; then
            echo -e "${RED}✗ Invalid YAML: $yaml_file${NC}"
            YAML_VALID=false
        fi
    fi
done
if [ "$YAML_VALID" = true ]; then
    if command -v yamllint &> /dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠ yamllint not installed (skipped validation)${NC}"
    fi
fi

# Summary
echo ""
echo -e "${GREEN}=== Validation Complete ===${NC}"
echo ""
echo "Deployment structure is ready!"
echo ""
echo "Next steps:"
echo "  1. Ensure k3s is installed on 157.66.101.66"
echo "  2. (Optional) Add secrets to secrets/.env"
echo "  3. Run: make k3s-deploy"
echo ""
echo "For more information:"
echo "  - Ansible README: ansible/README.md"
echo "  - Deployment README: deployment/README.md"
echo "  - Quick Reference: docs/K3S_DEPLOYMENT_QUICK_REFERENCE.md"
