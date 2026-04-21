# Frontend Deployment Playbook Update

## Summary of Changes

The `deploy-frontend.yml` playbook has been updated to follow the git-based deployment pattern specified in the project's deployment guide.

### Key Changes

#### 1. **Git Repository Fetching** ✓
- **Before**: Built frontend locally and rsync'd to remote server
- **After**: Fetches code from git repository at `/opt/jenkins/repos/golem` on the remote server
- **Benefit**: No need to have complete codebase on local machine; reduces bandwidth and deployment time

#### 2. **Docker-based Building** ✓
- **Before**: Used npm on localhost to build frontend
- **After**: Uses Docker container to build (matches `fe-release` target from Makefile)
- **Benefit**: Consistent build environment, no local Node.js/npm dependency required

#### 3. **Environment Handling** ✓
- Maintains support for both `test` and `prod` environments
- Build arguments (`VITE_API_HOST`, `VITE_NGINX_HOST`) are passed to Docker build
- Separate nginx paths for test and prod deployments

### Deployment Flow

```
1. Pull git repository (/opt/jenkins/repos/golem)
   ↓
2. Build Docker image with environment-specific args
   ├─ VITE_API_HOST: https://apps.vietky.io.vn/api/golem[-test]
   └─ VITE_NGINX_HOST: https://apps.vietky.io.vn
   ↓
3. Extract built frontend from Docker container
   ↓
4. Copy to nginx directory
   ├─ test: /opt/nginx/apps/golem-test
   └─ prod: /opt/nginx/apps/golem
   ↓
5. Set proper permissions (www-data:www-data)
   ↓
6. Verify deployment (check index.html exists)
   ↓
7. Deploy static assets from git repo
   ↓
8. Reload nginx configuration
```

### Configuration Matrix

| Environment | Nginx Path | API Host | Access URL |
|---|---|---|---|
| test | `/opt/nginx/apps/golem-test` | `https://apps.vietky.io.vn/api/golem-test` | `https://apps.vietky.io.vn/golem-test` |
| prod | `/opt/nginx/apps/golem` | `https://apps.vietky.io.vn/api/golem` | `https://apps.vietky.io.vn/golem` |

### Usage

```bash
# Deploy to test environment
DEPLOY_ENV=test ansible-playbook -i ansible/inventory.ini ansible/deploy-frontend.yml

# Or use the Makefile shortcut
make k3s-frontend-test

# Deploy to production
DEPLOY_ENV=prod ansible-playbook -i ansible/inventory.ini ansible/deploy-frontend.yml
# Or
make k3s-frontend-prod
```

### Verification Steps

The playbook includes built-in verification:
1. ✓ Checks git repository exists before proceeding
2. ✓ Validates Docker is installed
3. ✓ Lists build output files for inspection
4. ✓ Verifies `index.html` exists after deployment
5. ✓ Lists deployed files to confirm successful deployment
6. ✓ Provides comprehensive deployment summary

### Testing Results

All verification tests pass for both `test` and `prod` environments:
- ✓ Playbook syntax valid
- ✓ Environment configuration complete
- ✓ Git fetch logic present
- ✓ Docker build logic present
- ✓ Deployment and verification logic present

### Troubleshooting

If deployment fails, check:
1. Git repository exists: `ssh root@157.66.101.66 ls -la /opt/jenkins/repos/golem`
2. Docker is installed: `ssh root@157.66.101.66 docker --version`
3. Git is up to date: `ssh root@157.66.101.66 'cd /opt/jenkins/repos/golem && git log -1'`
4. Check playbook logs for detailed error messages

### Related Files

- `Makefile`: `k3s-frontend-test`, `k3s-frontend-prod` targets
- `Dockerfile.fe`: Frontend Docker build definition
- `fe-release` target: Reference implementation (also uses Docker)
