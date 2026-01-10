#!/bin/bash
# Deploy Golem Century to k3s cluster

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ANSIBLE_DIR="$PROJECT_ROOT/ansible"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Golem Century k3s Deployment ===${NC}"

# Check if ansible is installed
if ! command -v ansible-playbook &> /dev/null; then
    echo -e "${RED}Error: ansible-playbook not found. Please install Ansible first.${NC}"
    exit 1
fi

# Check if inventory file exists
if [ ! -f "$ANSIBLE_DIR/inventory.ini" ]; then
    echo -e "${RED}Error: $ANSIBLE_DIR/inventory.ini not found${NC}"
    exit 1
fi

# Check if secrets exist
if [ -d "$PROJECT_ROOT/secrets" ] && [ -f "$PROJECT_ROOT/secrets/.env" ]; then
    echo -e "${GREEN}✓ Secrets directory found - Telegram notifications will be enabled${NC}"
else
    echo -e "${YELLOW}⚠ No secrets directory found - Telegram notifications will be disabled${NC}"
fi

# Parse command line arguments
DEPLOY_TYPE="backend"  # backend, frontend, or full
DEPLOY_ENV="test"      # test or prod
APP_VERSION="${APP_VERSION:-latest}"
EXTRA_VARS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            DEPLOY_TYPE="$2"
            shift 2
            ;;
        -e|--env)
            DEPLOY_ENV="$2"
            shift 2
            ;;
        -v|--version)
            APP_VERSION="$2"
            shift 2
            ;;
        --extra-vars)
            EXTRA_VARS="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -t, --type TYPE          Deployment type: backend, frontend, or full (default: backend)"
            echo "  -e, --env ENV            Environment: test or prod (default: test)"
            echo "  -v, --version VERSION    Application version (default: latest)"
            echo "  --extra-vars VARS        Pass extra variables to Ansible"
            echo "  -h, --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Deploy backend only"
            echo "  $0 --type frontend --env test         # Deploy frontend to test"
            echo "  $0 --type frontend --env prod         # Deploy frontend to prod"
            echo "  $0 --type full --env test             # Deploy full stack to test"
            echo "  $0 --type backend --version v1.0.0    # Deploy backend v1.0.0"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Validate deploy type
if [[ ! "$DEPLOY_TYPE" =~ ^(backend|frontend|full)$ ]]; then
    echo -e "${RED}Error: Invalid deploy type '$DEPLOY_TYPE'. Must be: backend, frontend, or full${NC}"
    exit 1
fi

# Validate environment
if [[ ! "$DEPLOY_ENV" =~ ^(test|prod)$ ]]; then
    echo -e "${RED}Error: Invalid environment '$DEPLOY_ENV'. Must be: test or prod${NC}"
    exit 1
fi

# Select playbook based on deploy type
case $DEPLOY_TYPE in
    backend)
        PLAYBOOK="deploy-k3s-backend.yml"
        echo -e "${BLUE}Deploying Backend (version: $APP_VERSION)${NC}"
        ;;
    frontend)
        PLAYBOOK="deploy-frontend.yml"
        echo -e "${BLUE}Deploying Frontend (environment: $DEPLOY_ENV)${NC}"
        ;;
    full)
        PLAYBOOK="deploy-k3s.yml"
        echo -e "${BLUE}Deploying Full Stack (backend + frontend to $DEPLOY_ENV)${NC}"
        ;;
esac

echo ""

# Run Ansible playbook
cd "$ANSIBLE_DIR"
export DEPLOY_ENV="$DEPLOY_ENV"
export APP_VERSION="$APP_VERSION"

ansible-playbook -i inventory.ini "$PLAYBOOK" $EXTRA_VARS

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo -e "Check the output above for access information"
