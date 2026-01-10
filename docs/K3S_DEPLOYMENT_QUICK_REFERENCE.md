# K3S Deployment Quick Reference

## Initial Setup (One-Time)

```bash
# Setup Docker registry on server
make k3s-setup-registry
```

## Quick Deploy

```bash
# From project root
make k3s-deploy
```

## Common Commands

### Initial Setup
```bash
make k3s-setup-registry  # Setup Docker registry (one-time)
make k3s-test            # Test configuration
```

### Deploy
```bash
make k3s-deploy                         # Deploy latest version
make k3s-deploy-version VERSION=v1.0.0  # Deploy specific version
```

### Monitor
```bash
make k3s-status      # Check all resources
make k3s-logs        # View application logs
make k3s-logs-db     # View database logs
make k3s-logs-cache  # View cache logs
```

### Scale
```bash
make k3s-scale REPLICAS=3  # Scale to 3 replicas
```

### Manage
```bash
make k3s-restart     # Restart application
make k3s-shell       # Open shell in pod
make k3s-describe    # Describe deployment
make k3s-cleanup     # Remove all resources
```

## Access Application

```
http://157.66.101.66:30080
```

## Namespaces

- `golem-database` - MongoDB
- `golem-cache` - Redis
- `golem-app` - Application

## Files Structure

```
deployment/
├── namespaces/           # Namespace definitions
│   ├── golem-database.yaml
│   ├── golem-cache.yaml
│   └── golem-app.yaml
├── mongodb/              # MongoDB in golem-database namespace
│   ├── pvc.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── redis/                # Redis in golem-cache namespace
│   ├── pvc.yaml
│   ├── deployment.yaml
│   └── service.yaml
└── golem-app/            # Application in golem-app namespace
    ├── configmap.yaml
    ├── secret.yaml.template
    ├── deployment.yaml
    └── service.yaml
```

## Secrets Setup

```bash
# Create secrets directory
mkdir -p secrets

# Add credentials
cat > secrets/.env <<EOF
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
EOF

# Deploy (secrets will be automatically included)
make k3s-deploy
```

## Troubleshooting

### Pods not starting
```bash
ssh root@157.66.101.66 "kubectl get pods -n golem-app"
ssh root@157.66.101.66 "kubectl describe pod <pod-name> -n golem-app"
```

### Application not accessible
```bash
# Test from server
ssh root@157.66.101.66 "curl http://localhost:30080/health"

# Check service
ssh root@157.66.101.66 "kubectl get svc -n golem-app"
```

### Database connection issues
```bash
# Check MongoDB
ssh root@157.66.101.66 "kubectl get pods -n golem-database"
ssh root@157.66.101.66 "kubectl logs -n golem-database deployment/mongodb"

# Check Redis
ssh root@157.66.101.66 "kubectl get pods -n golem-cache"
ssh root@157.66.101.66 "kubectl logs -n golem-cache deployment/redis"
```

## Direct kubectl Access

```bash
# SSH to server
ssh root@157.66.101.66

# Set kubeconfig
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Use kubectl
kubectl get all -n golem-app
kubectl logs -f -n golem-app deployment/golem-century
kubectl exec -it -n golem-app deployment/golem-century -- sh
```

## Update Configuration

```bash
# Edit local file
vi deployment/golem-app/configmap.yaml

# Redeploy
make k3s-deploy

# Or edit directly on cluster
ssh root@157.66.101.66 "kubectl edit configmap golem-app-config -n golem-app"
ssh root@157.66.101.66 "kubectl rollout restart deployment/golem-century -n golem-app"
```

## Backup Data

```bash
# MongoDB backup
ssh root@157.66.101.66 "kubectl exec -n golem-database deployment/mongodb -- mongodump --archive > mongodb-backup.archive"

# Redis backup
ssh root@157.66.101.66 "kubectl exec -n golem-cache deployment/redis -- redis-cli SAVE"
```

## Full Documentation

- [Ansible README](ansible/README.md)
- [Deployment README](deployment/README.md)
