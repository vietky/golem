# Gateway API Migration Complete

## Summary

Successfully migrated from Kubernetes Ingress to Gateway API for both backend and frontend services. The application is now accessible at:

- **Frontend**: https://apps.vietky.io.vn:30443/apps/golem/
- **Backend API**: https://apps.vietky.io.vn:30443/api/golem/api/list
- **WebSocket**: wss://apps.vietky.io.vn:30443/api/golem/ws

## Architecture

### Gateway API Resources

1. **Gateway**: `main-gateway` in `nginx-gateway` namespace
   - Listens on ports 30080 (HTTP) and 30443 (HTTPS) via NodePort
   - Uses self-signed TLS certificate
   - Shared by both backend and frontend services

2. **HTTPRoutes**:
   - `/api/golem/*` → golem-century:8080 (backend)
   - `/apps/golem/*` → golem-nginx:80 (frontend)

3. **ReferenceGrant**: Allows HTTPRoutes in `default` namespace to reference Gateway in `nginx-gateway` namespace

### Frontend Architecture

- **Container**: Docker image serving React app via nginx
- **Path**: `/apps/golem/` (all assets prefixed with this path)
- **Nginx Config**: Uses `alias` directive to strip `/apps/golem/` prefix
- **Build**: Vite builds with `VITE_BASE_PATH=/apps/golem/`

### Backend Architecture

- **Container**: Go application with API_PREFIX environment variable
- **Path**: `/api/golem/` (all routes prefixed)
- **Implementation**: `prefixPath()` helper function prepends prefix to all routes
- **No URL Rewriting**: NGINX Gateway Controller doesn't support URLRewrite filter

## Deployment

### Prerequisites

1. Gateway API CRDs installed
2. NGINX Gateway Controller running in `nginx-gateway` namespace
3. Local Docker registry on k3s server at `localhost:5000`
4. Git repository at `/opt/jenkins/repos/golem`

### Deploy Commands

```bash
# Frontend only (production)
make k3s-frontend-prod

# Frontend only (test/staging)
make k3s-frontend-test

# Backend deployment (use existing commands)
make k3s-deploy-gateway

# Full deployment
make k3s-deploy-gateway  # deploys both backend and frontend
```

### Manual Deployment

```bash
# Build and push frontend
docker buildx build --platform linux/amd64 -f Dockerfile.frontend -t golem-frontend:latest .
docker save golem-frontend:latest | ssh root@157.66.101.66 'docker load && docker tag golem-frontend:latest localhost:5000/golem-frontend:latest && docker push localhost:5000/golem-frontend:latest'

# Restart deployment
ssh root@157.66.101.66 'kubectl rollout restart -n default deployment/golem-nginx'
```

## Key Files

### Frontend
- [Dockerfile.frontend](../Dockerfile.frontend): Multi-stage build for React + nginx
- [deployment/base/golem-app/nginx-frontend.conf](../deployment/base/golem-app/nginx-frontend.conf): Nginx config with alias directive
- [web/react-frontend/vite.config.js](../web/react-frontend/vite.config.js): Vite config with base path
- [deployment/golem-app/httproutes.yaml](../deployment/golem-app/httproutes.yaml): HTTPRoute definitions

### Backend
- [cmd/server/main.go](../cmd/server/main.go): API_PREFIX implementation
- [deployment/base/golem-app/deployment.yaml](../deployment/base/golem-app/deployment.yaml): Backend deployment

### Deployment
- [ansible/deploy-frontend-gateway.yml](../ansible/deploy-frontend-gateway.yml): Frontend deployment playbook
- [Makefile](../Makefile): Deployment targets

## Nginx Configuration

### Working Configuration

```nginx
server {
    listen 80;
    server_name _;
    index index.html;

    # Serve frontend at /apps/golem
    location /apps/golem/ {
        alias /usr/share/nginx/html/;
        try_files $uri $uri/ /index.html =404;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### Key Points

1. **Alias Directive**: Maps `/apps/golem/` to `/usr/share/nginx/html/`
   - `/apps/golem/assets/file.js` → `/usr/share/nginx/html/assets/file.js`
   
2. **No Root Directive**: Root conflicts with alias, so it's removed from server block

3. **No Regex Locations**: Regex locations for static files (`.js$`, `.css$`) take precedence over prefix locations, breaking the alias mapping. Removed to fix 404 errors.

4. **SPA Fallback**: `try_files $uri $uri/ /index.html` ensures React Router works

## Troubleshooting

### Asset 404 Errors

**Problem**: JavaScript/CSS files returning 404 despite being in container

**Solution**: 
1. Remove `root` directive from server block
2. Remove regex `location ~* \.(js|css|...)$` blocks that interfere with alias
3. Use simple `location /apps/golem/` with `alias` directive
4. Ensure trailing slash in location path: `/apps/golem/` not `/apps/golem`

### File Hash Mismatch

**Problem**: HTML references different file hash than what exists

**Cause**: Vite generates new hashes on each build (cache-busting)

**Solution**: Always check actual filenames in `/usr/share/nginx/html/assets/` after deployment

### Platform Mismatch

**Problem**: Image built for arm64 on M1 Mac won't run on amd64 server

**Solution**: Use `docker buildx build --platform linux/amd64`

## Testing

```bash
# Test backend API
curl -k https://apps.vietky.io.vn:30443/api/golem/api/list

# Test frontend HTML
curl -k https://apps.vietky.io.vn:30443/apps/golem/

# Test frontend assets
curl -k https://apps.vietky.io.vn:30443/apps/golem/assets/index-*.js -I

# Check deployment status
ssh root@157.66.101.66 'kubectl get pods -n default | grep golem'

# Check logs
ssh root@157.66.101.66 'kubectl logs -n default deployment/golem-nginx'
```

## Migration from Ingress

### What Changed

1. **Removed**: All Ingress resources
2. **Added**: HTTPRoute resources in `deployment/golem-app/httproutes.yaml`
3. **Modified**: 
   - Vite base path changed to `/apps/golem/`
   - Backend routes now include `/api/golem` prefix
   - Frontend served from container instead of PVC

### Backward Compatibility

Old Ingress URLs still work temporarily if Ingress resources are kept, but should be migrated to new paths:

- Old: `https://apps.vietky.io.vn/golem` → New: `https://apps.vietky.io.vn:30443/apps/golem/`
- Old: `https://apps.vietky.io.vn/api/list` → New: `https://apps.vietky.io.vn:30443/api/golem/api/list`

## Benefits of Gateway API

1. **Standardized**: Kubernetes-native API with vendor support
2. **Flexible**: Better routing capabilities than Ingress
3. **Cross-namespace**: ReferenceGrant enables secure resource sharing
4. **Future-proof**: Ingress is being deprecated in favor of Gateway API

## Known Limitations

1. **URLRewrite Not Supported**: NGINX Gateway Controller only supports RequestRedirect/RequestHeaderModifier. Path stripping must be done in application or nginx config.

2. **Path Prefixes Required**: Both frontend and backend must handle their respective path prefixes (`/apps/golem` and `/api/golem`)

3. **Self-signed Certificate**: Currently using self-signed cert, should replace with Let's Encrypt for production

## Next Steps

1. Replace self-signed certificate with Let's Encrypt
2. Add monitoring for Gateway/HTTPRoute resources
3. Document staging environment deployment
4. Remove old Ingress resources completely
5. Update CI/CD pipelines to use new playbooks
