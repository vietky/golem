# K3S Deployment Guide - Environment-Based

## Overview

The deployment is now split into separate playbooks for backend and frontend, with environment selection for test/prod deployments.

## Deployment Structure

```
ansible/
├── deploy-k3s.yml              # Main orchestrator (backend + frontend)
├── deploy-k3s-backend.yml      # Backend only (k3s)
├── deploy-frontend.yml         # Frontend only (nginx)
└── inventory.ini               # Server configuration
```

## Environments

### Test Environment
- **Frontend Path**: `/golem-test`
- **Frontend URL**: `https://game.anhtran.dev/golem-test`
- **API URL**: `https://game.anhtran.dev/api/golem-test`
- **Backend Port**: `30080` (k3s NodePort)
- **Nginx Path**: `/opt/nginx/apps/golem-test`

### Production Environment
- **Frontend Path**: `/golem`
- **Frontend URL**: `https://game.anhtran.dev/golem`
- **API URL**: `https://game.anhtran.dev/api/golem`
- **Backend Port**: `8100` (docker-compose - will change to k3s after testing)
- **Nginx Path**: `/opt/nginx/apps/golem`

## Deployment Commands

### Test Deployment

#### Full Stack (Backend + Frontend) - TEST
```bash
make k3s-deploy-full-test
# or
./scripts/deploy-k3s.sh --type full --env test
```

#### Backend Only
```bash
make k3s-deploy
# or
./scripts/deploy-k3s.sh --type backend
```

#### Frontend Only - TEST
```bash
make k3s-frontend-test
# or
./scripts/deploy-k3s.sh --type frontend --env test
```

### Production Deployment

#### Full Stack (Backend + Frontend) - PROD
```bash
make k3s-deploy-full-prod
# or
./scripts/deploy-k3s.sh --type full --env prod
```

#### Frontend Only - PROD
```bash
make k3s-frontend-prod
# or
./scripts/deploy-k3s.sh --type frontend --env prod
```

### Version-Specific Backend Deployment
```bash
make k3s-deploy-version VERSION=v1.0.0
# or
./scripts/deploy-k3s.sh --type backend --version v1.0.0
```

## Pre-Deployment Testing

Always test configuration before deploying:
```bash
make k3s-test
```

## Typical Workflows

### 1. Deploy New Feature to Test
```bash
# Test configuration
make k3s-test

# Deploy backend
make k3s-deploy

# Deploy frontend to test
make k3s-frontend-test

# Verify
curl https://game.anhtran.dev/golem-test
curl https://game.anhtran.dev/api/golem-test/health
```

### 2. Promote Test to Production
```bash
# After testing is complete, deploy frontend to prod
make k3s-frontend-prod

# Verify
curl https://game.anhtran.dev/golem
```

### 3. Full Stack Deployment (Backend + Frontend)
```bash
# Deploy everything to test
make k3s-deploy-full-test

# Or deploy to production
make k3s-deploy-full-prod
```

## Monitoring

### Check Deployment Status
```bash
make k3s-status
```

### View Logs
```bash
# Application logs
make k3s-logs

# Database logs
make k3s-logs-db

# Cache logs
make k3s-logs-cache
```

### Access URLs

**Test Environment:**
- Frontend: https://game.anhtran.dev/golem-test
- API: https://game.anhtran.dev/api/golem-test
- Health: https://game.anhtran.dev/api/golem-test/health

**Production Environment:**
- Frontend: https://game.anhtran.dev/golem
- API: https://game.anhtran.dev/api/golem
- Health: https://game.anhtran.dev/api/golem/health

## Environment Variables

### DEPLOY_ENV
Controls which environment frontend is deployed to:
- `test` - Deploy to /golem-test with test API
- `prod` - Deploy to /golem with production API

### APP_VERSION
Controls backend version:
- `latest` (default) - Latest build
- `v1.0.0` - Specific version tag

## Ansible Playbooks Details

### deploy-k3s-backend.yml
Deploys backend infrastructure to k3s:
- Creates namespaces (golem-database, golem-cache, golem-app)
- Deploys MongoDB (10Gi PVC)
- Deploys Redis (5Gi PVC)
- Builds and imports Docker image
- Deploys application (2 replicas)
- Configures secrets from `secrets/.env`

### deploy-frontend.yml
Deploys frontend to nginx:
- Reads DEPLOY_ENV variable
- Builds React app with environment-specific config
- Deploys to appropriate nginx path
- Copies static assets
- Reloads nginx

### deploy-k3s.yml
Orchestrates full deployment:
- Calls backend playbook
- Calls frontend playbook
- Uses DEPLOY_ENV for frontend environment

## Advanced Usage

### Deploy with Custom Variables
```bash
./scripts/deploy-k3s.sh --type full --env test --extra-vars "-e custom_var=value"
```

### Direct Ansible Invocation
```bash
# Backend only
cd ansible
ansible-playbook -i inventory.ini deploy-k3s-backend.yml

# Frontend to test
cd ansible
DEPLOY_ENV=test ansible-playbook -i inventory.ini deploy-frontend.yml

# Frontend to prod
cd ansible
DEPLOY_ENV=prod ansible-playbook -i inventory.ini deploy-frontend.yml

# Full stack to test
cd ansible
DEPLOY_ENV=test ansible-playbook -i inventory.ini deploy-k3s.yml
```

## Troubleshooting

### Frontend not updating
```bash
# Clear frontend build and rebuild
rm -rf web/react/*
make k3s-frontend-test  # or k3s-frontend-prod
```

### Wrong environment deployed
Check the nginx paths:
```bash
ssh root@157.66.101.66 "ls -la /opt/nginx/apps/"
```

### API connection issues
Verify nginx proxy configuration matches environment:
```bash
ssh root@157.66.101.66 "cat /etc/nginx/sites-available/default | grep -A 20 'location /api/golem'"
```

### Backend not accessible on NodePort
Check k3s service:
```bash
ssh root@157.66.101.66 "kubectl get svc -n golem-app"
ssh root@157.66.101.66 "kubectl get pods -n golem-app"
```

## Migration from Old Commands

| Old Command | New Command |
|-------------|-------------|
| `make k3s-deploy-full` | `make k3s-deploy-full-test` |
| `make k3s-frontend` | `make k3s-frontend-test` |
| N/A | `make k3s-frontend-prod` |
| N/A | `make k3s-deploy-full-prod` |

## Next Steps

1. **Test deployment**: `make k3s-test`
2. **Deploy to test**: `make k3s-deploy-full-test`
3. **Verify test**: Visit https://game.anhtran.dev/golem-test
4. **Deploy to prod**: `make k3s-frontend-prod` (when ready)

---

For more details, see:
- [Ansible README](../ansible/README.md)
- [Deployment README](../deployment/README.md)
