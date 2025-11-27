# CI/CD Pipeline Documentation

This document describes the complete CI/CD pipeline for the Golem Century game server.

## Overview

The CI/CD pipeline consists of three main components:

1. **Deploy Script** (`scripts/deploy.sh`) - Shared script that handles git pull and docker-compose deployment
2. **Ansible Playbooks** - For manual deployment and Jenkins setup
3. **GitHub Actions** - Automated deployment triggered on push to main branch

## Architecture

```
┌─────────────────┐
│  GitHub Push    │
│  (main branch)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  GitHub Actions     │
│  Workflow           │
└────────┬────────────┘
         │
         │ Triggers via API
         ▼
┌─────────────────────┐
│  Jenkins Server     │
│  (Remote Server)    │
└────────┬────────────┘
         │
         │ Runs
         ▼
┌─────────────────────┐
│  Deploy Script      │
│  (scripts/deploy.sh)│
└────────┬────────────┘
         │
         ├─> Git pull latest code
         │
         └─> Docker-compose up --build
```

## Components

### 1. Deploy Script (`scripts/deploy.sh`)

A reusable bash script that:
- Clones the repository if it doesn't exist, or pulls latest changes
- Runs `docker-compose up -d --build` to update the application
- Logs all operations with timestamps
- Verifies deployment success

**Environment Variables:**
- `APP_NAME` - Application name (default: golem-century)
- `APP_DIR` - Application directory (default: /opt/golem-century)
- `APP_PORT` - Application port (default: 8081)
- `GIT_REPO` - Git repository URL
- `GIT_BRANCH` - Git branch to deploy (default: main)

**Usage:**
```bash
# Run with default settings
./scripts/deploy.sh

# Run with custom settings
APP_DIR=/custom/path GIT_BRANCH=develop ./scripts/deploy.sh
```

### 2. Ansible Playbooks

#### Manual Deployment (`ansible/deploy-playbook.yml`)

Deploys the application to remote servers:
- Installs Docker and docker-compose if not present
- Creates application user and directory
- Copies deploy script to server
- Runs the deploy script
- Verifies deployment

**Usage:**
```bash
cd ansible
ansible-playbook -i inventory.yml deploy-playbook.yml
```

#### Jenkins Setup (`ansible/jenkins-setup-playbook.yml`)

Sets up a Jenkins job for automated deployment:
- Verifies Jenkins is accessible
- Creates Jenkins job from template
- Configures job to run deploy script

**Prerequisites:**
- Set environment variables:
  ```bash
  export JENKINS_USER=admin
  export JENKINS_TOKEN=your_api_token
  ```

**Usage:**
```bash
cd ansible
ansible-playbook -i inventory.yml jenkins-setup-playbook.yml
```

### 3. GitHub Actions Workflow

**File:** `.github/workflows/deploy.yml`

Automatically triggers Jenkins deployment on:
- Push to main branch
- Manual workflow dispatch

**Required Secrets:**
- `JENKINS_URL` - Jenkins server URL (e.g., http://157.66.101.66:8080)
- `JENKINS_USER` - Jenkins username
- `JENKINS_TOKEN` - Jenkins API token
- `JENKINS_JOB_NAME` - Jenkins job name (default: golem-century-deploy)

## Setup Instructions

### Step 1: Initial Server Setup

Deploy the application manually using Ansible:

```bash
cd ansible
ansible-playbook -i inventory.yml deploy-playbook.yml
```

This will:
- Install all dependencies
- Clone the repository
- Start the application with Docker

### Step 2: Setup Jenkins Job

1. Make sure Jenkins is running on the remote server on port 8080

2. Get your Jenkins API token:
   - Log into Jenkins
   - Click your username → Configure
   - Generate a new API token

3. Set environment variables:
   ```bash
   export JENKINS_USER=your_username
   export JENKINS_TOKEN=your_api_token
   ```

4. Run the Jenkins setup playbook:
   ```bash
   cd ansible
   ansible-playbook -i inventory.yml jenkins-setup-playbook.yml
   ```

### Step 3: Configure GitHub Actions Secrets

1. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your Jenkins credentials:
   ```bash
   JENKINS_URL=http://157.66.101.66:8080
   JENKINS_USER=your_username
   JENKINS_TOKEN=your_api_token
   JENKINS_JOB_NAME=golem-century-deploy
   ```

3. Run the setup script:
   ```bash
   ./scripts/setup-github-secrets.sh
   ```

   This will set all required secrets in your GitHub repository.

### Step 4: Test the Pipeline

1. Make a change to your code
2. Commit and push to main branch:
   ```bash
   git add .
   git commit -m "Test CI/CD pipeline"
   git push origin main
   ```

3. Watch the deployment:
   - GitHub Actions: https://github.com/vietky/golem/actions
   - Jenkins: http://157.66.101.66:8080/job/golem-century-deploy

## Manual Deployment Options

### Option 1: Using Ansible
```bash
cd ansible
ansible-playbook -i inventory.yml deploy-playbook.yml
```

### Option 2: Using Deploy Script (on server)
```bash
ssh user@server
cd /opt/golem-century/scripts
./deploy.sh
```

### Option 3: Trigger Jenkins Manually
- Go to Jenkins job URL
- Click "Build with Parameters"
- Select branch and click "Build"

### Option 4: GitHub Actions Manual Trigger
- Go to GitHub repository
- Click "Actions" tab
- Select "Deploy to Server via Jenkins" workflow
- Click "Run workflow"

## Troubleshooting

### Jenkins Job Not Triggering

1. Check GitHub Actions logs for errors
2. Verify Jenkins URL is accessible from internet
3. Check Jenkins API credentials
4. Ensure Jenkins job exists with correct name

### Deployment Fails

1. Check Jenkins console output
2. SSH to server and check logs:
   ```bash
   tail -f /opt/golem-century/logs/deploy-*.log
   ```
3. Check Docker containers:
   ```bash
   docker ps -a
   docker-compose logs
   ```

### GitHub Secrets Not Working

1. Verify secrets are set:
   ```bash
   gh secret list
   ```
2. Re-run setup script:
   ```bash
   ./scripts/setup-github-secrets.sh
   ```

## Security Notes

- Never commit `.env` file with real credentials
- Use Jenkins API tokens, not passwords
- Rotate credentials regularly
- Use GitHub repository secrets for sensitive data
- Ensure Jenkins is behind firewall or uses authentication

## Maintenance

### Updating Deploy Script

The deploy script is shared by both Ansible and Jenkins. To update:

1. Edit `scripts/deploy.sh`
2. Re-run Ansible playbook to copy updated script to server:
   ```bash
   cd ansible
   ansible-playbook -i inventory.yml deploy-playbook.yml --tags copy-script
   ```

### Updating Jenkins Job

1. Edit `ansible/templates/jenkins-job-config.xml.j2`
2. Re-run Jenkins setup playbook:
   ```bash
   cd ansible
   ansible-playbook -i inventory.yml jenkins-setup-playbook.yml
   ```

## File Structure

```
golem/
├── .github/
│   └── workflows/
│       └── deploy.yml                    # GitHub Actions workflow
├── ansible/
│   ├── deploy-playbook.yml               # Manual deployment playbook
│   ├── jenkins-setup-playbook.yml        # Jenkins job setup playbook
│   ├── inventory.yml                     # Server inventory
│   └── templates/
│       └── jenkins-job-config.xml.j2     # Jenkins job template
├── scripts/
│   ├── deploy.sh                         # Shared deploy script
│   └── setup-github-secrets.sh           # GitHub secrets setup script
├── .env.example                          # Example environment variables
└── docs/
    └── CICD_README.md                    # This file
```

## Next Steps

1. ✅ Deploy application manually with Ansible
2. ✅ Setup Jenkins job
3. ✅ Configure GitHub Actions secrets
4. ✅ Test by pushing to main branch
5. Monitor and iterate based on deployment needs
