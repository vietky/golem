#!/bin/bash
#
# CI/CD Pipeline Testing Guide
# This script helps you test each component of the CI/CD pipeline
#

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_step() {
    echo -e "${GREEN}▶${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header "CI/CD Pipeline Testing Guide"

echo "This guide will help you test the complete CI/CD pipeline step by step."
echo ""

# Test 1: Verify file structure
print_header "Test 1: Verify File Structure"

files_to_check=(
    "scripts/deploy.sh"
    "scripts/setup-github-secrets.sh"
    "ansible/deploy-playbook.yml"
    "ansible/jenkins-setup-playbook.yml"
    "ansible/templates/jenkins-job-config.xml.j2"
    "ansible/inventory.yml"
    ".github/workflows/deploy.yml"
    ".env.example"
    "docker-compose.yml"
)

all_files_exist=true
for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        print_success "$file exists"
    else
        print_error "$file is missing"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = true ]; then
    print_success "All required files are present"
else
    print_error "Some files are missing. Please check the setup."
    exit 1
fi

# Test 2: Verify script permissions
print_header "Test 2: Verify Script Permissions"

if [ -x "scripts/deploy.sh" ]; then
    print_success "deploy.sh is executable"
else
    print_error "deploy.sh is not executable"
    print_info "Run: chmod +x scripts/deploy.sh"
fi

if [ -x "scripts/setup-github-secrets.sh" ]; then
    print_success "setup-github-secrets.sh is executable"
else
    print_error "setup-github-secrets.sh is not executable"
    print_info "Run: chmod +x scripts/setup-github-secrets.sh"
fi

# Test 3: Validate script syntax
print_header "Test 3: Validate Script Syntax"

if bash -n scripts/deploy.sh 2>/dev/null; then
    print_success "deploy.sh syntax is valid"
else
    print_error "deploy.sh has syntax errors"
    exit 1
fi

if bash -n scripts/setup-github-secrets.sh 2>/dev/null; then
    print_success "setup-github-secrets.sh syntax is valid"
else
    print_error "setup-github-secrets.sh has syntax errors"
    exit 1
fi

# Test 4: Validate Ansible playbooks
print_header "Test 4: Validate Ansible Playbooks"

if command -v ansible-playbook >/dev/null 2>&1; then
    cd ansible
    
    if ansible-playbook --syntax-check deploy-playbook.yml 2>/dev/null; then
        print_success "deploy-playbook.yml syntax is valid"
    else
        print_error "deploy-playbook.yml has syntax errors"
    fi
    
    if ansible-playbook --syntax-check jenkins-setup-playbook.yml 2>/dev/null; then
        print_success "jenkins-setup-playbook.yml syntax is valid"
    else
        print_error "jenkins-setup-playbook.yml has syntax errors"
    fi
    
    cd ..
else
    print_info "Ansible not installed, skipping playbook validation"
    print_info "Install with: pip install ansible"
fi

# Test 5: Check inventory
print_header "Test 5: Check Ansible Inventory"

if [ -f "ansible/inventory.yml" ]; then
    server_ip=$(grep "ansible_host:" ansible/inventory.yml | awk '{print $2}' | head -1)
    if [ -n "$server_ip" ]; then
        print_success "Server IP found in inventory: $server_ip"
        
        # Try to ping the server
        if ping -c 1 -W 2 "$server_ip" >/dev/null 2>&1; then
            print_success "Server is reachable at $server_ip"
        else
            print_info "Server not reachable at $server_ip (might be behind firewall)"
        fi
    else
        print_error "No server IP found in inventory"
    fi
fi

# Test 6: Manual deployment test instructions
print_header "Test 6: Manual Deployment Test"

echo "To test manual deployment with Ansible:"
echo ""
echo "  1. Ensure you can SSH to the server:"
echo "     ssh -p 22 root@157.66.101.66"
echo ""
echo "  2. Run the deployment playbook:"
echo "     cd ansible"
echo "     ansible-playbook -i inventory.yml deploy-playbook.yml"
echo ""
echo "  3. Verify the application is running:"
echo "     curl http://157.66.101.66:8081/"
echo ""

read -p "Have you tested manual deployment? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_success "Manual deployment tested"
else
    print_info "Manual deployment not tested yet"
fi

# Test 7: Jenkins setup test instructions
print_header "Test 7: Jenkins Setup Test"

echo "To test Jenkins job setup:"
echo ""
echo "  1. Ensure Jenkins is running on the server:"
echo "     curl http://157.66.101.66:8080"
echo ""
echo "  2. Get your Jenkins API token:"
echo "     - Login to Jenkins"
echo "     - Click your username → Configure"
echo "     - Generate API Token"
echo ""
echo "  3. Set environment variables:"
echo "     export JENKINS_USER=your_username"
echo "     export JENKINS_TOKEN=your_api_token"
echo ""
echo "  4. Run the Jenkins setup playbook:"
echo "     cd ansible"
echo "     ansible-playbook -i inventory.yml jenkins-setup-playbook.yml"
echo ""
echo "  5. Verify job was created:"
echo "     http://157.66.101.66:8080/job/golem-century-deploy"
echo ""

read -p "Have you tested Jenkins setup? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_success "Jenkins setup tested"
else
    print_info "Jenkins setup not tested yet"
fi

# Test 8: GitHub Actions setup test instructions
print_header "Test 8: GitHub Actions Setup Test"

echo "To test GitHub Actions integration:"
echo ""
echo "  1. Create .env file from example:"
echo "     cp .env.example .env"
echo ""
echo "  2. Edit .env with your Jenkins credentials"
echo ""
echo "  3. Run the setup script:"
echo "     ./scripts/setup-github-secrets.sh"
echo ""
echo "  4. Verify secrets were set:"
echo "     gh secret list"
echo ""
echo "  5. Make a test commit and push to main:"
echo "     git add ."
echo "     git commit -m 'Test CI/CD pipeline'"
echo "     git push origin main"
echo ""
echo "  6. Check GitHub Actions:"
echo "     https://github.com/vietky/golem/actions"
echo ""
echo "  7. Check Jenkins build:"
echo "     http://157.66.101.66:8080/job/golem-century-deploy"
echo ""

read -p "Have you tested GitHub Actions? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_success "GitHub Actions tested"
else
    print_info "GitHub Actions not tested yet"
fi

# Test 9: End-to-end test
print_header "Test 9: End-to-End Test"

echo "For a complete end-to-end test:"
echo ""
echo "  1. Make a small change to the code (e.g., update README.md)"
echo "  2. Commit and push to main:"
echo "     git add README.md"
echo "     git commit -m 'Test: Update README'"
echo "     git push origin main"
echo ""
echo "  3. Watch the pipeline:"
echo "     - GitHub Actions triggers (1-2 seconds)"
echo "     - Jenkins job starts (5-10 seconds)"
echo "     - Deployment runs (1-2 minutes)"
echo "     - Application restarts"
echo ""
echo "  4. Verify deployment:"
echo "     curl http://157.66.101.66:8081/"
echo ""

read -p "Have you tested end-to-end deployment? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_success "End-to-end deployment tested"
else
    print_info "End-to-end deployment not tested yet"
fi

# Summary
print_header "Testing Summary"

echo "Pre-flight checks completed. Next steps:"
echo ""
echo "1. Test manual deployment with Ansible"
echo "2. Setup Jenkins job"
echo "3. Configure GitHub Actions secrets"
echo "4. Test end-to-end by pushing to main"
echo ""
echo "For detailed instructions, see: docs/CICD_README.md"
echo ""

print_success "Pre-flight checks complete!"
