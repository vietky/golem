# Golem Century Deployment Quickstart

This guide provides step-by-step instructions for deploying Golem Century with Firebase authentication, environment variable management, and Docker orchestration.

## What's New in This Deployment

1. **Firebase Service Account Management**: Service accounts are now managed via Ansible templates
2. **Two-Playbook Workflow**: Separate playbooks for secrets setup and application deployment
3. **Environment Variable Management**: Multiple environment file formats for different contexts (shell, .env, systemd)
4. **Docker Integration**: Service account volumes automatically mounted in containers
5. **.env File Support**: Backend now loads environment variables from .env using godotenv

## Prerequisites

### On Your Local Machine
```bash
# 1. Install Ansible
pip install ansible

# 2. Get Firebase credentials
# Download service account JSON from Google Cloud Console
# Project: Settings → Service Accounts → Create Key (JSON)

# 3. Clone and navigate to golem
cd ~/codes/golem
```

### On Deployment Server
The Ansible playbooks will automatically install:
- Docker & Docker Compose
- Git
- Required system packages

But you need:
- sudo privileges for your SSH user
- SSH key-based authentication configured

## Deployment Workflow

### Option 1: Full Deployment (Recommended)

Complete deployment with all setup in one command:

```bash
# 1. Prepare credentials
mkdir -p ~/deploy-secrets
cp ~/Downloads/firebase-service-account.json ~/deploy-secrets/

# 2. Edit inventory
cp ansible/inventory.ini.example ansible/inventory.ini
nano ansible/inventory.ini
# Update: deployment_servers section with your server details

# 3. Run full deployment
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml \
  -e "firebase_project_id=my-golem-dev" \
  -e "firebase_sa_path=~/deploy-secrets/firebase-service-account.json"

# 4. Verify
ssh ubuntu@your-server
docker ps | grep golem
docker logs -f golem-century-server
```

### Option 2: Separate Steps (For Manual Control)

If you want to manage secrets and deployment separately:

```bash
# Step 1: Setup secrets only
ansible-playbook -i ansible/inventory.ini ansible/setup-secrets.yml \
  -e "firebase_project_id=my-golem-dev" \
  -e "firebase_sa_path=~/deploy-secrets/firebase-service-account.json"

# Verify secrets were created
ssh ubuntu@your-server
cat /etc/profile.d/golem-env.sh
echo $FIREBASE_PROJECT_ID  # Should print your project ID

# Step 2: Deploy application separately
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml \
  -e "firebase_project_id=my-golem-dev" \
  -e "firebase_sa_path=~/deploy-secrets/firebase-service-account.json"
```

## Configuration Variables

### Essential Variables (Always Required)
```bash
firebase_project_id=my-golem-dev          # Your Firebase project ID
firebase_sa_path=~/deploy-secrets/sa.json # Path to service account JSON
```

### Optional Variables
```bash
# Application
-e "app_user=golem"                    # User to run app (default: golem)
-e "server_port=8080"                  # Server port (default: 8080)
-e "git_branch=main"                   # Git branch to deploy (default: main)

# Database
-e "mongo_uri=mongodb://localhost:27017"  # MongoDB URI
-e "mongo_db=golem_game"               # Database name

# Notifications
-e "telegram_bot_token=YOUR_TOKEN"     # Telegram bot token (optional)
-e "telegram_chat_id=YOUR_CHAT_ID"     # Telegram chat ID (optional)

# Logging
-e "log_level=info"                    # info, debug, warn, error
-e "log_format=json"                   # json or text
```

### Full Example with All Variables
```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml \
  -e "firebase_project_id=my-golem-dev" \
  -e "firebase_sa_path=~/deploy-secrets/firebase-service-account.json" \
  -e "app_user=golem" \
  -e "server_port=8080" \
  -e "git_branch=main" \
  -e "log_level=debug" \
  -e "mongo_uri=mongodb://mongo:27017" \
  -e "telegram_bot_token=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
```

## Environment Files Created

After deployment, three environment files are created:

### 1. Application .env File
**Location**: `~golem/.env`  
**Permissions**: 0600 (readable by app user only)  
**Used by**: Backend application (loaded via godotenv)

```bash
# View contents
ssh ubuntu@your-server
cat ~/.env | head -20  # Show first 20 lines
```

### 2. Shell Environment File
**Location**: `/etc/profile.d/golem-env.sh`  
**Permissions**: 0644 (readable by all, written by root)  
**Used by**: Shell sessions and scripts

```bash
# Load in current shell
ssh ubuntu@your-server
source /etc/profile.d/golem-env.sh
echo $FIREBASE_PROJECT_ID  # Verify it's loaded
```

### 3. Systemd Environment File
**Location**: `/etc/default/golem`  
**Permissions**: 0600 (readable by root/service only)  
**Used by**: systemd services (if configured)

```bash
# View contents
ssh ubuntu@your-server
sudo cat /etc/default/golem
```

## Post-Deployment Verification

### On Deployment Server
```bash
# SSH into server
ssh ubuntu@your-server

# 1. Check environment variables
source /etc/profile.d/golem-env.sh
echo "Firebase Project: $FIREBASE_PROJECT_ID"
echo "Service Account: $FIREBASE_CREDENTIALS_PATH"

# 2. Check service account file
ls -la ~/golem/sa/firebase-service-account.json
# Should show: -rw------- (0600 permissions)

# 3. Verify JSON is valid
python3 -m json.tool ~/golem/sa/firebase-service-account.json | head

# 4. Check Docker containers
docker ps | grep golem

# 5. View application logs
docker logs -f golem-century-server

# 6. Test API endpoint
curl http://localhost:8080/api/health

# 7. Check firebase config in logs
docker logs golem-century-server | grep -i firebase
```

### From Local Machine
```bash
# Test WebSocket connection
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
  http://your-server:8080/ws?session=test&name=TestPlayer

# Or from Node.js test script
node scripts/test-ws-quick.js ws://your-server:8080/ws

# Or test API
curl http://your-server:8080/api/list | jq
```

## Troubleshooting

### Firebase Configuration Not Loaded
```bash
# Check if .env file exists
docker exec golem-century-server ls -la /app/.env

# Check if godotenv is loading in code
docker exec golem-century-server grep -n "godotenv" cmd/server/main.go

# View backend logs for godotenv messages
docker logs golem-century-server | grep -E "^(firebase|error|warn)" | head -20
```

### Service Account File Permissions Error
```bash
# Check permissions on deployment server
ls -la ~/golem/sa/firebase-service-account.json

# Should be: -rw------- 1 golem golem
# If wrong, fix with:
sudo chmod 600 ~/golem/sa/firebase-service-account.json
sudo chown golem:golem ~/golem/sa/firebase-service-account.json
```

### Docker Volume Not Mounted
```bash
# Verify mount in container
docker inspect golem-century-server | grep -A 10 "Mounts"

# Should show:
# "Source": "/home/golem/golem/sa/firebase-service-account.json",
# "Destination": "/app/firebase-service-account.json",
# "Mode": "ro"
```

### Environment Variables Not Set in Shell
```bash
# Check if file exists and is readable
cat /etc/profile.d/golem-env.sh

# Manually source
source /etc/profile.d/golem-env.sh

# Verify
env | grep FIREBASE

# Check file permissions
ls -la /etc/profile.d/golem-env.sh
# Should be readable by all: -rw-r--r-- or -rwxr-xr-x
```

### Ansible Authentication Issues
```bash
# Test SSH connection
ssh -i ~/.ssh/deployment_key ubuntu@your-server "echo OK"

# List available SSH keys
ssh-add -l

# Add key to agent
ssh-add ~/.ssh/deployment_key

# Test with verbose Ansible output
ansible -i ansible/inventory.ini deployment_servers -m ping -vvv
```

### Container Fails to Start
```bash
# Check Docker Compose logs
ssh ubuntu@your-server
cd ~/golem
docker-compose logs golem-century-server | tail -50

# Check if port is already in use
sudo netstat -tlnp | grep 8080

# Check Docker daemon status
systemctl status docker
```

## Updating Deployment

### Update Application Code
```bash
# Option 1: Redeploy with same configuration
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml \
  -e "firebase_project_id=my-golem-dev" \
  -e "firebase_sa_path=~/deploy-secrets/firebase-service-account.json" \
  -e "git_branch=main"  # Or desired branch

# Option 2: Manual update
ssh ubuntu@your-server
cd ~/golem
git pull origin main
docker-compose pull
docker-compose up -d
```

### Update Environment Variables
```bash
# Update secrets using setup-secrets.yml
ansible-playbook -i ansible/inventory.ini ansible/setup-secrets.yml \
  -e "firebase_project_id=my-golem-prod" \
  -e "firebase_sa_path=~/deploy-secrets/firebase-service-account.json" \
  -e "log_level=debug"

# Or manually on server
ssh ubuntu@your-server
nano ~/.env
source /etc/profile.d/golem-env.sh
docker-compose restart
```

## Local Testing Before Deployment

### Test Docker Compose Locally
```bash
# Ensure Firebase credentials are accessible
cp ~/deploy-secrets/firebase-service-account.json ./sa/

# Create local .env
cat > .env << EOF
FIREBASE_PROJECT_ID=my-golem-dev
FIREBASE_CREDENTIALS_PATH=/app/firebase-service-account.json
SERVER_PORT=8080
LOG_LEVEL=debug
EOF

# Start services
docker-compose -f docker-compose.dev.yml up

# Test API
curl http://localhost:8080/api/health

# Test WebSocket
# In another terminal:
node scripts/test-ws-quick.js ws://localhost:8080/ws
```

### Test Ansible Playbook in Check Mode
```bash
# Preview changes without applying
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml \
  -e "firebase_project_id=my-golem-dev" \
  -e "firebase_sa_path=~/deploy-secrets/firebase-service-account.json" \
  --check

# With verbose output to see what would happen
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml \
  -e "firebase_project_id=my-golem-dev" \
  -e "firebase_sa_path=~/deploy-secrets/firebase-service-account.json" \
  --check -vv
```

## Production Deployment Checklist

- [ ] Firebase service account JSON downloaded and secured
- [ ] Ansible inventory.ini configured with production server details
- [ ] SSH key authentication working without password prompt
- [ ] Tested ansible connectivity: `ansible deployment_servers -m ping`
- [ ] Created variables file or have all -e flags ready
- [ ] Domain/IP address configured and reachable
- [ ] Firewall rules allow port 8080 (or your configured port)
- [ ] MongoDB connection tested (if using external MongoDB)
- [ ] Redis connection tested (if using Redis)
- [ ] Telegram credentials ready (if using notifications)
- [ ] Tested deployment in check mode (--check flag)
- [ ] Backup any existing configuration
- [ ] Monitored deployment logs in real-time
- [ ] Verified all containers are running (docker ps)
- [ ] Tested API endpoints (curl http://server/api/health)
- [ ] Tested WebSocket connection
- [ ] Verified Firebase configuration is loaded
- [ ] Set up log rotation and monitoring
- [ ] Configured automatic backup schedule
- [ ] Documented custom configuration for future reference

## Next Steps

1. **Set up monitoring**: Configure Docker healthchecks and log aggregation
2. **Enable auto-restart**: Configure systemd service for auto-restart on reboot
3. **Set up CI/CD**: Configure GitHub Actions or Jenkins for automated deployments
4. **Configure reverse proxy**: Set up Nginx/Apache for HTTPS and load balancing
5. **Enable backups**: Set up MongoDB backups and encryption
6. **Document custom configuration**: Create runbook for your deployment

See [ansible/README.md](./README.md) for detailed documentation.
