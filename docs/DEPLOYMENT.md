# CI/CD Pipeline - Deployment Guide

This guide explains how to set up and use the automated deployment pipeline for Golem Century.

## Overview

The deployment pipeline consists of:
1. **Deploy Script** (`scripts/deploy.sh`) - Shared script used by both Jenkins and Ansible
2. **Ansible Playbooks** - For manual deployment and Jenkins job setup
3. **GitHub Actions Workflow** - Triggers Jenkins on push to main
4. **Jenkins Job** - Executes the deployment on the server

## Architecture

```
GitHub Push (main) 
    ↓
GitHub Actions Workflow
    ↓
Jenkins Job Trigger (via API)
    ↓
Jenkins executes deploy.sh
    ↓
Git pull + Docker Compose
    ↓
Application Updated
```

## Prerequisites

- Jenkins server running on port 8080
- Jenkins directories already set up:
  - `jenkins_home: /opt/jenkins`
  - `jenkins_repos_dir: /opt/jenkins/repos`
- Docker and Docker Compose installed on deployment server
- Ansible installed locally (for setup and manual deployment)
- GitHub CLI (`gh`) installed locally

## Setup Instructions

### 1. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:
```bash
# Required for GitHub Actions
JENKINS_URL=http://your-jenkins-server:8080
JENKINS_USER=admin
JENKINS_TOKEN=your_jenkins_api_token
JENKINS_JOB_NAME=golem-century-deploy

# Required for Ansible
ANSIBLE_HOST=your_server_ip
ANSIBLE_USER=your_ssh_user
```

**Getting Jenkins API Token:**
1. Log in to Jenkins
2. Click your username → Configure
3. Add New Token → Generate
4. Copy the token to `.env`

### 2. Update Ansible Inventory

Edit `ansible/inventory.ini` with your server details:

```ini
[deployment_servers]
golem-server ansible_host=YOUR_SERVER_IP

[deployment_servers:vars]
ansible_user=YOUR_SSH_USER
ansible_ssh_private_key_file=~/.ssh/id_rsa
```

### 3. Setup Jenkins Job (One-time)

Use Ansible to create the Jenkins job:

```bash
# Test connection first
ansible -i ansible/inventory.ini deployment_servers -m ping

# Setup Jenkins job
ansible-playbook -i ansible/inventory.ini ansible/setup-jenkins-job.yml
```

This will:
- Create the Jenkins job configuration
- Copy the deploy script to the server
- Configure job parameters (GIT_BRANCH, APP_DIR)

### 4. Configure GitHub Secrets

Run the setup script to add secrets to GitHub Actions:

```bash
# Make script executable
chmod +x scripts/setup-github-secrets.sh

# Run setup (reads from .env)
./scripts/setup-github-secrets.sh
```

This sets up:
- `JENKINS_URL`
- `JENKINS_USER`
- `JENKINS_TOKEN`
- `JENKINS_JOB_NAME`

### 5. Verify Setup

Check that everything is configured:

```bash
# Verify GitHub secrets
gh secret list

# Verify Jenkins job
curl -u $JENKINS_USER:$JENKINS_TOKEN \
  $JENKINS_URL/job/golem-century-deploy/api/json
```

## Usage

### Automatic Deployment (via GitHub)

Push to the main branch to trigger automatic deployment:

```bash
git push origin main
```

Monitor the workflow:
1. Go to: https://github.com/vietky/golem/actions
2. Watch the "Deploy to Production" workflow
3. It will trigger Jenkins and wait for completion

### Manual Deployment (via Ansible)

Deploy manually using Ansible:

```bash
# Deploy with default branch (main)
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml

# Deploy specific branch
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml \
  --extra-vars "git_branch=develop"
```

### Manual Deployment (via Jenkins)

Trigger Jenkins job manually:

```bash
# Using curl
curl -X POST "$JENKINS_URL/job/golem-century-deploy/buildWithParameters?GIT_BRANCH=main" \
  --user $JENKINS_USER:$JENKINS_TOKEN

# Using Jenkins UI
# Go to: http://your-jenkins:8080/job/golem-century-deploy/
# Click "Build with Parameters"
```

## Deployment Process

The `scripts/deploy.sh` script performs these steps:

1. **Check Prerequisites**
   - Verify git and docker-compose are installed

2. **Repository Management**
   - Clone repository if it doesn't exist
   - Or pull latest changes if it exists

3. **Docker Deployment**
   - Stop existing containers
   - Build and start new containers
   - Clean up old images

4. **Verification**
   - Show running containers
   - Display deployment logs

## File Structure

```
.
├── .env.example                    # Environment variables template
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions workflow
├── ansible/
│   ├── inventory.ini               # Ansible inventory
│   ├── deploy-app.yml              # Manual deployment playbook
│   └── setup-jenkins-job.yml       # Jenkins job setup playbook
├── scripts/
│   ├── deploy.sh                   # Main deployment script
│   └── setup-github-secrets.sh     # GitHub secrets setup
└── docs/
    └── DEPLOYMENT.md               # This file
```

## Troubleshooting

### GitHub Actions fails to trigger Jenkins

**Problem:** Workflow fails with authentication error

**Solution:**
1. Verify Jenkins URL is accessible from GitHub (use public IP or ngrok)
2. Check Jenkins token is valid
3. Verify secrets are set correctly: `gh secret list`

### Jenkins job fails

**Problem:** Build fails in Jenkins

**Solution:**
1. Check Jenkins logs: `$JENKINS_URL/job/golem-century-deploy/lastBuild/console`
2. Verify deploy script has correct permissions
3. Check Docker service is running: `sudo systemctl status docker`

### Ansible playbook fails

**Problem:** Cannot connect to server

**Solution:**
1. Test SSH access: `ssh -i ~/.ssh/id_rsa user@server`
2. Verify inventory.ini has correct IP and user
3. Check SSH key permissions: `chmod 600 ~/.ssh/id_rsa`

### Docker Compose fails

**Problem:** Containers fail to start

**Solution:**
1. Check docker-compose.yml syntax
2. Verify ports are not already in use: `sudo netstat -tulpn | grep 8081`
3. Check Docker logs: `docker-compose logs`

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `JENKINS_URL` | Jenkins server URL | `http://jenkins.example.com:8080` |
| `JENKINS_USER` | Jenkins username | `admin` |
| `JENKINS_TOKEN` | Jenkins API token | `11a1b2c3d4e5f6...` |
| `JENKINS_JOB_NAME` | Name of Jenkins job | `golem-century-deploy` |
| `APP_DIR` | Application directory on server | `/opt/jenkins/repos/golem` |
| `GIT_BRANCH` | Branch to deploy | `main` |
| `APP_PORT` | Application port | `8081` |

## Security Notes

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use SSH keys** - Don't use password authentication
3. **Rotate tokens** - Change Jenkins tokens periodically
4. **Limit access** - Use Jenkins CSRF protection
5. **HTTPS** - Use HTTPS for Jenkins in production

## Advanced Configuration

### Deploy to Multiple Environments

Create separate inventory files:

```bash
# Production
ansible-playbook -i ansible/inventory-prod.ini ansible/deploy-app.yml

# Staging
ansible-playbook -i ansible/inventory-staging.ini ansible/deploy-app.yml \
  --extra-vars "git_branch=staging"
```

### Notifications

Add Slack/Discord notifications to GitHub Actions workflow:

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Rollback

To rollback to a previous version:

```bash
# SSH to server
ssh user@server

# Go to app directory
cd /opt/jenkins/repos/golem

# Find previous commit
git log --oneline

# Checkout previous version
git checkout <commit-hash>

# Restart containers
docker-compose up -d --build
```

## Monitoring

### View Deployment Logs

```bash
# On server
tail -f /var/log/golem-deploy/deploy-*.log

# Docker logs
docker-compose logs -f

# Jenkins console output
curl -u $JENKINS_USER:$JENKINS_TOKEN \
  $JENKINS_URL/job/golem-century-deploy/lastBuild/consoleText
```

### Health Checks

```bash
# Check application is running
curl http://localhost:8081

# Check containers
docker ps

# Check Docker resources
docker stats
```

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review deployment logs
3. Check GitHub Actions workflow logs
4. Review Jenkins console output
