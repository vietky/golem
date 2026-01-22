# Environment Separation Guide

## Overview

The deployment now supports two separate environments with different configurations:

- **Staging**: `golem-staging` namespace - Lower resources for testing
- **Production**: `golem` namespace - Full resources for production use

## Environment Comparison

| Feature | Staging | Production |
|---------|---------|------------|
| **Namespace** | golem-staging | golem |
| **DNS** | staging.game.anhtran.dev | prod.game.anhtran.dev |
| **Replicas** | 1 | 2 |
| **MongoDB Storage** | 5Gi | 10Gi |
| **MongoDB Memory** | 512Mi | 1Gi |
| **Redis Storage** | 2Gi | 5Gi |

## Quick Commands

### Deployment

```bash
# Deploy to staging
make k3s-deploy-staging

# Deploy to production
make k3s-deploy-prod

# Deploy specific version to staging
make k3s-deploy-version VERSION=v1.2.3 ENV=staging

# Deploy specific version to production
make k3s-deploy-version VERSION=v1.2.3 ENV=production
```

### Monitoring

```bash
# Check staging status
make k3s-status ENV=staging

# Check production status  
make k3s-status ENV=production

# Check both environments
make k3s-status-all

# View staging logs
make k3s-logs ENV=staging

# View production logs
make k3s-logs ENV=production
```

### Management

```bash
# Restart staging
make k3s-restart ENV=staging

# Restart production
make k3s-restart ENV=production
```

## How It Works

### Kustomize Overlays

The deployment uses Kustomize overlays to manage environment-specific configurations:

- **Base manifests**: Located in `deployment/mongodb/`, `deployment/redis/`, `deployment/golem-app/`
- **Staging overlay**: `deployment/overlays/staging/kustomization.yaml` - Patches base manifests for staging
- **Production overlay**: `deployment/overlays/production/kustomization.yaml` - Patches base manifests for production

### Environment Variables

The Ansible playbook uses the `DEPLOY_ENV` environment variable to select the deployment environment:

```yaml
env_config:
  staging:
    namespace: golem-staging
    replicas: 1
    dns_name: staging.game.anhtran.dev
    mongodb_storage: 5Gi
    mongodb_memory: 512Mi
    redis_storage: 2Gi
  production:
    namespace: golem
    replicas: 2
    dns_name: game.anhtran.dev
    mongodb_storage: 10Gi
    mongodb_memory: 1Gi
    redis_storage: 5Gi
```

## Access URLs

### Staging
- **Frontend**: https://staging.game.anhtran.dev/golem-test
- **API**: https://staging.game.anhtran.dev/api/golem
- **WebSocket**: wss://staging.game.anhtran.dev/ws

### Production
- **Frontend**: https://prod.game.anhtran.dev/golem
- **API**: https://prod.game.anhtran.dev/api/golem
- **WebSocket**: wss://prod.game.anhtran.dev/ws

## Deployment Workflow

1. **Develop locally** - Test changes on your local machine
2. **Deploy to staging** - Deploy and test in staging environment
   ```bash
   make k3s-deploy-staging
   ```
3. **Test staging** - Run integration tests, manual testing
   ```bash
   curl https://staging.game.anhtran.dev/api/golem/list
   ```
4. **Deploy to production** - Once staging is verified
   ```bash
   make k3s-deploy-prod
   ```
5. **Monitor production** - Check logs and metrics
   ```bash
   make k3s-status ENV=production
   make k3s-logs ENV=production
   ```

## Rollback

If you need to rollback a deployment:

```bash
# Check deployment history
ssh root@157.66.101.66 "kubectl rollout history deployment/golem-century -n golem"

# Rollback to previous version
ssh root@157.66.101.66 "kubectl rollout undo deployment/golem-century -n golem"

# Rollback to specific revision
ssh root@157.66.101.66 "kubectl rollout undo deployment/golem-century -n golem --to-revision=3"
```
