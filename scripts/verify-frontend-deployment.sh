#!/bin/bash
# Test Frontend Deployment After CDN Migration

set -e

DEPLOY_ENV=${1:-production}
KUBECONFIG=${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}

if [ "$DEPLOY_ENV" == "production" ]; then
  NAMESPACE="default"
  DEPLOYMENT="golem-nginx"
  FRONTEND_URL="https://apps.vietky.io.vn/apps/golem/"
  CDN_HOST="https://statics.vietky.io.vn"
elif [ "$DEPLOY_ENV" == "staging" ]; then
  NAMESPACE="staging"
  DEPLOYMENT="golem-nginx-staging"
  FRONTEND_URL="https://apps.vietky.io.vn/apps/golem-staging/"
  CDN_HOST="https://apps.vietky.io.vn/assets"
else
  echo "Usage: $0 [production|staging]"
  exit 1
fi

echo "================================================"
echo "Frontend Deployment Verification - $DEPLOY_ENV"
echo "================================================"
echo ""

# 1. Check deployment status
echo "✓ Checking deployment status..."
kubectl get deployment -n "$NAMESPACE" "$DEPLOYMENT" -o wide || {
  echo "✗ Deployment not found"
  exit 1
}
echo ""

# 2. Check pod status
echo "✓ Checking pod status..."
POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app=golem,tier=frontend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -z "$POD_NAME" ]; then
  echo "✗ No frontend pod found"
  exit 1
fi
echo "  Pod: $POD_NAME"

POD_STATUS=$(kubectl get pod -n "$NAMESPACE" "$POD_NAME" -o jsonpath='{.status.phase}')
echo "  Status: $POD_STATUS"

if [ "$POD_STATUS" != "Running" ]; then
  echo "✗ Pod is not running"
  exit 1
fi
echo ""

# 3. Verify running image
echo "✓ Checking running image..."
RUNNING_IMAGE=$(kubectl get pod -n "$NAMESPACE" "$POD_NAME" -o jsonpath='{.spec.containers[0].image}')
echo "  Image: $RUNNING_IMAGE"

if [[ ! "$RUNNING_IMAGE" =~ "golem-frontend" ]]; then
  echo "✗ Unexpected image running"
  exit 1
fi
echo ""

# 4. Check pod readiness
echo "✓ Checking pod readiness probes..."
READY_STATUS=$(kubectl get pod -n "$NAMESPACE" "$POD_NAME" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
echo "  Ready: $READY_STATUS"

if [ "$READY_STATUS" != "True" ]; then
  echo "✗ Pod is not ready"
  exit 1
fi
echo ""

# 5. Check image pull policy
echo "✓ Checking image pull policy..."
IMAGE_PULL_POLICY=$(kubectl get pod -n "$NAMESPACE" "$POD_NAME" -o jsonpath='{.spec.containers[0].imagePullPolicy}')
echo "  Policy: $IMAGE_PULL_POLICY"

if [ "$IMAGE_PULL_POLICY" != "Always" ]; then
  echo "⚠ Warning: Image pull policy is not 'Always' (current: $IMAGE_PULL_POLICY)"
fi
echo ""

# 6. Check recent pod logs
echo "✓ Checking pod logs (last 20 lines)..."
echo "---"
kubectl logs -n "$NAMESPACE" "$POD_NAME" --tail=20 | head -20 || echo "  (No logs available yet)"
echo "---"
echo ""

# 7. Test frontend endpoint
echo "✓ Testing frontend endpoint..."
echo "  URL: $FRONTEND_URL"

RETRY_COUNT=0
MAX_RETRIES=10
RESPONSE_CODE=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  RESPONSE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" -k 2>/dev/null || echo "000")
  
  if [ "$RESPONSE_CODE" == "200" ] || [ "$RESPONSE_CODE" == "304" ]; then
    echo "  HTTP Response: $RESPONSE_CODE ✓"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "  Attempt $RETRY_COUNT/$MAX_RETRIES - Response: $RESPONSE_CODE, retrying in 3s..."
    sleep 3
  fi
done

if [ "$RESPONSE_CODE" != "200" ] && [ "$RESPONSE_CODE" != "304" ]; then
  echo "  ✗ Frontend endpoint returned: $RESPONSE_CODE"
  exit 1
fi
echo ""

# 8. Verify CDN configuration
echo "✓ Verifying CDN configuration..."
echo "  Expected CDN: $CDN_HOST"

# Check if CDN is configured in the built HTML/JS
CDN_FOUND=$(curl -s "$FRONTEND_URL" -k 2>/dev/null | grep -c "$CDN_HOST" || echo "0")

if [ "$CDN_FOUND" -gt "0" ]; then
  echo "  CDN found in frontend: yes ($CDN_FOUND references)"
else
  echo "  ⚠ Warning: CDN might not be properly configured (expected: $CDN_HOST)"
fi
echo ""

# 9. Check deployment rollout history
echo "✓ Checking deployment history..."
kubectl rollout history -n "$NAMESPACE" deployment/"$DEPLOYMENT" | tail -5
echo ""

# 10. Summary
echo "================================================"
echo "✅ Frontend Deployment Verification Complete"
echo "================================================"
echo ""
echo "Environment: $DEPLOY_ENV"
echo "Namespace: $NAMESPACE"
echo "Deployment: $DEPLOYMENT"
echo "Pod: $POD_NAME"
echo "Running Image: $RUNNING_IMAGE"
echo "Pod Status: $POD_STATUS"
echo "Ready: $READY_STATUS"
echo "Frontend URL: $FRONTEND_URL"
echo "CDN Host: $CDN_HOST"
echo ""
echo "All checks passed! ✓"
