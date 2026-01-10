# Deployment Split Complete - Test & Production Environments

## ✅ What Changed

The deployment has been split into modular playbooks with environment-specific configurations for test and production.

### New Ansible Playbooks

1. **deploy-k3s-backend.yml** - Backend deployment to k3s
   - MongoDB, Redis, Application
   - Secrets management
   - Health checks

2. **deploy-frontend.yml** - Frontend deployment to nginx
   - Environment selection (test/prod)
   - Dynamic build configuration
   - Nginx path management

3. **deploy-k3s.yml** - Full stack orchestrator
   - Calls backend playbook
   - Calls frontend playbook
   - Respects DEPLOY_ENV variable

## 🌍 Environment Configuration

### Test Environment (`DEPLOY_ENV=test`)
- **Frontend**: `/opt/nginx/apps/golem-test`
- **URL**: `https://game.anhtran.dev/golem-test`
- **API**: `https://game.anhtran.dev/api/golem-test`
- **Backend**: Port `30080` (k3s NodePort)
- **Purpose**: Testing and validation

### Production Environment (`DEPLOY_ENV=prod`)
- **Frontend**: `/opt/nginx/apps/golem`
- **URL**: `https://game.anhtran.dev/golem`
- **API**: `https://game.anhtran.dev/api/golem`
- **Backend**: Port `8100` (docker-compose for now)
- **Purpose**: Live production

## 🚀 New Deployment Commands

### Test Deployment
```bash
# Full stack to test
make k3s-deploy-full-test

# Backend only
make k3s-deploy

# Frontend only to test
make k3s-frontend-test
```

### Production Deployment
```bash
# Full stack to prod
make k3s-deploy-full-prod

# Frontend only to prod
make k3s-frontend-prod
```

### Using the Script Directly
```bash
# Backend
./scripts/deploy-k3s.sh --type backend

# Frontend to test
./scripts/deploy-k3s.sh --type frontend --env test

# Frontend to prod
./scripts/deploy-k3s.sh --type frontend --env prod

# Full stack to test
./scripts/deploy-k3s.sh --type full --env test

# Full stack to prod
./scripts/deploy-k3s.sh --type full --env prod
```

## ✅ Validation Results

All playbooks pass syntax validation:
- ✓ deploy-k3s-backend.yml
- ✓ deploy-frontend.yml
- ✓ deploy-k3s.yml

## 📋 Typical Workflow

### 1. Deploy New Features to Test
```bash
# Test configuration
make k3s-test

# Deploy backend to k3s
make k3s-deploy

# Deploy frontend to test environment
make k3s-frontend-test

# Verify
open https://game.anhtran.dev/golem-test
```

### 2. Promote to Production
```bash
# After testing, deploy frontend to production
make k3s-frontend-prod

# Verify
open https://game.anhtran.dev/golem
```

## 🎯 Key Benefits

1. **Separated Concerns**: Backend and frontend can be deployed independently
2. **Environment Safety**: Test and prod are completely isolated
3. **Flexible Deployment**: Deploy only what changed
4. **Clear Configuration**: Environment settings are explicit
5. **Easy Rollback**: Deploy frontend to specific environment only

## 📁 Files Modified/Created

```
ansible/
├── deploy-k3s.yml              # NEW: Orchestrator
├── deploy-k3s-backend.yml      # NEW: Backend only
├── deploy-frontend.yml         # NEW: Frontend with env selection
└── inventory.ini               # Existing

scripts/
└── deploy-k3s.sh               # UPDATED: Support for type and env

docs/
└── K3S_DEPLOYMENT_ENVIRONMENTS.md  # NEW: Environment guide

Makefile                        # UPDATED: New commands
```

## 🧪 Ready to Test

You can now test the deployment:

```bash
# Test configuration
make k3s-test

# Deploy to test environment
make k3s-deploy-full-test
```

## 📚 Documentation

- [K3S_DEPLOYMENT_ENVIRONMENTS.md](K3S_DEPLOYMENT_ENVIRONMENTS.md) - Complete environment guide
- [K3S_DEPLOYMENT_QUICK_REFERENCE.md](K3S_DEPLOYMENT_QUICK_REFERENCE.md) - Quick commands
- [ansible/README.md](../ansible/README.md) - Ansible details

## 🔄 Migration from Old Commands

Old commands still work but are deprecated:

| Old | New (Recommended) |
|-----|-------------------|
| `make k3s-deploy-full` | `make k3s-deploy-full-test` |
| `make k3s-frontend` | `make k3s-frontend-test` |

## Next Steps

1. ✅ **Test backend deployment**: `make k3s-deploy`
2. ✅ **Test frontend to test env**: `make k3s-frontend-test`
3. ⏳ **Verify test environment**: Visit https://game.anhtran.dev/golem-test
4. ⏳ **Deploy to production**: `make k3s-frontend-prod` (when ready)

---

**Note**: The production backend port (8100) will be changed to the k3s NodePort (30080) after testing is complete. For now, it remains on docker-compose port.
