# Ansible Deployment Files - Fixes Verification

## Summary of Changes

Three critical issues have been fixed in the Ansible deployment playbooks:

### 1. Configurable Branch Name ✓

**Problem**: Branch name was hardcoded to `k3s` in both playbooks.

**Solution**: Added `DEPLOY_BRANCH` environment variable with default fallback to `k3s`:

**Backend** (`deploy-k3s-backend.yml`):
```yaml
deploy_branch: "{{ lookup('env', 'DEPLOY_BRANCH') | default('k3s', true) }}"
git_repo_path: "/opt/jenkins/repos/golem"
```

**Frontend** (`deploy-frontend.yml`):
```yaml
deploy_branch: "{{ lookup('env', 'DEPLOY_BRANCH') | default('k3s', true) }}"
```

**Usage**:
```bash
# Use default branch (k3s)
DEPLOY_ENV=production make k3s-deploy

# Use custom branch
DEPLOY_BRANCH=main DEPLOY_ENV=production make k3s-deploy
DEPLOY_BRANCH=develop DEPLOY_ENV=test make k3s-frontend-test
```

---

### 2. Git Remote Preservation ✓

**Problem**: Git operations were using `git checkout` before `git fetch`, risking remote loss.

**Solution**: Reordered git operations to properly preserve the remote:

**Backend** (`deploy-k3s-backend.yml`, lines 128-147):
```yaml
- name: Fetch latest code from origin
  shell: |
    cd {{ git_repo_path }}
    git fetch origin {{ deploy_branch }}

- name: Checkout to branch {{ deploy_branch }}
  shell: |
    cd {{ git_repo_path }}
    git checkout {{ deploy_branch }}

- name: Reset to origin/{{ deploy_branch }}
  shell: |
    cd {{ git_repo_path }}
    git reset --hard origin/{{ deploy_branch }}
```

**Frontend** (`deploy-frontend.yml`, lines 50-54):
```yaml
- name: Pull latest code from git repository
  shell: |
    cd {{ git_repo_path }}
    git fetch origin {{ deploy_branch }}
    git checkout {{ deploy_branch }}
    git reset --hard origin/{{ deploy_branch }}
```

**Why This Works**:
- `git fetch origin {{ deploy_branch }}` fetches without modifying working tree
- `git checkout {{ deploy_branch }}` switches to the branch safely
- `git reset --hard origin/{{ deploy_branch }}` aligns with remote (non-destructive to remote tracking)

---

### 3. Docker Build Order ✓

**Problem**: Kubernetes manifests were applied BEFORE Docker image was built and pushed to registry.
This caused the deployment to try using an image that didn't exist yet.

**Solution**: Reordered tasks in `deploy-k3s-backend.yml`:

**New Order** (Backend deployment):
1. Copy Kubernetes manifests (line 102)
2. Check git repository exists (line 104)
3. **Fetch latest code** (line 128)
4. **Checkout branch** (line 135)
5. **Reset to origin** (line 141)
6. **Check Docker registry** (line 150)
7. **Build Docker image** (line 166) ← **MOVED UP**
8. **Push to registry** (line 180) ← **MOVED UP**
9. Create namespace (line 189)
10. Apply MongoDB/Redis/ConfigMap manifests
11. Apply Deployment/Service/Ingress manifests
12. Update deployment image and wait for pods

**Verification**:
```
Line 166: Build Docker image from git repository
Line 180: Push image to local registry
Line 202: Apply MongoDB manifests
```
Image is built at line 166, before manifests are applied at line 202. ✓

---

## Testing the Fixes

### Test 1: Verify Branch Configuration
```bash
cd /Users/viet.ky/.gvm/gos/go1.24.3/src/golem_century
grep "deploy_branch:" ansible/deploy-k3s-backend.yml
# Output: deploy_branch: "{{ lookup('env', 'DEPLOY_BRANCH') | default('k3s', true) }}"
```

### Test 2: Verify Git Operations Preserve Remote
```bash
grep "git fetch origin" ansible/deploy-k3s-backend.yml
# Output: git fetch origin {{ deploy_branch }}

grep "git checkout" ansible/deploy-k3s-backend.yml
# Output: git checkout {{ deploy_branch }}

grep "git reset --hard" ansible/deploy-k3s-backend.yml
# Output: git reset --hard origin/{{ deploy_branch }}
```

### Test 3: Verify Docker Build Order
```bash
grep -n "Build Docker image\|Apply MongoDB" ansible/deploy-k3s-backend.yml
# Output:
# 166:    - name: Build Docker image from git repository
# 202:    - name: Apply MongoDB manifests
```

✓ Build happens at line 166, before MongoDB manifests at line 202

---

## Files Modified

1. **ansible/deploy-k3s-backend.yml**
   - Added `deploy_branch` variable (line 15)
   - Added `git_repo_path` variable (line 16)
   - Added branch to deployment display (line 48)
   - Reordered tasks to check git, build Docker image, push, THEN apply Kubernetes manifests
   - Removed duplicate git operations and Docker build code

2. **ansible/deploy-frontend.yml**
   - Added `deploy_branch` variable (line 8)
   - Added branch to deployment display (line 39)
   - Fixed git operations to use `{{ deploy_branch }}` instead of hardcoded `k3s`

---

## Environment Variables Reference

### Deployment Control
| Variable | Default | Purpose | Example |
|----------|---------|---------|---------|
| `DEPLOY_ENV` | `production` | Target environment | `staging`, `production` |
| `DEPLOY_BRANCH` | `k3s` | Git branch to deploy | `main`, `develop`, `k3s` |
| `APP_VERSION` | `latest` | Docker image tag | `v1.0.0`, `latest` |

### Usage Examples
```bash
# Deploy production with k3s branch
DEPLOY_ENV=production make k3s-deploy

# Deploy staging with main branch
DEPLOY_BRANCH=main DEPLOY_ENV=staging make k3s-deploy

# Deploy frontend test environment with custom branch
DEPLOY_BRANCH=feature/new-ui DEPLOY_ENV=test make k3s-frontend-test

# Full deployment with custom versions
DEPLOY_BRANCH=release/v2.0 DEPLOY_ENV=production APP_VERSION=2.0.0 make k3s-deploy
```

---

## Verification Checklist

- [x] Branch name is configurable via `DEPLOY_BRANCH` env var
- [x] Default branch is `k3s` (backward compatible)
- [x] Git operations use proper fetch-checkout-reset sequence
- [x] Git remote (`origin`) is preserved
- [x] Docker image is built BEFORE Kubernetes manifests
- [x] Docker image is pushed to registry BEFORE deployment
- [x] No duplicate tasks or code
- [x] Both frontend and backend files are consistent
- [x] All files are valid YAML syntax
- [x] Deployment order is correct for both files

---

## Deployment Execution Flow (Backend)

```
1. Validate environment variables
   └─ DEPLOY_ENV must be staging or production
   └─ DEPLOY_BRANCH defaults to k3s

2. Prepare
   ├─ Copy Kubernetes manifests
   ├─ Verify git repository exists
   └─ Check Docker registry is running

3. Get Code & Build Image
   ├─ git fetch origin {{ deploy_branch }}
   ├─ git checkout {{ deploy_branch }}
   ├─ git reset --hard origin/{{ deploy_branch }}
   ├─ docker build -t {{ image }}
   └─ docker push {{ image }}

4. Deploy Infrastructure
   ├─ Create Kubernetes namespace
   ├─ Update manifests with environment config
   ├─ Apply MongoDB manifests
   ├─ Apply Redis manifests
   ├─ Apply ConfigMap/Secret

5. Deploy Application
   ├─ Apply Deployment manifest (pulls image)
   ├─ Apply Service manifest
   ├─ Apply Ingress manifest
   └─ Update deployment with Docker image

6. Verify
   ├─ Wait for MongoDB to be ready
   ├─ Wait for Redis to be ready
   ├─ Wait for Application pods to be ready
   └─ Display status
```

---

**Date Fixed**: January 13, 2026
**Status**: ✓ All issues resolved and verified
