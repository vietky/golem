#!/bin/bash
#
# Test CI/CD Pipeline Setup
# This script validates the entire deployment pipeline
#
# Usage:
#   ./scripts/test-pipeline.sh

# Don't exit on error - we want to see all test results
# set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Test result
test_result() {
    local test_name="$1"
    local result="$2"
    local message="${3:-}"
    
    ((TESTS_TOTAL++))
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} ${test_name}"
        ((TESTS_PASSED++))
    elif [ "$result" = "SKIP" ]; then
        echo -e "${YELLOW}⊘${NC} ${test_name} (skipped)"
    else
        echo -e "${RED}✗${NC} ${test_name}"
        [ -n "$message" ] && echo -e "   ${RED}Error: ${message}${NC}"
        ((TESTS_FAILED++))
    fi
}

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}CI/CD Pipeline Test Suite${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Test 1: Check if required files exist
echo -e "${BLUE}Testing File Structure...${NC}"

if [ -f "scripts/deploy.sh" ]; then
    test_result "Deploy script exists" "PASS"
else
    test_result "Deploy script exists" "FAIL" "scripts/deploy.sh not found"
fi

if [ -f ".github/workflows/deploy.yml" ]; then
    test_result "GitHub workflow exists" "PASS"
else
    test_result "GitHub workflow exists" "FAIL" ".github/workflows/deploy.yml not found"
fi

if [ -f "ansible/deploy-app.yml" ]; then
    test_result "Ansible deploy playbook exists" "PASS"
else
    test_result "Ansible deploy playbook exists" "FAIL" "ansible/deploy-app.yml not found"
fi

if [ -f "ansible/setup-jenkins-job.yml" ]; then
    test_result "Ansible Jenkins setup playbook exists" "PASS"
else
    test_result "Ansible Jenkins setup playbook exists" "FAIL" "ansible/setup-jenkins-job.yml not found"
fi

if [ -f "ansible/inventory.ini" ]; then
    test_result "Ansible inventory exists" "PASS"
else
    test_result "Ansible inventory exists" "FAIL" "ansible/inventory.ini not found"
fi

if [ -f ".env.example" ]; then
    test_result ".env.example exists" "PASS"
else
    test_result ".env.example exists" "FAIL" ".env.example not found"
fi

if [ -f "docker-compose.yml" ]; then
    test_result "docker-compose.yml exists" "PASS"
else
    test_result "docker-compose.yml exists" "FAIL" "docker-compose.yml not found"
fi

echo ""

# Test 2: Check script permissions
echo -e "${BLUE}Testing Script Permissions...${NC}"

if [ -x "scripts/deploy.sh" ]; then
    test_result "Deploy script is executable" "PASS"
else
    test_result "Deploy script is executable" "FAIL" "scripts/deploy.sh is not executable"
fi

if [ -x "scripts/setup-github-secrets.sh" ]; then
    test_result "Setup secrets script is executable" "PASS"
else
    test_result "Setup secrets script is executable" "FAIL" "scripts/setup-github-secrets.sh is not executable"
fi

echo ""

# Test 3: Check required tools
echo -e "${BLUE}Testing Required Tools...${NC}"

if command -v git &> /dev/null; then
    test_result "git is installed" "PASS"
else
    test_result "git is installed" "FAIL" "git is not installed"
fi

if command -v docker &> /dev/null; then
    test_result "docker is installed" "PASS"
else
    test_result "docker is installed" "FAIL" "docker is not installed"
fi

if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    test_result "docker-compose is installed" "PASS"
else
    test_result "docker-compose is installed" "FAIL" "docker-compose is not installed"
fi

if command -v ansible &> /dev/null; then
    test_result "ansible is installed" "PASS"
else
    test_result "ansible is installed" "FAIL" "ansible is not installed (optional)"
fi

if command -v gh &> /dev/null; then
    test_result "GitHub CLI is installed" "PASS"
else
    test_result "GitHub CLI is installed" "FAIL" "gh is not installed (optional)"
fi

echo ""

# Test 4: Check environment configuration
echo -e "${BLUE}Testing Environment Configuration...${NC}"

if [ -f ".env" ]; then
    test_result ".env file exists" "PASS"
    
    # Source .env
    set -a
    source .env 2>/dev/null || true
    set +a
    
    # Check required variables
    if [ -n "$JENKINS_URL" ]; then
        test_result "JENKINS_URL is set" "PASS"
    else
        test_result "JENKINS_URL is set" "FAIL" "JENKINS_URL not found in .env"
    fi
    
    if [ -n "$JENKINS_USER" ]; then
        test_result "JENKINS_USER is set" "PASS"
    else
        test_result "JENKINS_USER is set" "FAIL" "JENKINS_USER not found in .env"
    fi
    
    if [ -n "$JENKINS_TOKEN" ]; then
        test_result "JENKINS_TOKEN is set" "PASS"
    else
        test_result "JENKINS_TOKEN is set" "FAIL" "JENKINS_TOKEN not found in .env"
    fi
else
    test_result ".env file exists" "FAIL" "Create .env from .env.example"
fi

echo ""

# Test 5: Check GitHub CLI authentication
echo -e "${BLUE}Testing GitHub CLI...${NC}"

if command -v gh &> /dev/null; then
    if gh auth status &> /dev/null; then
        test_result "GitHub CLI is authenticated" "PASS"
        
        # Check if in a git repository
        if gh repo view &> /dev/null; then
            test_result "GitHub repository detected" "PASS"
            REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
            echo -e "   ${BLUE}Repository: ${REPO}${NC}"
        else
            test_result "GitHub repository detected" "FAIL" "Not in a GitHub repository"
        fi
    else
        test_result "GitHub CLI is authenticated" "FAIL" "Run: gh auth login"
    fi
else
    test_result "GitHub CLI is authenticated" "SKIP"
fi

echo ""

# Test 6: Validate Ansible inventory
echo -e "${BLUE}Testing Ansible Configuration...${NC}"

if command -v ansible &> /dev/null; then
    if [ -f "ansible/inventory.ini" ]; then
        # Check if inventory has been customized
        if grep -q "YOUR_SERVER_IP" ansible/inventory.ini; then
            test_result "Ansible inventory is configured" "FAIL" "Update ansible/inventory.ini with your server IP"
        else
            test_result "Ansible inventory is configured" "PASS"
            
            # Try to parse inventory
            if ansible-inventory -i ansible/inventory.ini --list &> /dev/null; then
                test_result "Ansible inventory is valid" "PASS"
            else
                test_result "Ansible inventory is valid" "FAIL" "Inventory syntax error"
            fi
        fi
    fi
else
    test_result "Ansible inventory is configured" "SKIP"
fi

echo ""

# Test 7: Validate YAML syntax
echo -e "${BLUE}Testing YAML Syntax...${NC}"

if command -v python3 &> /dev/null; then
    # Test GitHub workflow
    if python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" 2>/dev/null; then
        test_result "GitHub workflow YAML is valid" "PASS"
    else
        test_result "GitHub workflow YAML is valid" "FAIL" "Syntax error in deploy.yml"
    fi
    
    # Test Ansible playbooks
    if [ -f "ansible/deploy-app.yml" ]; then
        if python3 -c "import yaml; yaml.safe_load(open('ansible/deploy-app.yml'))" 2>/dev/null; then
            test_result "Ansible deploy playbook YAML is valid" "PASS"
        else
            test_result "Ansible deploy playbook YAML is valid" "FAIL" "Syntax error in deploy-app.yml"
        fi
    fi
    
    if [ -f "ansible/setup-jenkins-job.yml" ]; then
        if python3 -c "import yaml; yaml.safe_load(open('ansible/setup-jenkins-job.yml'))" 2>/dev/null; then
            test_result "Ansible Jenkins playbook YAML is valid" "PASS"
        else
            test_result "Ansible Jenkins playbook YAML is valid" "FAIL" "Syntax error in setup-jenkins-job.yml"
        fi
    fi
    
    # Test docker-compose
    if [ -f "docker-compose.yml" ]; then
        if python3 -c "import yaml; yaml.safe_load(open('docker-compose.yml'))" 2>/dev/null; then
            test_result "docker-compose.yml is valid" "PASS"
        else
            test_result "docker-compose.yml is valid" "FAIL" "Syntax error in docker-compose.yml"
        fi
    fi
else
    test_result "YAML validation" "SKIP" "Python3 not available"
fi

echo ""

# Test 8: Check Jenkins connectivity (if configured)
echo -e "${BLUE}Testing Jenkins Connectivity...${NC}"

if [ -n "$JENKINS_URL" ] && [ -n "$JENKINS_USER" ] && [ -n "$JENKINS_TOKEN" ]; then
    # Test Jenkins API
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -u "${JENKINS_USER}:${JENKINS_TOKEN}" \
        "${JENKINS_URL}/api/json" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        test_result "Jenkins is accessible" "PASS"
        
        # Check if job exists
        JOB_NAME="${JENKINS_JOB_NAME:-golem-century-deploy}"
        JOB_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
            -u "${JENKINS_USER}:${JENKINS_TOKEN}" \
            "${JENKINS_URL}/job/${JOB_NAME}/api/json" 2>/dev/null || echo "000")
        
        if [ "$JOB_HTTP_CODE" = "200" ]; then
            test_result "Jenkins job exists" "PASS"
        elif [ "$JOB_HTTP_CODE" = "404" ]; then
            test_result "Jenkins job exists" "FAIL" "Job '${JOB_NAME}' not found. Run: ansible-playbook -i ansible/inventory.ini ansible/setup-jenkins-job.yml"
        else
            test_result "Jenkins job exists" "FAIL" "Cannot verify job (HTTP ${JOB_HTTP_CODE})"
        fi
    elif [ "$HTTP_CODE" = "401" ]; then
        test_result "Jenkins is accessible" "FAIL" "Authentication failed. Check JENKINS_USER and JENKINS_TOKEN"
    elif [ "$HTTP_CODE" = "000" ]; then
        test_result "Jenkins is accessible" "FAIL" "Cannot connect to ${JENKINS_URL}"
    else
        test_result "Jenkins is accessible" "FAIL" "HTTP ${HTTP_CODE}"
    fi
else
    test_result "Jenkins is accessible" "SKIP" ".env not configured"
fi

echo ""

# Test 9: Check GitHub secrets (if GH CLI is available and authenticated)
echo -e "${BLUE}Testing GitHub Secrets...${NC}"

if command -v gh &> /dev/null && gh auth status &> /dev/null; then
    SECRETS=$(gh secret list 2>/dev/null | awk '{print $1}' || echo "")
    
    if echo "$SECRETS" | grep -q "JENKINS_URL"; then
        test_result "JENKINS_URL secret exists" "PASS"
    else
        test_result "JENKINS_URL secret exists" "FAIL" "Run: ./scripts/setup-github-secrets.sh"
    fi
    
    if echo "$SECRETS" | grep -q "JENKINS_USER"; then
        test_result "JENKINS_USER secret exists" "PASS"
    else
        test_result "JENKINS_USER secret exists" "FAIL" "Run: ./scripts/setup-github-secrets.sh"
    fi
    
    if echo "$SECRETS" | grep -q "JENKINS_TOKEN"; then
        test_result "JENKINS_TOKEN secret exists" "PASS"
    else
        test_result "JENKINS_TOKEN secret exists" "FAIL" "Run: ./scripts/setup-github-secrets.sh"
    fi
    
    if echo "$SECRETS" | grep -q "JENKINS_JOB_NAME"; then
        test_result "JENKINS_JOB_NAME secret exists" "PASS"
    else
        test_result "JENKINS_JOB_NAME secret exists" "FAIL" "Run: ./scripts/setup-github-secrets.sh"
    fi
else
    test_result "GitHub secrets" "SKIP" "GitHub CLI not available or not authenticated"
fi

echo ""

# Summary
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}=========================================${NC}"
echo -e "Total Tests: ${TESTS_TOTAL}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"
echo -e "${BLUE}=========================================${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Review configuration in .env and ansible/inventory.ini"
    echo "2. Setup Jenkins job: ansible-playbook -i ansible/inventory.ini ansible/setup-jenkins-job.yml"
    echo "3. Configure GitHub secrets: ./scripts/setup-github-secrets.sh"
    echo "4. Test deployment: ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml"
    echo "5. Push to main branch to trigger automatic deployment"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please fix the issues above.${NC}"
    exit 1
fi
