# 🚀 Quick Deployment Guide

## Redeploy to Server

If you already have Docker running on your server, follow these steps:

### 1. On Your Server

```bash
# Navigate to project directory
cd /path/to/golem

# Pull latest changes (if using git)
git pull

# Stop old container
docker-compose down

# Rebuild and start new container
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 2. What Changed

The new Docker setup includes:
- ✅ React frontend build (if available)
- ✅ Auto-fallback to vanilla JS if React build fails
- ✅ Room auto-cleanup (5 minutes)
- ✅ Updated Go version (1.24)
- ✅ Healthcheck included
- ✅ Better error handling

### 3. Verify Deployment

```bash
# Check if container is running
docker ps | grep golem

# Test server
curl http://localhost:8080/

# Check health
docker inspect golem-century-server | grep -A 10 Health
```

### 4. If Something Goes Wrong

```bash
# View detailed logs
docker-compose logs --tail=100

# Restart container
docker-compose restart

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Important Notes

- **Port**: Default is `8080:8080` (changed from `8081:8080` in old setup)
- **Images**: All images must be in `web/static/images/`
- **React**: Will build automatically, falls back to vanilla JS if fails
- **Data**: Game sessions are in-memory (lost on restart)

## Quick Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# View logs
docker-compose logs -f

# Rebuild
docker-compose up -d --build
```

