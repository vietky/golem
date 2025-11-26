# CI/CD Implementation

## Overview

This document describes the complete CI/CD pipeline for the Golem Century game server. The implementation uses a multi-tier approach:

1. **Deploy Script** (`scripts/deploy.sh`) - Core deployment logic
2. **Ansible Playbook** (`ansible/deploy-playbook.yml`) - Server provisioning and deployment orchestration
3. **Jenkins Pipeline** (`Jenkinsfile`) - CI/CD automation on Jenkins server
4. **GitHub Actions** (`.github/workflows/deploy.yml`) - Triggers Jenkins on push to main branch

## Architecture

```
GitHub Push (main) → GitHub Actions → Jenkins → Ansible → Remote Server → Deploy Script
```

## Components

### 1. Deploy Script (`scripts/deploy.sh`)

**Purpose**: Idempotent deployment script that can be run manually or by automation tools.

**Features**:
- Fetches/clones code from GitHub repository
- Updates to latest commit on specified branch
- Builds and restarts application using docker-compose
- Logs all operations with timestamps to `logs/deploy-*.log`
- Preserves logs across deployments

**Environment Variables**:
- `APP_NAME` - Application name (default: `golem-century`)
- `APP_DIR` - Application directory (default: `/opt/golem-century`)
- `APP_PORT` - Application port (default: `8081`)
- `GIT_REPO` - Git repository URL (default: `https://github.com/vietky/golem.git`)
- `GIT_BRANCH` - Git branch to deploy (default: `main`)
- `LOG_DIR` - Log directory (default: `${APP_DIR}/logs`)

**Usage**:
```bash
# Run with defaults
./scripts/deploy.sh

# Run with custom parameters
APP_BRANCH=staging ./scripts/deploy.sh
```

### 2. Ansible Playbook (`ansible/deploy-playbook.yml`)

**Purpose**: Simplified playbook that provisions the server and runs the deploy script.

**Features**:
- Installs system dependencies (git, curl, ca-certificates)
- Sets up Docker and docker-compose
- Creates application user and directories
- Copies deploy script to server
- Executes deployment
- Verifies deployment success

**Usage**:
```bash
# Deploy to production
ansible-playbook -i ansible/inventory.yml ansible/deploy-playbook.yml

# Deploy specific branch
ansible-playbook -i ansible/inventory.yml ansible/deploy-playbook.yml -e "git_branch=staging"
```

### 3. Jenkinsfile

**Purpose**: Jenkins pipeline definition for automated deployments.

**Features**:
- Checks out code from GitHub
- Validates Ansible playbook syntax
- Runs Ansible deployment
- Verifies application health
- Provides deployment status notifications

**Parameters**:
- `GIT_BRANCH` - Branch to deploy (default: `main`)
- `ENVIRONMENT` - Target environment (choices: `production`, `staging`)

**Setup**:
1. Create a new Pipeline job in Jenkins
2. Configure SCM to point to this repository
3. Set Pipeline script path to `Jenkinsfile`
4. Enable "Build with Parameters"

### 4. GitHub Actions Workflow (`.github/workflows/deploy.yml`)

**Purpose**: Triggers Jenkins deployment on push to main branch.

**Features**:
- Automatically triggers on push to main branch
- Manual workflow dispatch option
- Triggers Jenkins job via API
- Displays deployment summary

**Required Secrets**:
- `JENKINS_URL` - Jenkins server URL (e.g., `https://jenkins.example.com`)
- `JENKINS_USER` - Jenkins username
- `JENKINS_TOKEN` - Jenkins API token
- `JENKINS_JOB_NAME` - Jenkins job name (default: `golem-century-deploy`)

**Setup**:
1. Go to GitHub repository Settings → Secrets and variables → Actions
2. Add the required secrets
3. Push to main branch to trigger deployment

## Deployment Flow

### Automated Deployment (Production)

1. Developer pushes code to `main` branch
2. GitHub Actions workflow triggers automatically
3. GitHub Actions calls Jenkins API to start deployment job
4. Jenkins:
   - Checks out latest code
   - Validates Ansible playbook
   - Runs Ansible against production servers
5. Ansible:
   - Copies deploy script to server
   - Executes deploy script
6. Deploy Script:
   - Pulls latest code from GitHub
   - Builds Docker images
   - Restarts containers
   - Verifies deployment

### Manual Deployment

**Option 1: Using Ansible directly**
```bash
ansible-playbook -i ansible/inventory.yml ansible/deploy-playbook.yml
```

**Option 2: Using deploy script on server**
```bash
# SSH to server
ssh root@<server-ip>

# Run deploy script
/opt/golem-century/scripts/deploy.sh
```

**Option 3: Using GitHub Actions manually**
1. Go to GitHub repository → Actions
2. Select "Trigger Jenkins Deployment" workflow
3. Click "Run workflow"
4. Select environment and run

## Monitoring and Logs

### Application Logs
Deployment logs are stored on the server at:
```
/opt/golem-century/logs/deploy-YYYYMMDD-HHMMSS.log
```

### Container Logs
View container logs:
```bash
cd /opt/golem-century
docker-compose logs -f
```

### Jenkins Logs
View in Jenkins UI under the specific build number

## Troubleshooting

### Deployment Failed
1. Check deploy script logs: `/opt/golem-century/logs/deploy-*.log`
2. Check container status: `docker-compose ps`
3. Check container logs: `docker-compose logs`

### Jenkins Job Not Triggering
1. Verify GitHub Actions secrets are set correctly
2. Check Jenkins job configuration
3. Verify Jenkins API token has required permissions

### Ansible Connection Issues
1. Test SSH connectivity: `ansible all -i ansible/inventory.yml -m ping`
2. Verify SSH keys are configured
3. Check inventory file has correct server IP

## Requirements Met

✅ **Simple and maintainable** - Each component has a single, clear responsibility
✅ **Idempotent deploy script** - Can be run multiple times safely
✅ **Timestamped logging** - All operations logged with timestamps
✅ **Git integration** - Clones or updates from GitHub repository
✅ **Docker-compose integration** - Builds and restarts application
✅ **Shared by Jenkins and Ansible** - Deploy script used by both tools

## Future Enhancements

- Add rollback capability
- Implement blue-green deployment
- Add automated testing before deployment
- Implement deployment notifications (Slack, Email)
- Add deployment metrics and monitoring
- Support multiple environments (dev, staging, production)