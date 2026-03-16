#!/bin/bash
# Quick validation of Frontend Deployment Fix

set -e

echo "================================================"
echo "Frontend Deployment Fix - Quick Validation"
echo "================================================"
echo ""

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ANSIBLE_FILE="$PROJECT_ROOT/ansible/deploy-frontend-gateway.yml"
K8S_FILE="$PROJECT_ROOT/deployment/base/golem-app/nginx-deployment.yaml"
VERIFY_SCRIPT="$PROJECT_ROOT/scripts/verify-frontend-deployment.sh"
MAKEFILE="$PROJECT_ROOT/Makefile"

echo "✓ Checking files exist..."
[ -f "$ANSIBLE_FILE" ] && echo "  ✓ Ansible playbook found" || { echo "  ✗ Ansible playbook missing"; exit 1; }
[ -f "$K8S_FILE" ] && echo "  ✓ K8s deployment YAML found" || { echo "  ✗ K8s deployment YAML missing"; exit 1; }
[ -f "$VERIFY_SCRIPT" ] && echo "  ✓ Verification script found" || { echo "  ✗ Verification script missing"; exit 1; }
[ -f "$MAKEFILE" ] && echo "  ✓ Makefile found" || { echo "  ✗ Makefile missing"; exit 1; }
echo ""

echo "✓ Checking versioned image tag support..."
grep -q "versioned_image_tag" "$ANSIBLE_FILE" && echo "  ✓ Versioned tags implemented" || { echo "  ✗ Versioned tags not found"; exit 1; }
grep -q "build_timestamp" "$ANSIBLE_FILE" && echo "  ✓ Timestamp generation found" || { echo "  ✗ Timestamp not found"; exit 1; }
grep -q "git_commit" "$ANSIBLE_FILE" && echo "  ✓ Git commit tracking found" || { echo "  ✗ Git commit not found"; exit 1; }
echo ""

echo "✓ Checking pod restart annotation..."
grep -q "deployment.kubernetes.io/restart" "$ANSIBLE_FILE" && echo "  ✓ Restart annotation in playbook" || { echo "  ✗ Restart annotation missing"; exit 1; }
grep -q "deployment.kubernetes.io/restart" "$K8S_FILE" && echo "  ✓ Restart annotation in K8s YAML" || { echo "  ✗ Restart annotation missing from YAML"; exit 1; }
echo ""

echo "✓ Checking automatic image pull..."
grep -q "imagePullPolicy: Always" "$K8S_FILE" && echo "  ✓ imagePullPolicy set to Always" || { echo "  ✗ imagePullPolicy not Always"; exit 1; }
echo ""

echo "✓ Checking kubectl patch usage..."
grep -q "kubectl patch" "$ANSIBLE_FILE" && echo "  ✓ Using kubectl patch for updates" || { echo "  ✗ kubectl patch not found"; exit 1; }
echo ""

echo "✓ Checking verification mechanisms..."
grep -q "Running image:" "$ANSIBLE_FILE" && echo "  ✓ Image verification in playbook" || { echo "  ✗ Image verification missing"; exit 1; }
[ -x "$VERIFY_SCRIPT" ] && echo "  ✓ Verification script is executable" || echo "  ⚠ Verification script not executable (fixing...)" && chmod +x "$VERIFY_SCRIPT"
grep -q "Frontend HTTP test" "$ANSIBLE_FILE" && echo "  ✓ HTTP endpoint test in playbook" || { echo "  ✗ HTTP test missing"; exit 1; }
echo ""

echo "✓ Checking CDN configuration..."
grep -q "VITE_NGINX_HOST" "$ANSIBLE_FILE" && echo "  ✓ CDN host environment variable" || { echo "  ✗ CDN host not found"; exit 1; }
grep -q "statics.vietky.io.vn" "$ANSIBLE_FILE" && echo "  ✓ CDN endpoint configured" || { echo "  ✗ CDN endpoint not configured"; exit 1; }
echo ""

echo "✓ Checking Makefile commands..."
grep -q "k3s-frontend-test:" "$MAKEFILE" && echo "  ✓ Deploy + test command added" || { echo "  ✗ Deploy + test command missing"; exit 1; }
grep -q "k3s-frontend-verify:" "$MAKEFILE" && echo "  ✓ Verification command added" || { echo "  ✗ Verification command missing"; exit 1; }
echo ""

echo "✓ Checking documentation..."
DOC_FILE="$PROJECT_ROOT/docs/FRONTEND_DEPLOYMENT_FIX.md"
[ -f "$DOC_FILE" ] && echo "  ✓ Deployment documentation found" || echo "  ⚠ Documentation file not found (warning only)"

DOC_FILE2="$PROJECT_ROOT/docs/FRONTEND_DEPLOYMENT_UPDATE_COMPLETE.md"
[ -f "$DOC_FILE2" ] && echo "  ✓ Complete summary found" || echo "  ⚠ Summary file not found (warning only)"
echo ""

echo "================================================"
echo "✅ All validations passed!"
echo "================================================"
echo ""
echo "Quick Start:"
echo ""
echo "1. Deploy to PROD with verification:"
echo "   make k3s-frontend-test"
echo ""
echo "2. Deploy to STAGING with verification:"
echo "   make k3s-frontend-test-staging"
echo ""
echo "3. Only verify existing deployment:"
echo "   make k3s-frontend-verify"
echo ""
echo "Key Changes:"
echo "  • Uses versioned image tags (latest-timestamp-hash)"
echo "  • Pod restart annotation forces new image pull"
echo "  • Always builds to ensure fresh code"
echo "  • Comprehensive verification after deploy"
echo "  • CDN configuration automatic"
echo ""
echo "Documentation:"
echo "  • docs/FRONTEND_DEPLOYMENT_FIX.md"
echo "  • docs/FRONTEND_DEPLOYMENT_UPDATE_COMPLETE.md"
echo ""
