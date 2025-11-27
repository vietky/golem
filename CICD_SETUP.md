# CI/CD Pipeline Setup - Quick Start Guide

This document provides a quick start guide for setting up the complete CI/CD pipeline for Golem Century.

## 📋 What's Included

This setup provides a complete automated deployment pipeline:

1. **Deploy Script** (`scripts/deploy.sh`) - Universal deployment script
2. **Ansible Playbooks** - Automated server configuration and deployment
3. **GitHub Actions** - Automatic deployment on push to main
4. **Jenkins Integration** - Deployment orchestration
5. **Setup Scripts** - Easy configuration tools

## 🚀 Quick Start

### 1. Verify Prerequisites

Run the test script to check your setup:

```bash
./scripts/test-pipeline.sh
```

This will verify:
- All required files exist
- Tools are installed (git, docker, ansible)
- Configuration files are valid
- Scripts have correct permissions

### 2. Configure Environment

Copy and edit the environment file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
# Jenkins Configuration
JENKINS_URL=http://your-jenkins-server:8080
JENKINS_USER=admin
JENKINS_TOKEN=your_jenkins_api_token_here
JENKINS_JOB_NAME=golem-century-deploy

# Server Configuration
ANSIBLE_HOST=your_server_ip
ANSIBLE_USER=your_ssh_user
```

**Getting Jenkins API Token:**
1. Log in to Jenkins → Click your name → Configure
2. API Token → Add new Token → Generate
3. Copy token to `.env`

### 3. Configure Ansible Inventory

Edit `ansible/inventory.ini`:

```ini
[deployment_servers]
golem-server ansible_host=YOUR_SERVER_IP

[deployment_servers:vars]
ansible_user=YOUR_SSH_USER
ansible_ssh_private_key_file=~/.ssh/id_rsa
```

Test connectivity:

```bash
ansible -i ansible/inventory.ini deployment_servers -m ping
```

### 4. Setup Jenkins Job

Use Ansible to create the Jenkins job automatically:

```bash
ansible-playbook -i ansible/inventory.ini ansible/setup-jenkins-job.yml
```

This will:
- ✓ Install required dependencies on server
- ✓ Create Jenkins job configuration
- ✓ Setup job parameters (GIT_BRANCH, APP_DIR)
- ✓ Configure deployment script

### 5. Configure GitHub Secrets

Setup secrets for GitHub Actions:

```bash
./scripts/setup-github-secrets.sh
```

This reads from `.env` and sets up:
- `JENKINS_URL`
- `JENKINS_USER`
- `JENKINS_TOKEN`
- `JENKINS_JOB_NAME`

Verify secrets:

```bash
gh secret list
```

### 6. Test Manual Deployment

Deploy manually using Ansible:

```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml
```

Or deploy a specific branch:

```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml \
  --extra-vars "git_branch=develop"
```

### 7. Enable Automatic Deployment

Push to main branch to trigger automatic deployment:

```bash
git add .
git commit -m "Setup CI/CD pipeline"
git push origin main
```

Monitor at: https://github.com/vietky/golem/actions

## 📁 File Structure

```
.
├── .env.example                    # Environment variables template
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions workflow
├── ansible/
│   ├── README.md                   # Ansible documentation
│   ├── inventory.ini               # Server inventory
│   ├── deploy-app.yml              # Manual deployment playbook
│   └── setup-jenkins-job.yml       # Jenkins job setup playbook
├── scripts/
│   ├── deploy.sh                   # Main deployment script
│   ├── setup-github-secrets.sh     # GitHub secrets setup
│   └── test-pipeline.sh            # Pipeline test suite
└── docs/
    └── DEPLOYMENT.md               # Detailed deployment guide
```

## 🔄 Deployment Flow

```
┌─────────────────┐
│  Push to main   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Actions  │ Triggers
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Jenkins Job    │ Executes
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  deploy.sh      │ Runs on server
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Git Pull       │
│  Docker Build   │
│  Docker Start   │
└─────────────────┘
```

## 🛠️ Common Commands

### Manual Deployment

```bash
# Deploy using Ansible
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml

# Deploy specific branch
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml \
  --extra-vars "git_branch=develop"

# Trigger Jenkins directly
curl -X POST "$JENKINS_URL/job/golem-century-deploy/buildWithParameters?GIT_BRANCH=main" \
  --user $JENKINS_USER:$JENKINS_TOKEN
```

### Monitoring

```bash
# View deployment logs on server
ssh user@server 'tail -f /var/log/golem-deploy/deploy-*.log'

# Check Docker containers
ssh user@server 'docker ps'

# View application logs
ssh user@server 'cd /opt/jenkins/repos/golem && docker-compose logs -f'

# GitHub Actions status
gh run list

# Jenkins build status
curl -s $JENKINS_URL/job/golem-century-deploy/lastBuild/api/json | jq '.result'
```

### Testing

```bash
# Test full pipeline
./scripts/test-pipeline.sh

# Test Ansible connectivity
ansible -i ansible/inventory.ini deployment_servers -m ping

# Test Jenkins connectivity
curl -u $JENKINS_USER:$JENKINS_TOKEN $JENKINS_URL/api/json

# Verify application is running
curl http://server-ip:8081
```

## 🔧 Troubleshooting

### Issue: GitHub Actions fails to trigger Jenkins

**Solution:**
```bash
# 1. Verify Jenkins is accessible from internet
curl $JENKINS_URL/api/json

# 2. Check secrets are set
gh secret list

# 3. Verify Jenkins token is valid
curl -u $JENKINS_USER:$JENKINS_TOKEN $JENKINS_URL/api/json
```

### Issue: Ansible cannot connect to server

**Solution:**
```bash
# 1. Test SSH connection
ssh -i ~/.ssh/id_rsa user@server

# 2. Verify inventory.ini
cat ansible/inventory.ini

# 3. Test with verbose output
ansible -i ansible/inventory.ini deployment_servers -m ping -vvv
```

### Issue: Docker containers fail to start

**Solution:**
```bash
# 1. SSH to server
ssh user@server

# 2. Check Docker logs
cd /opt/jenkins/repos/golem
docker-compose logs

# 3. Check port conflicts
sudo netstat -tulpn | grep 8081

# 4. Restart Docker service
sudo systemctl restart docker
```

### Issue: Deploy script fails

**Solution:**
```bash
# 1. Check deploy script logs
tail -f /var/log/golem-deploy/deploy-*.log

# 2. Run deploy script manually with debug
bash -x /opt/jenkins/repos/golem/scripts/deploy.sh

# 3. Verify git repository
cd /opt/jenkins/repos/golem
git status
git remote -v
```

## 📚 Additional Documentation

- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Detailed deployment guide
- **[Ansible README](ansible/README.md)** - Ansible playbooks documentation
- **[CICD_README.md](docs/CICD_README.md)** - CI/CD pipeline details

## ✅ Pre-deployment Checklist

Before first deployment:

- [ ] `.env` file created and configured
- [ ] `ansible/inventory.ini` updated with server details
- [ ] SSH access to server verified
- [ ] Jenkins is running and accessible
- [ ] Jenkins API token generated
- [ ] GitHub secrets configured
- [ ] Jenkins job created (`setup-jenkins-job.yml`)
- [ ] Test pipeline passed (`test-pipeline.sh`)
- [ ] Manual deployment tested

## 🔐 Security Notes

1. **Never commit `.env`** - It contains sensitive credentials
2. **Rotate tokens regularly** - Change Jenkins tokens periodically
3. **Use SSH keys** - Not password authentication
4. **Limit Jenkins access** - Use firewall rules
5. **Use HTTPS** - For production Jenkins

## 📞 Support

For issues:
1. Run `./scripts/test-pipeline.sh` to diagnose
2. Check logs in `/var/log/golem-deploy/`
3. Review GitHub Actions workflow logs
4. Check Jenkins console output

## 🎯 Next Steps

After successful deployment:

1. **Monitor** - Set up monitoring and alerting
2. **Backup** - Configure automated backups
3. **Scale** - Add load balancing if needed
4. **Secure** - Enable HTTPS and security features
5. **Optimize** - Fine-tune Docker resources

---

**Happy Deploying! 🚀**
