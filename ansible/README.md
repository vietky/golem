# Ansible Deployment for Golem Century

This directory contains Ansible playbooks for deploying Golem Century game to k3s (Kubernetes).

## Overview

The deployment uses Ansible to automate the deployment of Golem Century to a k3s cluster. It includes:

- Kubernetes manifests for all components (MongoDB, Redis, Application)
- Automated secret management from local `secrets/` directory
- Docker image building and importing to k3s
- Health checks and deployment verification
- Multi-namespace deployment for better isolation

## Prerequisites

### Local Machine

1. **Ansible** installed:
   ```bash
   # macOS
   brew install ansible
   
   # Ubuntu/Debian
   sudo apt update && sudo apt install ansible
   
   # Python pip
   pip install ansible
   ```

2. **SSH access** to the k3s server configured in `~/.ssh/config` or with key file

3. **Docker** installed (for building images locally)

### Remote Server

1. **k3s** must be installed and running on the target server (157.66.101.66)
   
   To install k3s:
   ```bash
   ssh root@157.66.101.66
   curl -sfL https://get.k3s.io | sh -
   
   # Verify installation
   kubectl get nodes
   ```

## Quick Start

### 1. Configure Inventory

The inventory file is already configured for server `157.66.101.66`:

```ini
[k3s_cluster]
157.66.101.66 ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_rsa
```

Edit `ansible/inventory.ini` if you need to change:
- Server IP address
- SSH user
- SSH key path

### 2. (Optional) Configure Secrets

If you want Telegram notifications, create `secrets/.env` in the project root:

```bash
mkdir -p secrets
cat > secrets/.env <<EOF
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
EOF
```

**Note**: The `secrets/` directory is gitignored and will not be committed.

### 3. Deploy

From the project root:

```bash
# Using make (recommended)
make k3s-deploy

# Or directly with the script
./scripts/deploy-k3s.sh

# Or with Ansible directly
cd ansible
ansible-playbook -i inventory.ini deploy-k3s.yml
```

### 4. Verify Deployment

```bash
# Check all resources
make k3s-status

# View application logs
make k3s-logs

# Access the application
open http://157.66.101.66:30080
```

## Deployment Process

The Ansible playbook performs these steps:

1. **Pre-flight Checks**
   - Verifies k3s is installed on target server
   - Checks for local secrets directory
   - Loads Telegram credentials if available

2. **Copy Manifests**
   - Copies all Kubernetes manifests to server
   - Processes secret template with actual values

3. **Create Resources**
   - Creates namespaces (golem-database, golem-cache, golem-app)
   - Deploys MongoDB with persistent storage
   - Deploys Redis with persistent storage
   - Creates ConfigMaps and Secrets

4. **Build and Deploy Application**
   - Builds Docker image locally
   - Exports image to tar file
   - Copies to k3s server
   - Imports into k3s container registry
   - Deploys application

5. **Health Checks**
   - Waits for MongoDB to be ready
   - Waits for Redis to be ready
   - Waits for application pods to be ready
   - Reports access information

## Directory Structure

```
ansible/
├── deploy-k3s.yml          # Main Ansible playbook
├── inventory.ini           # Server inventory
└── README.md              # This file

deployment/
├── namespaces/            # Namespace definitions
│   ├── golem-database.yaml
│   ├── golem-cache.yaml
│   └── golem-app.yaml
├── mongodb/               # MongoDB manifests
│   ├── pvc.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── redis/                 # Redis manifests
│   ├── pvc.yaml
│   ├── deployment.yaml
│   └── service.yaml
└── golem-app/             # Application manifests
    ├── configmap.yaml
    ├── secret.yaml.template
    ├── deployment.yaml
    └── service.yaml
```

## Configuration

### Environment Variables

You can override default values using environment variables:

```bash
# Deploy specific version
APP_VERSION=v1.0.0 make k3s-deploy

# Use custom Docker registry
DOCKER_REGISTRY=myregistry.com make k3s-deploy
```

### Ansible Variables

In `deploy-k3s.yml`, you can customize:

- `app_name`: Application name (default: golem-century)
- `docker_registry`: Docker registry URL (default: localhost:5000)
- `app_version`: Application version tag (default: latest)

## Secrets Management

The playbook implements intelligent secret detection:

1. **Checks for secrets directory** (`secrets/` in project root)
2. **If found**:
   - Reads `secrets/.env` file
   - Extracts `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
   - Populates secret template
   - Creates Kubernetes Secret
3. **If not found**:
   - Skips secret creation
   - Telegram notifications disabled
   - Application still functions normally

### Adding Secrets After Deployment

If you initially deployed without secrets and want to add them:

```bash
# Create secrets
mkdir -p secrets
cat > secrets/.env <<EOF
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
EOF

# Redeploy (only secrets will be updated)
make k3s-deploy
```

## Management Commands

### Via Makefile

```bash
# Deploy
make k3s-deploy                        # Deploy latest
make k3s-deploy-version VERSION=v1.0.0 # Deploy specific version

# Monitor
make k3s-status                        # Check all resources
make k3s-logs                          # View app logs
make k3s-logs-db                       # View database logs
make k3s-logs-cache                    # View cache logs

# Scale
make k3s-scale REPLICAS=3              # Scale to 3 replicas

# Maintain
make k3s-restart                       # Restart application
make k3s-cleanup                       # Remove all resources

# Debug
make k3s-shell                         # Shell into app pod
make k3s-describe                      # Describe deployment
```

### Direct kubectl Commands

```bash
# SSH to server first
ssh root@157.66.101.66

# Check resources
kubectl get all -A | grep golem
kubectl get pods -n golem-app
kubectl get svc -n golem-app

# View logs
kubectl logs -f -n golem-app deployment/golem-century
kubectl logs -f -n golem-database deployment/mongodb

# Scale
kubectl scale deployment golem-century --replicas=3 -n golem-app

# Update config
kubectl edit configmap golem-app-config -n golem-app
kubectl rollout restart deployment/golem-century -n golem-app
```

## Updating the Application

### Code Changes

```bash
# Simply redeploy - it will rebuild and update
make k3s-deploy
```

### Configuration Changes

```bash
# Edit deployment/golem-app/configmap.yaml locally
# Then redeploy
make k3s-deploy
```

### Secrets Changes

```bash
# Update secrets/.env
# Then redeploy
make k3s-deploy
```

## Troubleshooting

### Deployment Fails

```bash
# Check Ansible output for specific errors
# Common issues:

# 1. k3s not installed
ssh root@157.66.101.66 "systemctl status k3s"

# 2. SSH connection issues
ssh root@157.66.101.66 "echo connected"

# 3. Docker not available locally
docker version
```

### Pods Not Starting

```bash
# Check pod status
ssh root@157.66.101.66 "kubectl get pods -n golem-app"

# Describe pod for events
ssh root@157.66.101.66 "kubectl describe pod <pod-name> -n golem-app"

# Check logs
make k3s-logs
```

### Application Not Accessible

```bash
# Check service
ssh root@157.66.101.66 "kubectl get svc -n golem-app"

# Check firewall
ssh root@157.66.101.66 "ufw status"

# Test from server
ssh root@157.66.101.66 "curl http://localhost:30080/health"
```

### Database Connection Issues

```bash
# Check MongoDB is running
ssh root@157.66.101.66 "kubectl get pods -n golem-database"

# Test connection from app namespace
ssh root@157.66.101.66 "kubectl run -it --rm debug --image=alpine --restart=Never -n golem-app -- sh"
# Inside the pod:
apk add curl
curl http://mongodb.golem-database.svc.cluster.local:27017
```

## Network Architecture

```
Internet
    ↓
157.66.101.66:30080 (NodePort)
    ↓
golem-century Service (ClusterIP)
    ↓
golem-century Pods (2 replicas)
    ├─→ MongoDB (golem-database namespace)
    │   ClusterIP: mongodb.golem-database.svc.cluster.local:27017
    │
    └─→ Redis (golem-cache namespace)
        ClusterIP: redis.golem-cache.svc.cluster.local:6379
```

## Storage

Each component uses PersistentVolumeClaims:

- **MongoDB**: 10Gi (k3s local-path storage)
- **Redis**: 5Gi (k3s local-path storage)

Data persists across pod restarts and redeployments.

### Backup Data

```bash
# MongoDB
ssh root@157.66.101.66 "kubectl exec -n golem-database deployment/mongodb -- mongodump --out=/tmp/backup"
ssh root@157.66.101.66 "kubectl cp golem-database/mongodb-xxx:/tmp/backup ./mongodb-backup"

# Redis
ssh root@157.66.101.66 "kubectl exec -n golem-cache deployment/redis -- redis-cli BGSAVE"
```

## Production Recommendations

1. **Use Ingress**: Set up Traefik/nginx-ingress for SSL and domain routing
2. **External Secrets**: Use Sealed Secrets or External Secrets Operator
3. **Monitoring**: Deploy Prometheus + Grafana
4. **Logging**: Centralized logging with Loki or ELK
5. **Backups**: Automated MongoDB backups with Velero
6. **Resource Limits**: Tune based on actual usage patterns
7. **Multi-node**: For HA, use multi-node k3s cluster
8. **Image Registry**: Use private registry instead of local import

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to k3s

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Ansible
        run: sudo apt-get install -y ansible
      
      - name: Setup SSH Key
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
      
      - name: Create secrets
        run: |
          mkdir -p secrets
          echo "TELEGRAM_BOT_TOKEN=${{ secrets.TELEGRAM_BOT_TOKEN }}" > secrets/.env
          echo "TELEGRAM_CHAT_ID=${{ secrets.TELEGRAM_CHAT_ID }}" >> secrets/.env
      
      - name: Deploy
        run: make k3s-deploy
```

## Support

For more information, see:
- [Kubernetes Deployment README](../deployment/README.md)
- [Project README](../README.md)
- [k3s Documentation](https://docs.k3s.io/)

## License

Same as parent project.
