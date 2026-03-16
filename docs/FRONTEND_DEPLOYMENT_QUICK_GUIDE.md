# Frontend Deployment Fix - Quick Reference

## The Problem
```
Push code → Build image → Push to registry → Deploy
                          ↓
                    Image cached by K8s
                          ↓
                    Pod sees cached image
                          ↓
                    Code not updated ✗
```

## The Solution
```
Push code → Build with versioned tag (latest-time-hash)
                    ↓
            Update pod annotation to current timestamp
                    ↓
            K8s sees new pod template (annotation changed)
                    ↓
            Pod restarts with imagePullPolicy: Always
                    ↓
            Fetches new versioned image from registry
                    ↓
            Code is updated ✓
```

## Deploy Commands

| Command | Purpose |
|---------|---------|
| `make k3s-frontend-test` | Deploy PROD + Verify |
| `make k3s-frontend-test-staging` | Deploy STAGING + Verify |
| `make k3s-frontend` | Deploy PROD only |
| `make k3s-frontend-staging` | Deploy STAGING only |
| `make k3s-frontend-verify` | Verify PROD deployment |
| `make k3s-frontend-verify-staging` | Verify STAGING deployment |

## What Changed

### Image Tagging
**Before:**
```
golem-frontend:latest  ← cached by K8s, hard to track
```

**After:**
```
golem-frontend:latest-20260316T143000-a1b2c3d  ← unique, traceable
golem-frontend:latest                           ← links to versioned tag
```

### Pod Update Mechanism
**Before:**
```bash
kubectl rollout restart deployment/golem-nginx
```

**After:**
```bash
kubectl patch deployment golem-nginx \
  -p '{"spec":{"template":{"metadata":{"annotations":{"deployment.kubernetes.io/restart":"'$(date +%s)'"}}}}}' 
```
→ Forces pod recreation with new image pull

### Verification
**Before:**
```bash
# Manual checks needed
kubectl get pod
kubectl logs <pod>
curl http://endpoint/
```

**After:**
```bash
# Run single command
make k3s-frontend-verify
# Gets: deployment status, pod status, image verification, HTTP test, CDN check, etc.
```

## Example Output

```
================================================
✅ Frontend deployment successful!
================================================

Image Information:
  Built tag: latest-20260316T143000-a1b2c3d
  Running image: 10.100.0.2:5000/golem-frontend:latest-20260316T143000-a1b2c3d

CDN Configuration:
  CDN Host: https://statics.vietky.io.vn

Verification:
  Frontend HTTP test: PASSED ✓
  Pod status: Ready
```

## Troubleshooting

### Pod shows old image
```bash
# Check running image
kubectl get pod -n default <pod> -o jsonpath='{.spec.containers[0].image}'

# Should show versioned tag like: latest-TIMESTAMP-HASH
# If shows just 'latest', pod wasn't properly patched - re-run make k3s-frontend
```

### Image build fails
```bash
# Re-run deployment (builds and pushes)
make k3s-frontend

# Manual check if image exists in registry
curl -s http://10.100.0.2:5000/v2/golem-frontend/tags/list | jq
```

### Frontend still shows old code
1. Hard refresh browser: `Ctrl+Shift+R` (Win/Linux) or `Cmd+Shift+R` (Mac)
2. Wait 60 seconds for pod to fully restart if just deployed
3. Check pod logs: `kubectl logs -n default <pod> --tail=50`

## Files You Need to Know

| File | Purpose |
|------|---------|
| `ansible/deploy-frontend-gateway.yml` | Main deployment logic |
| `deployment/base/golem-app/nginx-deployment.yaml` | K8s manifest |
| `scripts/verify-frontend-deployment.sh` | Verification utility |
| `docs/FRONTEND_DEPLOYMENT_FIX.md` | Technical deep dive |
| `Makefile` | Convenient commands |

## How It Actually Works

1. **Git Detection**: Playbook captures current git commit hash
2. **Timestamp**: Generates ISO8601 timestamp (20260316T143000)
3. **Build**: Builds docker image with both tags
   - `golem-frontend:latest-20260316T143000-a1b2c3d`
   - `golem-frontend:latest`
4. **Registry**: Pushes both tags to 10.100.0.2:5000
5. **Patch**: Updates K8s deployment spec
   - Container image: latest versioned tag
   - Annotation: new timestamp
6. **Restart**: K8s detects new pod template and recreates pod
7. **Pull**: New pod pulls fresh image (imagePullPolicy: Always)
8. **Verify**: Playbook confirms pod is running and image matches

## Why This Works

- **Uniqueness**: Versioned tag = new image, not cached
- **Pod Recreation**: Annotation change forces Kubernetes to restart
- **Image Pull**: `imagePullPolicy: Always` on fresh pod = fresh image
- **No Manual Intervention**: Fully automated, same as before
- **Easy Rollback**: All versions stay in registry, can revert by tag

## Performance Impact

- **Build time**: ~2-3 minutes (same as before)
- **Deploy time**: ~1-2 minutes (added verification)
- **Pod restart**: ~10-20 seconds
- **Total**: ~3-5 minutes for full deployment + verification

## Next Steps

1. **First Time**: Run `make k3s-frontend-test` to deploy and verify
2. **Monitor**: Check pod logs in first minute: `kubectl logs -n default <pod>`
3. **Test**: Access frontend and verify code is updated
4. **Done**: No more manual verification needed!

## Environment Variables (No Change)

```bash
# Still the same, now passed to build
VITE_API_HOST=https://game.anhtran.dev/apps/golem
VITE_NGINX_HOST=https://statics.vietky.io.vn
```

## Support

If deployment issues occur:
1. Check: `make k3s-frontend-verify`
2. Read: `docs/FRONTEND_DEPLOYMENT_FIX.md` (troubleshooting section)
3. Manual verify: `ssh root@157.66.101.66 'kubectl get all -n default -l app=golem'`
