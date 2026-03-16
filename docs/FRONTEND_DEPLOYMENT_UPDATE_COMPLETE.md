# Frontend Deployment Fix - Complete Summary

## Problem Identified
New frontend code changes were not being picked up by Kubernetes even though:
- Code was pushed to the repository
- Docker image was built and pushed to registry
- K8s had `imagePullPolicy: Always`

**Root Cause**: Kubernetes caches the `latest` tag locally. Without forcing a pod restart or using a unique image tag, Kubernetes wouldn't pull the new image even with `Always` pull policy.

## Solution Implemented

### 1. Versioned Image Tags (ansible/deploy-frontend-gateway.yml)
- **Before**: Always built as `golem-frontend:latest`
- **After**: 
  - Builds with versioned tag: `golem-frontend:latest-20260316T143000-a1b2c3d`
  - Also tags as `latest` for fallback
  - Both tags pushed to registry
  - Enables tracking which exact build is running

### 2. Pod Restart Annotation
- **Before**: Manual restart was unreliable
- **After**: 
  - Adds unique timestamp annotation: `deployment.kubernetes.io/restart: "1710681234"`
  - Forces Kubernetes to recreate pod on every deploy
  - New pod triggers `imagePullPolicy: Always` to fetch latest image
  - Annotation value changes on each deploy, forcing pod recreation

### 3. Direct Image Patch
- **Before**: Used `kubectl rollout restart` (could skip if image exists)
- **After**:
  - Uses `kubectl patch` to directly update container image
  - Patches image with versioned tag in one operation
  - Ensures immediate and guaranteed pod restart
  - Verifies running image matches built version

### 4. Always Build
- **Before**: Checked if image exists before building
- **After**:
  - Always rebuilds frontend on every deploy
  - Ensures environment variables (CDN URLs, API hosts) are current
  - No caching issues or stale builds
  - Total rebuild time: ~2-3 minutes

### 5. Comprehensive Verification
- **Before**: Only checked pod status
- **After**: Full verification suite:
  - ✓ Deployment exists and is running
  - ✓ Pod is in Running state
  - ✓ Running image matches built version
  - ✓ Pod readiness probes passing
  - ✓ Image pull policy is Always
  - ✓ Pod logs are healthy
  - ✓ Frontend endpoint responds (HTTP 200/304)
  - ✓ CDN configuration is present
  - ✓ Deployment rollout history

## Files Modified

### 1. `ansible/deploy-frontend-gateway.yml`
- **Changes**: 
  - Generate versioned image tags (timestamp + git commit)
  - Capture git commit hash for tracking
  - Force build every time
  - Use kubectl patch with timestamp annotation
  - Enhanced verification with image matching and logs
  - Test frontend endpoint with retries
  - Show CDN configuration in output

### 2. `deployment/base/golem-app/nginx-deployment.yaml`
- **Changes**:
  - Added restart annotation (template for Ansible to update)
  - Enhanced liveness probe (initialDelaySeconds: 10, failureThreshold: 3)
  - Enhanced readiness probe (initialDelaySeconds: 5, failureThreshold: 2)
  - Explicit documentation of imagePullPolicy: Always

### 3. New File: `scripts/verify-frontend-deployment.sh`
- 10 verification checks
- Works with both staging and production
- Detailed status output
- HTTP endpoint testing with retries
- CDN configuration verification
- Pod log inspection

### 4. `Makefile` - New Commands
```bash
make k3s-frontend               # Deploy to PROD
make k3s-frontend-staging       # Deploy to STAGING
make k3s-frontend-verify        # Verify PROD deployment
make k3s-frontend-verify-staging # Verify STAGING deployment
make k3s-frontend-test          # Deploy + Verify PROD
make k3s-frontend-test-staging  # Deploy + Verify STAGING
```

### 5. `docs/FRONTEND_DEPLOYMENT_FIX.md`
- Complete technical documentation
- Troubleshooting guide
- Deployment procedures
- Architecture explanation

## How to Deploy

### Quick Deploy (PROD)
```bash
make k3s-frontend-test
```

### Quick Deploy (STAGING)
```bash
make k3s-frontend-test-staging
```

### Manual Deploy (PROD)
```bash
cd ansible
DEPLOY_ENV=production ansible-playbook -i inventory.ini deploy-frontend-gateway.yml
```

### Verify After Deploy (PROD)
```bash
make k3s-frontend-verify
```

## Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Image Tagging** | `latest` only (cached) | `latest-timestamp-hash` (unique) |
| **Pod Update** | Rollout restart (unreliable) | Annotation patch (guaranteed) |
| **Build Strategy** | Conditional (stale builds) | Always (always fresh) |
| **Verification** | Basic status check | 10-point comprehensive check |
| **CDN Support** | Manual config | Automatic, verified |
| **Image Tracking** | No way to trace | Git commit + timestamp in tag |
| **Error Detection** | Minimal | Comprehensive with logs |
| **Dev Experience** | Manual verification | Fully automated |

## Technical Details

### Versioned Tag Format
```
golem-frontend:{base}-{timestamp}-{git_commit}
golem-frontend:latest-20260316T143000-a1b2c3d
└─ base: latest/staging
└─ timestamp: 20260316T143000 (ISO8601 basic short)
└─ git_commit: a1b2c3d (short form, 7 chars)
```

### Pod Restart Mechanism
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: golem-nginx
spec:
  template:
    metadata:
      annotations:
        deployment.kubernetes.io/restart: "1710681234"  # ← Changes on each deploy
    spec:
      containers:
      - name: nginx
        image: "10.100.0.2:5000/golem-frontend:latest-20260316T143000-a1b2c3d"  # ← New version
        imagePullPolicy: Always  # ← Always fetches from registry
```

When annotation changes:
1. Kubernetes detects pod template change
2. Starts rolling update with new pod
3. New pod triggers `imagePullPolicy: Always`
4. Image is pulled from registry regardless of cache

## Verification Output Example

```
================================================
✅ Frontend deployment successful!
================================================

Environment: PRODUCTION
Namespace: default
Deployment: golem-nginx
Pod: golem-nginx-5d4b6c7e8f9g

Image Information:
  Built tag: latest-20260316T143000-a1b2c3d
  Running image: 10.100.0.2:5000/golem-frontend:latest-20260316T143000-a1b2c3d
  Registry: 10.100.0.2:5000

CDN Configuration:
  CDN Host: https://statics.vietky.io.vn
  Images serve from: https://statics.vietky.io.vn/images
  Sounds serve from: https://statics.vietky.io.vn/sounds

Verification:
  Frontend HTTP test: PASSED ✓
  Pod status: Ready
  Rollout status: deployment "golem-nginx" successfully rolled out
```

## Troubleshooting

### New code still not showing
1. Check running image: `kubectl get pod -n default <pod> -o jsonpath='{.spec.containers[0].image}'`
2. Verify it shows versioned tag format: `latest-TIMESTAMP-HASH`
3. If showing `latest` only: Pod wasn't patched, re-run playbook

### Image pull failed
1. Check if image exists: `curl -s http://10.100.0.2:5000/v2/golem-frontend/tags/list`
2. Check pod events: `kubectl describe pod -n default <pod>`
3. Re-run playbook to rebuild and push

### Pod stuck in old version
1. Force update with annotation: `kubectl patch deployment golem-nginx -p '{"spec":{"template":{"metadata":{"annotations":{"deployment.kubernetes.io/restart":"'$(date +%s)'"}}}}}'`
2. Or re-run the Ansible playbook

## Commands Quick Reference

```bash
# Deploy and verify PROD
make k3s-frontend-test

# Deploy and verify STAGING
make k3s-frontend-test-staging

# Only deploy PROD
make k3s-frontend

# Only deploy STAGING
make k3s-frontend-staging

# Only verify PROD
make k3s-frontend-verify

# Only verify STAGING
make k3s-frontend-verify-staging

# Manual Ansible deploy PROD
cd ansible && DEPLOY_ENV=production ansible-playbook -i inventory.ini deploy-frontend-gateway.yml

# Manual SSH verify PROD
ssh root@157.66.101.66 'bash -s production' < scripts/verify-frontend-deployment.sh
```

## Benefits

✅ **Guaranteed Updates**: No caching issues, code always picked up
✅ **Tracked Deployments**: Know exactly which commit is running
✅ **Automated Verification**: No manual checking required
✅ **Fast Feedback**: Playbook reports success/failure immediately
✅ **Easy Rollback**: All versions stay in registry
✅ **CDN Ready**: Automatically configured
✅ **Production Safe**: Comprehensive health checks before considering deployment successful

## Migration Notes

- No breaking changes to existing deployments
- Backward compatible with older images in registry
- Old `latest` tag still works (pulls new versioned image)
- Environment variables remain same
- K8s manifests only enhanced, not changed in functionality
