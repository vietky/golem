# Docker Registry Setup & Server-Side Build

## Overview

The deployment now uses a local Docker registry running on the k3s server. Docker images are built on the server itself and pushed to the local registry, which k3s pulls from.

## Architecture

```
Local Machine                    K3s Server (157.66.101.66)
    |                                   |
    | (rsync source code)               |
    |---------------------------------->|
                                        |
                                        v
                                   Build Image
                                   (docker build)
                                        |
                                        v
                                   Push to Registry
                                   (localhost:5000)
                                        |
                                        v
                                   K3s Pull Image
                                   (from localhost:5000)
```

## Benefits

1. **No Local Build Required**: Build happens on the server with server resources
2. **Faster Deployments**: No need to transfer large Docker images
3. **Consistent Environment**: Built in the same environment where it runs
4. **Image Caching**: Registry caches layers for faster rebuilds
5. **k3s Native**: k3s pulls from local registry automatically

## Initial Setup (One-Time)

Before your first deployment, set up the Docker registry:

```bash
make k3s-setup-registry
```

This will:
- Install Docker on the k3s server
- Start a local Docker registry on `localhost:5000`
- Configure k3s to use the local registry
- Create registry data directory at `/var/lib/docker-registry`

## Deployment Process

### 1. Setup Registry (First Time Only)
```bash
make k3s-setup-registry
```

### 2. Deploy Backend
```bash
make k3s-deploy
```

This will:
1. Check if registry is running
2. Copy source code to server via rsync
3. Build Docker image on server
4. Push image to `localhost:5000/golem-century:latest`
5. Deploy to k3s (k3s pulls from local registry)
6. Clean up build directory

### 3. Deploy Frontend
```bash
make k3s-frontend-test  # or k3s-frontend-prod
```

## Registry Details

### Registry Configuration

- **URL**: `http://localhost:5000`
- **Container Name**: `registry`
- **Data Directory**: `/var/lib/docker-registry`
- **Network**: Bound to `127.0.0.1` (localhost only)
- **Restart Policy**: Always

### k3s Registry Configuration

Location: `/etc/rancher/k3s/registries.yaml`

```yaml
mirrors:
  "localhost:5000":
    endpoint:
      - "http://localhost:5000"
```

## Manual Registry Management

### Check Registry Status
```bash
ssh root@157.66.101.66 "docker ps | grep registry"
```

### List Images in Registry
```bash
ssh root@157.66.101.66 "curl -s http://localhost:5000/v2/_catalog"
```

### List Tags for an Image
```bash
ssh root@157.66.101.66 "curl -s http://localhost:5000/v2/golem-century/tags/list"
```

### Stop Registry
```bash
ssh root@157.66.101.66 "docker stop registry"
```

### Start Registry
```bash
ssh root@157.66.101.66 "docker start registry"
```

### Remove Registry (Clean Slate)
```bash
ssh root@157.66.101.66 "docker rm -f registry"
ssh root@157.66.101.66 "rm -rf /var/lib/docker-registry"
make k3s-setup-registry  # Recreate
```

## Build Process Details

### What Gets Copied to Server

The playbook uses rsync to copy source code, excluding:
- `.git/` - Git repository data
- `node_modules/` - Node dependencies
- `vendor/` - Go vendor directory
- `web/react-frontend/node_modules/` - Frontend dependencies
- `web/react-frontend/dist/` - Frontend build output
- `.env` - Environment file
- `secrets/` - Secret files

### Build Location

- **Build Directory**: `/tmp/golem-build`
- **Cleaned up**: After successful build

### Image Naming

- **Format**: `localhost:5000/golem-century:<version>`
- **Default Version**: `latest`
- **Custom Version**: Set `APP_VERSION` environment variable

Example:
```bash
APP_VERSION=v1.0.0 make k3s-deploy
```

## Troubleshooting

### Registry Not Running

**Error**: `Docker registry is not running`

**Solution**:
```bash
make k3s-setup-registry
```

### Registry Health Check Failed

**Error**: Registry health check failed

**Solution**:
```bash
ssh root@157.66.101.66 "docker logs registry"
ssh root@157.66.101.66 "docker restart registry"
```

### Image Pull Failed in k3s

**Error**: `ImagePullBackOff` in k3s pods

**Check**:
```bash
# Verify image exists in registry
ssh root@157.66.101.66 "curl http://localhost:5000/v2/golem-century/tags/list"

# Check k3s registry config
ssh root@157.66.101.66 "cat /etc/rancher/k3s/registries.yaml"

# Restart k3s
ssh root@157.66.101.66 "systemctl restart k3s"
```

### Build Fails on Server

**Check build logs**:
```bash
ssh root@157.66.101.66 "ls -la /tmp/golem-build"
```

**Clean and retry**:
```bash
ssh root@157.66.101.66 "rm -rf /tmp/golem-build"
make k3s-deploy
```

### Disk Space Issues

**Check registry storage**:
```bash
ssh root@157.66.101.66 "du -sh /var/lib/docker-registry"
```

**Clean old images** (be careful!):
```bash
ssh root@157.66.101.66 "docker system prune -a"
```

## Version Management

### Deploy Specific Version
```bash
APP_VERSION=v1.0.0 make k3s-deploy
```

This creates: `localhost:5000/golem-century:v1.0.0`

### Rollback to Previous Version
```bash
# If you tagged previous version
ssh root@157.66.101.66 "kubectl set image deployment/golem-century golem-century=localhost:5000/golem-century:v0.9.0 -n golem-app"
```

## Performance Considerations

### First Build
- **Time**: 5-10 minutes (depending on server specs)
- **Reason**: Downloading base images, building from scratch

### Subsequent Builds
- **Time**: 1-3 minutes
- **Reason**: Docker layer caching

### Network Transfer
- **Reduced**: Only source code transferred (typically < 10MB)
- **vs Old Method**: Would transfer entire image (typically 100-500MB)

## Security

### Registry Security

- **Network**: Bound to localhost only (not exposed externally)
- **Authentication**: None (local only, trusted environment)
- **TLS**: Not configured (localhost communication)

### Production Recommendations

For production, consider:
1. **HTTPS**: Use TLS for registry communication
2. **Authentication**: Add basic auth or token authentication
3. **Access Control**: Restrict registry network access
4. **Backup**: Regularly backup `/var/lib/docker-registry`

## Complete Deployment Workflow

### Initial Setup
```bash
# 1. Setup registry (one-time)
make k3s-setup-registry

# 2. Deploy backend
make k3s-deploy

# 3. Deploy frontend to test
make k3s-frontend-test

# 4. Verify
curl https://apps.vietky.io.vn/golem-test
```

### Updating Application
```bash
# Backend update
make k3s-deploy

# Frontend update
make k3s-frontend-test  # or k3s-frontend-prod
```

### Full Stack Update
```bash
make k3s-deploy-full-test  # or k3s-deploy-full-prod
```

## Comparison: Old vs New

| Aspect | Old (Local Build) | New (Server Build) |
|--------|-------------------|-------------------|
| Build Location | Local machine | Server |
| Transfer Size | ~500MB (image) | ~10MB (source) |
| Build Time | + Local build time | Server build only |
| Transfer Time | 2-5 minutes | 10-30 seconds |
| Dependencies | Local Docker | Server Docker |
| Registry | None | Local registry |
| k3s Import | Manual import | Auto pull |

## Files Modified

```
ansible/
├── setup-docker-registry.yml    # NEW: Registry setup
├── deploy-k3s-backend.yml       # UPDATED: Build on server
└── inventory.ini                # Existing

deployment/golem-app/
└── deployment.yaml              # UPDATED: Use registry image

Makefile                         # UPDATED: Add registry setup
```

## Next Steps

1. **Setup registry**: `make k3s-setup-registry`
2. **Deploy backend**: `make k3s-deploy`
3. **Verify**: Check deployment with `make k3s-status`

---

For more information:
- [K3S_DEPLOYMENT_ENVIRONMENTS.md](K3S_DEPLOYMENT_ENVIRONMENTS.md)
- [ansible/README.md](../ansible/README.md)
