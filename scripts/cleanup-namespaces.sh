#!/bin/bash

# Script to clean up staging and default (production) namespaces
# Usage: ./cleanup-namespaces.sh [staging|production|all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Function to cleanup resources by label in a namespace
cleanup_resources() {
    local namespace=$1
    
    print_info "Checking namespace '$namespace'..."
    
    if kubectl get namespace "$namespace" &> /dev/null; then
        print_warn "Deleting golem resources in namespace '$namespace'..."
        
        # Delete all resources with app=golem label
        kubectl delete all -l app=golem -n "$namespace" --wait=true --timeout=60s || true
        
        # Delete configmaps and secrets with app=golem label
        kubectl delete configmap -l app=golem -n "$namespace" --wait=true --timeout=30s || true
        kubectl delete secret -l app=golem -n "$namespace" --wait=true --timeout=30s || true
        
        # Delete PVCs with app=golem label
        kubectl delete pvc -l app=golem -n "$namespace" --wait=true --timeout=30s || true
        
        print_info "Golem resources in namespace '$namespace' cleaned up successfully!"
    else
        print_info "Namespace '$namespace' does not exist, skipping..."
    fi
}

# Parse arguments
ENV=${1:-all}

case $ENV in
    staging)
        print_info "Cleaning up STAGING environment only..."
        cleanup_resources "staging"
        ;;
    production)
        print_warn "⚠️  You are about to delete PRODUCTION resources from default namespace!"
        read -p "Are you sure? (type 'yes' to confirm): " confirm
        if [ "$confirm" = "yes" ]; then
            cleanup_resources "default"
        else
            print_info "Cleanup cancelled."
            exit 0
        fi
        ;;
    all)
        print_warn "⚠️  You are about to delete resources from BOTH staging and production!"
        cleanup_resources "staging"
        cleanup_resources "default"
        ;;
esac

print_info "Cleanup complete!"
