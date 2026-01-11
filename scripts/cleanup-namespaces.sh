#!/bin/bash

# Script to clean up golem and golem-staging namespaces
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

# Function to cleanup a namespace
cleanup_namespace() {
    local namespace=$1
    
    print_info "Checking if namespace '$namespace' exists..."
    
    if kubectl get namespace "$namespace" &> /dev/null; then
        print_warn "Deleting all resources in namespace '$namespace'..."
        
        # Delete all resources in the namespace
        kubectl delete all --all -n "$namespace" --wait=true --timeout=60s || true
        
        # Delete configmaps and secrets
        kubectl delete configmap --all -n "$namespace" --wait=true --timeout=30s || true
        kubectl delete secret --all -n "$namespace" --wait=true --timeout=30s || true
        
        # Delete PVCs if any
        kubectl delete pvc --all -n "$namespace" --wait=true --timeout=30s || true
        
        # Delete ingress resources
        kubectl delete ingress --all -n "$namespace" --wait=true --timeout=30s || true
        
        # Finally, delete the namespace itself
        print_warn "Deleting namespace '$namespace'..."
        kubectl delete namespace "$namespace" --wait=true --timeout=60s || true
        
        print_info "Namespace '$namespace' cleaned up successfully!"
    else
        print_info "Namespace '$namespace' does not exist, skipping..."
    fi
}

# Parse arguments
ENV=${1:-all}

case $ENV in
    staging)
        print_info "Cleaning up STAGING environment only..."
        cleanup_namespace "golem-staging"
        ;;
    production)
        print_warn "⚠️  You are about to delete PRODUCTION namespace!"
        read -p "Are you sure? (type 'yes' to confirm): " confirm
        if [ "$confirm" = "yes" ]; then
            cleanup_namespace "golem"
        else
            print_info "Cleanup cancelled."
            exit 0
        fi
        ;;
    all)
        print_warn "⚠️  You are about to delete BOTH staging and production namespaces!"
        cleanup_namespace "golem-staging"
        cleanup_namespace "golem"
        ;;
esac

print_info "Cleanup complete!"
