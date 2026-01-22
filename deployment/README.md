# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying Golem Century Game on k3s with support for staging and production environments.

## Directory Structure

```
deployment/
├── namespaces/           # Namespace definitions
│   ├── golem-staging.yaml    # Staging namespace
│   └── golem.yaml            # Production namespace
├── overlays/             # Environment-specific configurations
│   ├── staging/          # Staging environment (golem-staging namespace)
│   │   └── kustomization.yaml
│   └── production/       # Production environment (golem namespace)
│       └── kustomization.yaml
├── mongodb/              # MongoDB base manifests
│   ├── pvc.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── redis/                # Redis base manifests
│   ├── pvc.yaml
│   ├── deployment.yaml
│   └── service.yaml
└── golem-app/            # Application base manifests
    ├── configmap.yaml
    ├── secret.yaml.template
    ├── deployment.yaml
    ├── service.yaml
    └── httproutes.yaml
```

## Environment Configuration

### Staging Environment
- **Namespace**: `golem-staging`
- **DNS**: `staging.game.anhtran.dev`
- **Replicas**: 1
- **MongoDB Storage**: 5Gi
- **MongoDB Memory**: 512Mi
- **Redis Storage**: 2Gi

### Production Environment
- **Namespace**: `golem`
- **DNS**: `prod.game.anhtran.dev`
- **Replicas**: 2
- **MongoDB Storage**: 10Gi
- **MongoDB Memory**: 1Gi
- **Redis Storage**: 5Gi

## Prerequisites

1. k3s cluster running on target server
2. `kubectl` configured with access to the cluster
3. Gateway API installed (or use `make k3s-install-gateway`)
4. cert-manager installed for SSL certificates (optional, for production)
5. Ansible installed locally
6. SSH access to the k3s server
7. Git repository set up on server at `/opt/jenkins/repos/golem`
8. (Optional) `secrets/.env` file with Telegram credentials

## Git Repository Setup

The deployment now uses git instead of copying source code. Set up the repository on your server:

```bash
# SSH to your server
ssh root@157.66.101.66

# Create directory and clone repository
mkdir -p /opt/jenkins/repos
cd /opt/jenkins/repos
git clone <your-git-repo-url> golem

# Configure git (optional)
cd golem
git config pull.rebase false
```

## Deployment with Ansible

### 1. Configure Inventory

Edit `ansible/inventory.ini` to set your k3s server IP:

```ini
[k3s_cluster]
157.66.101.66 ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_ed25519
```

### 2. Prepare Secrets (Optional)

If you want to enable Telegram notifications, create `secrets/.env`:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

If the `secrets/` directory doesn't exist, the deployment will proceed without Telegram integration.

### 3. Deploy to Environment

#### Staging Deployment
```bash
# Deploy backend to staging
make k3s-deploy-staging

# Or using Ansible directly
cd ansible
DEPLOY_ENV=staging ansible-playbook -i inventory.ini deploy-k3s-backend.yml
```

#### Production Deployment
```bash
# Deploy backend to production
make k3s-deploy-prod

# Or using Ansible directly
cd ansible
DEPLOY_ENV=production ansible-playbook -i inventory.ini deploy-k3s-backend.yml
```

### 4. Deploy Specific Version

```bash
# Deploy version to staging
make k3s-deploy-version VERSION=v1.2.3 ENV=staging

# Deploy version to production
make k3s-deploy-version VERSION=v1.2.3 ENV=production
```

## Monitoring and Management

### Check Deployment Status

```bash
# Check staging environment
make k3s-status ENV=staging

# Check production environment
make k3s-status ENV=production

# Check both environments
make k3s-status-all
```

### View Logs

```bash
# Application logs (staging)
make k3s-logs ENV=staging

# Database logs (production)
make k3s-logs-db ENV=production

# Cache logs (staging)
make k3s-logs-cache ENV=staging
```

### Restart Application

```bash
# Restart staging
make k3s-restart ENV=staging

# Restart production
make k3s-restart ENV=production
```

## Manual Deployment

If you prefer manual deployment:

### 1. Create Namespaces

```bash
kubectl apply -f deployment/namespaces/
```

### 2. Deploy MongoDB

```bash
kubectl apply -f deployment/mongodb/
```

### 3. Deploy Redis

```bash
kubectl apply -f deployment/redis/
```

### 4. Deploy Application

```bash
# Apply ConfigMap
kubectl apply -f deployment/golem-app/configmap.yaml

# Create secret from template (if using Telegram)
# Edit secret.yaml.template and save as secret.yaml
kubectl apply -f deployment/golem-app/secret.yaml

# Build and load Docker image to k3s
docker build -t golem-century:latest .
docker save golem-century:latest -o /tmp/golem-century.tar
scp /tmp/golem-century.tar root@157.66.101.66:/tmp/
ssh root@157.66.101.66 "k3s ctr images import /tmp/golem-century.tar"

# Deploy application
kubectl apply -f deployment/golem-app/deployment.yaml
kubectl apply -f deployment/golem-app/service.yaml
```

## Accessing the Application

The application is exposed via NodePort on port 30080:

```
http://<server-ip>:30080
```

For the configured server:
```
http://157.66.101.66:30080
```

## Monitoring

### Check deployment status

```bash
# All namespaces
kubectl get all -A | grep golem

# Specific namespace
kubectl get all -n golem-app
kubectl get all -n golem-database
kubectl get all -n golem-cache
```

### View logs

```bash
# Application logs
kubectl logs -f -n golem-app deployment/golem-century

# MongoDB logs
kubectl logs -f -n golem-database deployment/mongodb

# Redis logs
kubectl logs -f -n golem-cache deployment/redis
```

### Check pod status

```bash
kubectl get pods -A | grep golem
```

## Updating the Application

### Using Ansible

```bash
cd ansible
ansible-playbook -i inventory.ini deploy-k3s.yml -e "app_version=latest"
```

### Manual Update

```bash
# Build new image
docker build -t golem-century:v2 .
docker save golem-century:v2 -o /tmp/golem-century.tar

# Copy to server and import
scp /tmp/golem-century.tar root@157.66.101.66:/tmp/
ssh root@157.66.101.66 "k3s ctr images import /tmp/golem-century.tar"

# Update deployment
kubectl set image deployment/golem-century golem-century=golem-century:v2 -n golem-app

# Or reapply manifests
kubectl apply -f deployment/golem-app/deployment.yaml
```

## Secrets Management

The Ansible playbook automatically detects and handles secrets:

1. Checks if `secrets/` directory exists
2. If found, reads `secrets/.env` file
3. Populates secret template with actual values
4. Applies secrets to k3s cluster
5. If no secrets found, skips secret deployment

**Important**: Never commit the `secrets/` directory or actual secret values to version control!

## Troubleshooting

### Pods not starting

```bash
kubectl describe pod <pod-name> -n <namespace>
```

### Service connectivity issues

```bash
# Test from within cluster
kubectl run -it --rm debug --image=alpine --restart=Never -- sh
apk add curl
curl http://golem-century.golem-app.svc.cluster.local:8080/health
```

### Storage issues

```bash
kubectl get pvc -A
kubectl describe pvc <pvc-name> -n <namespace>
```

### Check k3s status

```bash
ssh root@157.66.101.66 "systemctl status k3s"
ssh root@157.66.101.66 "kubectl get nodes"
```

## Scaling

### Scale application replicas

```bash
kubectl scale deployment golem-century --replicas=3 -n golem-app
```

### Update resource limits

Edit [deployment/golem-app/deployment.yaml](deployment/golem-app/deployment.yaml) and adjust:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

Then apply:
```bash
kubectl apply -f deployment/golem-app/deployment.yaml
```

## Cleanup

### Remove all resources

```bash
kubectl delete -f deployment/golem-app/
kubectl delete -f deployment/redis/
kubectl delete -f deployment/mongodb/
kubectl delete -f deployment/namespaces/
```

### Or use Ansible

```bash
cd ansible
ansible-playbook -i inventory.ini deploy-k3s.yml --tags cleanup
```

## Production Recommendations

1. **Persistent Storage**: Configure proper StorageClass for production PVCs
2. **Gateway API**: Set up Gateway API for better routing and SSL
3. **Monitoring**: Deploy Prometheus and Grafana for metrics
4. **Backups**: Implement automated backup strategy for MongoDB
5. **Secrets**: Use proper secret management (Sealed Secrets, External Secrets Operator)
6. **Resource Limits**: Fine-tune based on actual usage
7. **High Availability**: Run multiple replicas for all components
8. **Health Checks**: Ensure all probes are properly configured

## Network Architecture

```
External Traffic
    ↓
NodePort :30080
    ↓
Service: golem-century (golem-app namespace)
    ↓
Deployment: golem-century (2 replicas)
    ↓
├─→ MongoDB (golem-database namespace)
│   Service: mongodb.golem-database.svc.cluster.local:27017
│
└─→ Redis (golem-cache namespace)
    Service: redis.golem-cache.svc.cluster.local:6379
```

## Configuration Updates

To update configuration without redeploying:

```bash
# Edit ConfigMap
kubectl edit configmap golem-app-config -n golem-app

# Restart pods to pick up changes
kubectl rollout restart deployment/golem-century -n golem-app
```
