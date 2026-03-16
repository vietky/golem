# Frontend Deployment Update - Code Change Detection

## Problem
When using `latest` image tag in Kubernetes, new code changes wouldn't be picked up even though:
- Code was pushed to the repository
- Ansible playbook built a new image
- Image was pushed to the registry
- K8s had `imagePullPolicy: Always`

The issue was that Kubernetes has an optimization where it **caches the `latest` tag locally** and doesn't recognize when a new image is pushed to the registry unless the pod is forcefully recreated.

## Solution

### 1. Versioned Image Tags
**File**: `ansible/deploy-frontend-gateway.yml`

The playbook now:
- Generates a **versioned tag** combining timestamp + git commit hash: `latest-20260316-143000-a1b2c3d`
- Builds the image with BOTH tags:
  - Versioned tag (for tracking and verification)
  - Base tag (`latest` or `staging`)
- Always pushes both tags to the registry

```bash
# Example build output:
# Tag 1: golem-frontend:latest-20260316-143000-a1b2c3d  (versioned)
# Tag 2: golem-frontend:latest                          (base)
```

### 2. Pod Restart Annotation
The playbook patches the deployment with a **unique annotation** to force pod recreation on every deploy:

```yaml
annotations:
  deployment.kubernetes.io/restart: "1710681234"  # Unix timestamp - changes on each deploy
```

This forces Kubernetes to create a new pod, which triggers `imagePullPolicy: Always` to fetch the latest image.

### 3. Direct Image Patch
Instead of `kubectl rollout restart`, the playbook uses `kubectl patch` to:
- Directly update the image reference with the versioned tag
- Add/update the restart annotation in one operation
- Ensure the new pod always pulls the freshly built image

```bash
kubectl patch deployment golem-nginx -p '{
  "spec": {
    "template": {
      "metadata": {"annotations": {"deployment.kubernetes.io/restart": "'$(date +%s)'"}},
      "spec": {"containers": [{"name": "nginx", "image": "10.100.0.2:5000/golem-frontend:latest-20260316-143000-a1b2c3d"}]}
    }
  }
}'
```

### 4. Always Build
Removed the image existence check - the playbook now:
- **Always rebuilds** the frontend with fresh code
- **Always rebuilds** ensures environment variables (CDN URLs, API hosts) are correct

## Files Changed

### 1. `ansible/deploy-frontend-gateway.yml`
**Key changes:**
- Generate versioned image tag with timestamp + git commit hash
- Get git commit for tracking
- Always build (no existence checks)
- Use `kubectl patch` with annotation to force pod restart
- Enhanced verification with pod image check, logs, and endpoint testing

### 2. `deployment/base/golem-app/nginx-deployment.yaml`
**Key changes:**
- Added restart annotation placeholder (updated by Ansible)
- Enhanced liveness and readiness probes with failure thresholds
- Explicit `imagePullPolicy: Always` (was already set but now documented)

### 3. New File: `scripts/verify-frontend-deployment.sh`
**Purpose:** Complete verification script that checks:
1. Deployment exists and is running
2. Pod is in Running state
3. Running image matches built version
4. Pod readiness probes are passing
5. `imagePullPolicy` is set to `Always`
6. Recent pod logs are healthy
7. Frontend endpoint responds with 200/304
8. CDN configuration is present in the served HTML
9. Deployment rollout history

## How to Deploy

### Method 1: Using Ansible Playbook
```bash
cd /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century

# Production deployment
DEPLOY_ENV=production ansible-playbook -i ansible/inventory.ini ansible/deploy-frontend-gateway.yml

# Staging deployment
DEPLOY_ENV=staging ansible-playbook -i ansible/inventory.ini ansible/deploy-frontend-gateway.yml
```

### Method 2: Manual Verification
After running the playbook:

```bash
# Set environment
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Verify production deployment
./scripts/verify-frontend-deployment.sh production

# Verify staging deployment
./scripts/verify-frontend-deployment.sh staging
```

## Verification Output

The Ansible playbook provides detailed output:

```
================================
✅ Frontend deployment successful!
================================

Environment: PRODUCTION
Namespace: default
Deployment: golem-nginx
Pod: golem-nginx-abc123def456

Image Information:
  Built tag: latest-20260316-143000-a1b2c3d
  Running image: 10.100.0.2:5000/golem-frontend:latest-20260316-143000-a1b2c3d
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

### Pod not updating after deployment
1. Check if the pod has the new image:
```bash
kubectl get pod -n default golem-nginx-<hash> -o jsonpath='{.spec.containers[0].image}'
```

2. Verify the restart annotation was applied:
```bash
kubectl get pod -n default golem-nginx-<hash> -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/restart}'
```

3. Check pod logs:
```bash
kubectl logs -n default golem-nginx-<hash> --tail=50
```

### Image pull errors
1. Check if image exists in registry:
```bash
curl -s http://10.100.0.2:5000/v2/golem-frontend/tags/list | jq .
```

2. Check pod events:
```bash
kubectl describe pod -n default <pod-name>
```

### Frontend still showing old code
1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Verify CDN URLs are correct
3. Check if new pod is actually running (not old one):
```bash
kubectl get pods -n default -l app=golem,tier=frontend -o wide
```

## Technical Details

### Image Tagging Strategy
- **Versioned tag format**: `{base}-{timestamp}-{git_commit}`
- **Timestamp format**: ISO8601 basic short (e.g., `20260316T143000`)
- **Git commit**: Short form, 7 characters
- **Example**: `latest-20260316T143000-a1b2c3d`

### Annotation-Based Pod Recreation
The `deployment.kubernetes.io/restart` annotation:
- Contains a Unix timestamp
- Changes on every deployment
- Forces Kubernetes to see the pod template as different
- Triggers rollout with new pod creation
- Combined with `imagePullPolicy: Always`, ensures latest image is pulled

### Build Arguments
The docker build receives:
- `VITE_API_HOST`: Backend API endpoint
- `VITE_NGINX_HOST`: CDN/static assets host

These ensure the built frontend uses correct URLs for:
- WebSocket connections (to backend)
- Asset loading (to CDN or local assets)

## Benefits

✅ **Deterministic Updates**: Every deploy is fresh, no caching issues
✅ **Versioned Tracking**: Can trace which exact build is running
✅ **Automatic Verification**: Playbook tests after deployment
✅ **CDN Ready**: Automatically configured with correct endpoints
✅ **Rollback Safe**: Previous versions still in registry
✅ **No Manual Intervention**: Fully automated
✅ **Production Ready**: Comprehensive health checks

## Notes

- The playbook always rebuilds to ensure environment variables are correct
- Image registry must be accessible at `10.100.0.2:5000` (configured in playbook)
- KUBECONFIG must be set or available at `/etc/rancher/k3s/k3s.yaml`
- Deployments timeout at 180 seconds - adjust as needed
- Pod tests include 10 retries with 3-second delays for eventual consistency
