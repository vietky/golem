# K3S Deployment - Ready to Deploy!

## ✅ Pre-Deployment Checklist

All deployment prerequisites have been verified:

- [x] Ansible playbook syntax is valid
- [x] SSH connection to k3s server (157.66.101.66) works
- [x] k3s is installed on server (v1.28.5+k3s1)
- [x] Secrets file configured with Telegram credentials
- [x] Docker is installed locally
- [x] Frontend source directory exists
- [x] Nginx directory exists on server

## 🚀 Deployment Commands

### Full Deployment (Recommended)
Deploy both backend (k3s) and frontend (nginx):
```bash
make k3s-deploy-full
```

### Backend Only
Deploy only the backend application to k3s:
```bash
make k3s-deploy
```

### Frontend Only
Deploy only the frontend to nginx:
```bash
make k3s-frontend
```

### Test Configuration
Test deployment configuration without making changes:
```bash
make k3s-test
```

## 📋 What Will Be Deployed

### Backend (Kubernetes/k3s)
- **Namespaces**: `golem-database`, `golem-cache`, `golem-app`
- **MongoDB**: Deployed in `golem-database` namespace with 10Gi persistent storage
- **Redis**: Deployed in `golem-cache` namespace with 5Gi persistent storage  
- **Application**: 2 replicas in `golem-app` namespace
- **Service**: NodePort on port 30080
- **Secrets**: Telegram bot credentials (from secrets/.env)

### Frontend (Nginx)
- **Location**: /opt/nginx/apps/golem
- **Static Assets**: /opt/nginx/apps/assets
- **Built with**: Vite, configured for https://game.anhtran.dev

## 🔧 Deployment Process

The Ansible playbook will:

1. **Validate k3s installation** on remote server
2. **Create Kubernetes namespaces** (golem-database, golem-cache, golem-app)
3. **Deploy MongoDB** with persistent volume
4. **Deploy Redis** with persistent volume
5. **Build Docker image** locally
6. **Export and import image** to k3s
7. **Deploy application** (2 replicas)
8. **Create ConfigMaps and Secrets** from local secrets/
9. **Wait for all pods** to be ready
10. **Build frontend** (if not already built)
11. **Deploy frontend** to /opt/nginx/apps/golem
12. **Copy static assets** to /opt/nginx/apps/assets

## 📊 Expected Results

After successful deployment:

### Backend API
- URL: `http://157.66.101.66:30080`
- Health: `http://157.66.101.66:30080/health`

### Frontend
- URL: `https://game.anhtran.dev`
- Assets: `https://game.anhtran.dev/assets`

### Kubernetes Resources
```bash
# Check status
make k3s-status

# View logs
make k3s-logs        # Application logs
make k3s-logs-db     # MongoDB logs
make k3s-logs-cache  # Redis logs
```

## 🐛 Troubleshooting

### If deployment fails:

1. **Check Ansible output** for specific errors
2. **Verify SSH access**: `ssh root@157.66.101.66`
3. **Check k3s status**: `ssh root@157.66.101.66 "systemctl status k3s"`
4. **View pod status**: `make k3s-status`
5. **Check logs**: `make k3s-logs`

### Common Issues

**Problem**: Pods stuck in ImagePullBackOff
- **Solution**: Image import might have failed. Check `make k3s-logs` and redeploy

**Problem**: MongoDB/Redis not starting
- **Solution**: Check storage: `ssh root@157.66.101.66 "kubectl get pvc -A"`

**Problem**: Frontend not accessible
- **Solution**: Check nginx configuration and restart nginx

## 📝 Next Steps

### 1. Run Pre-Deployment Test
```bash
make k3s-test
```

### 2. Deploy
```bash
make k3s-deploy-full
```

### 3. Verify Deployment
```bash
# Check all resources
make k3s-status

# Test backend API
curl http://157.66.101.66:30080/health

# Test frontend
curl https://game.anhtran.dev
```

### 4. Monitor
```bash
# View application logs
make k3s-logs

# SSH to server and check
ssh root@157.66.101.66
kubectl get all -n golem-app
kubectl get pods -A | grep golem
```

## 🔐 Security Notes

- Secrets are loaded from local `secrets/.env` file
- Secrets are transmitted securely via Ansible
- Secrets are stored as Kubernetes Secrets
- The `secrets/` directory is gitignored

## 📚 Documentation

- [Ansible README](../ansible/README.md) - Detailed Ansible documentation
- [Deployment README](../deployment/README.md) - Kubernetes deployment guide
- [Quick Reference](K3S_DEPLOYMENT_QUICK_REFERENCE.md) - Command quick reference

## ✨ Ready to Deploy!

Everything is configured and tested. Run:

```bash
make k3s-deploy-full
```

This will deploy both backend (k3s) and frontend (nginx) in one command.

---

*Last tested: $(date)*
*Server: 157.66.101.66*
*k3s version: v1.28.5+k3s1*
