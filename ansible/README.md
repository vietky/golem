# Ansible Deployment Guide - Golem Century

## Overview

This directory contains Ansible playbooks for deploying Century: Golem Edition with complete configuration management, including Firebase service account setup and environment variable management.

## Prerequisites

### Local Machine
- Ansible 2.9+
- SSH access to deployment servers
- SSH key for authentication
- Firebase service account JSON file

### Deployment Server
- Linux (Debian/Ubuntu or RedHat/CentOS)
- sudo privileges for deployment user
- Docker and Docker Compose installed

## Playbooks

### 1. setup-secrets.yml
**Purpose**: Setup environment variables and Firebase credentials (standalone)

**What it does**:
- Creates app user and directories
- Copies Firebase service account to secure location (`/home/golem/golem/sa/`)
- Creates `.env` file for the application
- Creates shell environment file (`/etc/profile.d/golem-env.sh`)
- Creates systemd environment file (`/etc/default/golem`)

**Usage**:
```bash
# Secrets setup only
ansible-playbook -i inventory.ini setup-secrets.yml \
  -e "firebase_project_id=YOUR_PROJECT_ID" \
  -e "firebase_sa_path=/path/to/firebase-service-account.json"
```

**Required Variables**:
- `firebase_project_id`: Firebase project ID
- `firebase_sa_path`: Local path to Firebase service account JSON

**Optional Variables**:
```bash
-e "app_user=golem"                                    # Default: golem
-e "server_port=8080"                                  # Default: 8080
-e "mongo_uri=mongodb://localhost:27017"               # Default: localhost
-e "log_level=info"                                    # Default: info
-e "telegram_bot_token=YOUR_TOKEN"                     # Optional
-e "telegram_chat_id=YOUR_CHAT_ID"                     # Optional
```

### 2. deploy-app.yml
**Purpose**: Complete deployment with secrets setup and application deployment

**What it does**:
1. Sets up all secrets and environment variables
2. Installs Docker and Docker Compose
3. Clones and builds application
4. Starts application with docker-compose
5. Verifies application is running

**Usage**:
```bash
# Full deployment
ansible-playbook -i inventory.ini deploy-app.yml \
  -e "firebase_project_id=YOUR_PROJECT_ID" \
  -e "firebase_sa_path=/path/to/firebase-service-account.json" \
  -e "git_branch=main"
```

**Required Variables**:
- `firebase_project_id`: Firebase project ID
- `firebase_sa_path`: Local path to Firebase service account JSON

**Optional Variables**:
- `git_branch`: Git branch to deploy (default: main)
- `app_user`: Application user (default: golem)
- `server_port`: Server port (default: 8080)
- `git_repo`: Git repository URL (default: https://github.com/vietky/golem.git)

## Quick Start

### Step 1: Prepare Credentials

```bash
# Secure location for Firebase credentials
mkdir -p ~/secrets
cp /path/to/firebase-service-account.json ~/secrets/

# Set proper permissions
chmod 600 ~/secrets/firebase-service-account.json
```

### Step 2: Edit Inventory

```bash
nano inventory.ini
```

Example inventory:
```ini
[all:vars]
ansible_python_interpreter=/usr/bin/python3

[deployment_servers]
prod-server.example.com ansible_user=ubuntu \
  ansible_ssh_private_key_file=~/.ssh/deployment_key

[deployment_servers:vars]
app_name=golem-century
app_port=8080
git_repo=https://github.com/vietky/golem.git
```

### Step 3: Run Deployment

```bash
# Option 1: Secrets only (if you want to manage deployment separately)
ansible-playbook -i inventory.ini setup-secrets.yml \
  -e "firebase_project_id=my-golem-dev" \
  -e "firebase_sa_path=~/secrets/firebase-service-account.json"

# Option 2: Full deployment (recommended)
ansible-playbook -i inventory.ini deploy-app.yml \
  -e "firebase_project_id=my-golem-dev" \
  -e "firebase_sa_path=~/secrets/firebase-service-account.json" \
  -e "git_branch=main"
```

### Step 4: Verify Deployment

```bash
# SSH into server
ssh ubuntu@prod-server.example.com

# Source environment variables
source /etc/profile.d/golem-env.sh

# Verify Firebase configuration
echo "FIREBASE_PROJECT_ID: $FIREBASE_PROJECT_ID"
echo "FIREBASE_CREDENTIALS_PATH: $FIREBASE_CREDENTIALS_PATH"

# Check container status
docker ps | grep golem

# View application logs
docker logs -f golem-century-server
```

## Environment Variables

### File Locations

| File | Location | Permissions | Usage |
|------|----------|-------------|-------|
| Application .env | `$HOME/golem/.env` | 0600 | Loaded by backend on startup |
| Shell environment | `/etc/profile.d/golem-env.sh` | 0644 | Source in shell: `source /etc/profile.d/golem-env.sh` |
| Systemd environment | `/etc/default/golem` | 0600 | Used by systemd services |
| Service account | `/home/golem/golem/sa/firebase-service-account.json` | 0600 | Read by backend |

### Variables Set

```bash
# Server Configuration
SERVER_PORT=8080
LOG_LEVEL=info
LOG_FORMAT=json

# MongoDB
MONGO_URI=mongodb://localhost:27017
MONGO_DB=golem_game
MONGO_EVENTS_COLL=game_events
MONGO_SNAPSHOTS_COLL=game_snapshots

# Redis
REDIS_ADDR=localhost:6379
REDIS_DB=0

# Game Settings
DEFAULT_TURN_TIMEOUT_SECONDS=60
MAX_CHAT_MESSAGES=10

# Notifications (optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Firebase Authentication (IMPORTANT)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=/home/golem/golem/sa/firebase-service-account.json
```

## Docker Compose Integration

The updated `docker-compose.yml` and `docker-compose.dev.yml` include:

```yaml
environment:
  - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
  - FIREBASE_CREDENTIALS_PATH=/app/firebase-service-account.json
volumes:
  - ./sa/firebase-service-account.json:/app/firebase-service-account.json:ro
```

When running docker-compose, source the environment first:
```bash
source /etc/profile.d/golem-env.sh
docker-compose up -d
```

## Troubleshooting

### Issue: "firebase_sa_path not found"
```bash
# Verify file exists and is readable
ls -la ~/secrets/firebase-service-account.json

# Verify it's valid JSON
python3 -m json.tool ~/secrets/firebase-service-account.json | head
```

### Issue: "FIREBASE_PROJECT_ID not set"
```bash
# Check environment file exists
cat /etc/profile.d/golem-env.sh | grep FIREBASE

# Source and verify
source /etc/profile.d/golem-env.sh
echo $FIREBASE_PROJECT_ID
```

### Issue: Container can't read service account
```bash
# Check file permissions on remote server
ssh ubuntu@prod-server
ls -la /home/golem/golem/sa/firebase-service-account.json
# Should show: -rw------- 1 golem golem

# Check Docker volume mount
docker inspect golem-century-server | grep -A 5 Mounts
```

### Issue: Backend doesn't recognize .env
```bash
# Verify .env file contents
docker exec golem-century-server cat /app/.env | grep FIREBASE

# Check backend logs
docker logs golem-century-server | grep -i firebase

# If not loading, check godotenv in code:
docker exec golem-century-server grep -r "godotenv" /app/cmd
```

### Issue: Ansible permission denied
```bash
# Fix SSH key permissions
chmod 600 ~/.ssh/deployment_key

# Test SSH connection
ssh -i ~/.ssh/deployment_key ubuntu@prod-server.example.com "echo OK"

# List available keys
ssh-add -l
```

## Advanced Usage

### Dry Run (Check Mode)
```bash
# Preview changes without applying
ansible-playbook -i inventory.ini deploy-app.yml \
  -e "firebase_project_id=my-project-id" \
  -e "firebase_sa_path=~/secrets/firebase-service-account.json" \
  --check
```

### Verbose Output
```bash
# Debug with verbose output
ansible-playbook -i inventory.ini deploy-app.yml \
  -e "firebase_project_id=my-project-id" \
  -e "firebase_sa_path=~/secrets/firebase-service-account.json" \
  -vvv
```

### Deploy to Multiple Servers
```bash
# Edit inventory with multiple servers
# Then deploy to all or specific group
ansible-playbook -i inventory.ini deploy-app.yml \
  -e "firebase_project_id=my-project-id" \
  -e "firebase_sa_path=~/secrets/firebase-service-account.json" \
  --limit prod_servers
```

### Using Variables File
```bash
# Create vars file
cat > prod-deploy.yml << EOF
firebase_project_id: my-golem-prod
server_port: 8080
log_level: info
git_branch: main
mongo_uri: mongodb://mongo:27017
EOF

# Use in playbook
ansible-playbook -i inventory.ini deploy-app.yml \
  -e "@prod-deploy.yml" \
  -e "firebase_sa_path=~/secrets/firebase-service-account.json"
```

### Encrypt Sensitive Variables
```bash
# Create encrypted vars file
ansible-vault create prod-secrets.yml

# Add contents:
# firebase_sa_path: ~/secrets/firebase-service-account.json
# telegram_bot_token: YOUR_TOKEN

# Run playbook with encrypted file
ansible-playbook -i inventory.ini deploy-app.yml \
  -e "@prod-secrets.yml" \
  --ask-vault-pass
```

## Security Best Practices

1. **Protect Service Account File**
   ```bash
   # Store in secure location
   mkdir -p ~/.ssh/secured
   cp firebase-service-account.json ~/.ssh/secured/
   chmod 600 ~/.ssh/secured/firebase-service-account.json
   ```

2. **Use SSH Keys**
   ```bash
   # Generate deployment key
   ssh-keygen -t ed25519 -f ~/.ssh/deployment_key -C "golem-deployment"
   chmod 600 ~/.ssh/deployment_key
   
   # Add to server authorized_keys
   ssh-copy-id -i ~/.ssh/deployment_key ubuntu@prod-server
   ```

3. **Use Ansible Vault**
   ```bash
   # Encrypt entire variables file
   ansible-vault encrypt prod-secrets.yml
   
   # Use with --ask-vault-pass flag
   ansible-playbook ... --ask-vault-pass
   ```

4. **Firewall Configuration**
   ```bash
   # Restrict SSH access
   sudo ufw allow from YOUR_IP to any port 22

   # Allow application port
   sudo ufw allow 8080/tcp
   ```

## Service File Example

For systemd integration, create `/etc/systemd/system/golem.service`:

```ini
[Unit]
Description=Golem Century Game Server
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=golem
WorkingDirectory=/home/golem/golem
EnvironmentFile=/etc/default/golem
ExecStart=/usr/bin/docker-compose up
ExecStop=/usr/bin/docker-compose down
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:
```bash
# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable golem.service
sudo systemctl start golem.service

# Monitor
sudo systemctl status golem.service
sudo journalctl -u golem -f
```

## Support & Documentation

For more information:
- See [docs/FIREBASE_AUTH.md](../docs/FIREBASE_AUTH.md) - Firebase architecture
- See [docs/FIREBASE_SETUP.md](../docs/FIREBASE_SETUP.md) - Setup guide
- See [docker-compose.yml](../docker-compose.yml) - Docker configuration
- See [cmd/server/main.go](../cmd/server/main.go) - .env loading code


## Prerequisites

1. **Ansible installed locally:**
   ```bash
   # macOS
   brew install ansible
   
   # Ubuntu/Debian
   sudo apt install ansible
   ```

2. **SSH access to server:**
   ```bash
   # Test connection
   ssh -i ~/.ssh/id_rsa user@server
   ```

3. **Server requirements:**
   - Git installed
   - Docker and Docker Compose installed
   - Jenkins running (for setup-jenkins-job.yml)
   - Sudo access

## Testing

Test connectivity before running playbooks:

```bash
# Ping test
ansible -i inventory.ini deployment_servers -m ping

# Check Python version
ansible -i inventory.ini deployment_servers -m shell -a "python3 --version"

# Check Docker
ansible -i inventory.ini deployment_servers -m shell -a "docker --version"
```

## Common Tasks

### Check deployment status
```bash
ansible -i inventory.ini deployment_servers -m shell \
  -a "docker ps | grep golem"
```

### View recent deployments
```bash
ansible -i inventory.ini deployment_servers -m shell \
  -a "ls -lht /var/log/golem-deploy/ | head -5"
```

### Restart application
```bash
ansible -i inventory.ini deployment_servers -m shell \
  -a "cd /opt/jenkins/repos/golem && docker-compose restart"
```

## Troubleshooting

### Permission denied (publickey)
- Check SSH key is correct in inventory.ini
- Verify key permissions: `chmod 600 ~/.ssh/id_rsa`
- Test SSH manually: `ssh -i ~/.ssh/id_rsa user@server`

### Sudo password required
Add to inventory.ini:
```ini
[deployment_servers:vars]
ansible_become_pass=your_sudo_password
```

Or use:
```bash
ansible-playbook -i inventory.ini deploy-app.yml --ask-become-pass
```

### Python not found
Update inventory.ini:
```ini
ansible_python_interpreter=/usr/bin/python3
```
