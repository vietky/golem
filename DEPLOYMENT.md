# Deployment Guide

## 🐳 Docker Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Quick Start

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t golem-century:latest .

# Run container
docker run -d \
  --name golem-century \
  -p 8080:8080 \
  --restart unless-stopped \
  golem-century:latest
```

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration

- [ ] Verify Go version compatibility (1.24+)
- [ ] Check Node.js version for React build (18+)
- [ ] Ensure all images are in `web/static/images/`
- [ ] Test React frontend build locally: `cd web/react-frontend && npm run build`

### 2. Docker Configuration

- [ ] Update port mapping in `docker-compose.yml` if needed
- [ ] Set environment variables if required
- [ ] Configure healthcheck timeout if needed
- [ ] Review resource limits

### 3. Server Configuration

- [ ] Update CORS settings if deploying to specific domain
- [ ] Configure reverse proxy (nginx/traefik) for HTTPS
- [ ] Set up SSL certificates
- [ ] Configure firewall rules

### 4. Testing

- [ ] Test Docker build: `docker build -t golem-century:test .`
- [ ] Test container run: `docker run -p 8080:8080 golem-century:test`
- [ ] Verify WebSocket connections work
- [ ] Test room creation and joining
- [ ] Verify images load correctly
- [ ] Test room auto-cleanup (wait 5 minutes)

## 🚀 Production Deployment

### Option 1: Docker Compose (Recommended)

```bash
# Production deployment
docker-compose -f docker-compose.yml up -d --build

# With custom port
PORT=9000 docker-compose up -d
```

### Option 2: Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml golem-century
```

### Option 3: Kubernetes

Create Kubernetes manifests based on docker-compose.yml:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: golem-century
spec:
  replicas: 1
  selector:
    matchLabels:
      app: golem-century
  template:
    metadata:
      labels:
        app: golem-century
    spec:
      containers:
      - name: golem-century
        image: golem-century:latest
        ports:
        - containerPort: 8080
        env:
        - name: PORT
          value: "8080"
```

## 🔧 Configuration Options

### Environment Variables

- `PORT` - Server port (default: 8080)

### Port Mapping

Default: `8080:8080`

To change external port:
```yaml
ports:
  - "9000:8080"  # External:Internal
```

### Resource Limits

Add to docker-compose.yml:
```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
    reservations:
      cpus: '0.5'
      memory: 256M
```

## 🌐 Reverse Proxy Setup (Nginx)

Example nginx config:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔒 Security Considerations

1. **CORS**: Currently allows all origins. Update in `internal/server/server.go` if needed
2. **HTTPS**: Use reverse proxy with SSL certificates
3. **Firewall**: Only expose necessary ports
4. **Rate Limiting**: Consider adding rate limiting for API endpoints
5. **Authentication**: Add auth if deploying publicly

## 📊 Monitoring

### Health Check

Container includes healthcheck:
```bash
# Check health
docker ps  # Look for "healthy" status

# Manual check
curl http://localhost:8080/
```

### Logs

```bash
# View logs
docker-compose logs -f

# View last 100 lines
docker-compose logs --tail=100
```

## 🐛 Troubleshooting

### Build Fails

```bash
# Check Go version
docker run --rm golang:1.24-alpine go version

# Check Node version
docker run --rm node:18-alpine node --version

# Build with verbose output
docker build --progress=plain -t golem-century .
```

### Container Won't Start

```bash
# Check logs
docker logs golem-century

# Run interactively
docker run -it --rm golem-century:latest sh
```

### Images Not Loading

- Verify images exist in `web/static/images/`
- Check file permissions
- Verify symlink in React frontend

### WebSocket Issues

- Check firewall settings
- Verify reverse proxy WebSocket upgrade
- Test WebSocket connection: `wscat -c ws://localhost:8080/ws?session=test&name=test`

## 📝 Notes

- React frontend is built during Docker build
- If React build fails, server falls back to vanilla JS frontend
- Room cleanup runs automatically (5 minutes inactivity)
- All game state is in-memory (lost on restart)

