#!/bin/bash

# Script to install NGINX Ingress Controller on k3s cluster
# This script should be run on the k3s server or via SSH

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

print_step "Installing NGINX Ingress Controller for k3s..."

# Check if ingress controller is already installed
if kubectl get namespace ingress-nginx &> /dev/null; then
    print_warn "ingress-nginx namespace already exists."
    read -p "Do you want to reinstall? (yes/no): " reinstall
    if [ "$reinstall" != "yes" ]; then
        print_info "Installation cancelled."
        exit 0
    fi
    print_warn "Removing existing ingress-nginx installation..."
    kubectl delete namespace ingress-nginx --wait=true --timeout=60s || true
fi

# Install NGINX Ingress Controller using official manifest
# Using the bare-metal/NodePort installation for k3s
print_step "Applying NGINX Ingress Controller manifest..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/cloud/deploy.yaml

# Wait for the ingress controller to be ready
print_step "Waiting for NGINX Ingress Controller to be ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

# Verify installation
print_step "Verifying installation..."
if kubectl get pods -n ingress-nginx | grep -q "Running"; then
    print_info "✓ NGINX Ingress Controller installed successfully!"
    echo ""
    print_info "Controller pods:"
    kubectl get pods -n ingress-nginx
    echo ""
    print_info "Services:"
    kubectl get svc -n ingress-nginx
    echo ""
    print_info "IngressClass:"
    kubectl get ingressclass
else
    print_error "Installation verification failed!"
    exit 1
fi

print_info "Installation complete!"
print_info "You can now use ingressClassName: nginx in your Ingress resources."
