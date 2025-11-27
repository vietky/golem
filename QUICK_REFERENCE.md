# CI/CD Pipeline - Quick Reference

## 🚀 Setup (One-time)

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your values

# 2. Update Ansible inventory
# Edit ansible/inventory.ini with server IP

# 3. Test connectivity
ansible -i ansible/inventory.ini deployment_servers -m ping

# 4. Setup Jenkins job
ansible-playbook -i ansible/inventory.ini ansible/setup-jenkins-job.yml

# 5. Configure GitHub secrets
./scripts/setup-github-secrets.sh

# 6. Verify setup
./scripts/test-pipeline.sh
```

## 📦 Deploy Commands

```bash
# Auto Deploy (push to main)
git push origin main

# Manual Deploy (Ansible)
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml

# Manual Deploy (Jenkins)
curl -X POST "$JENKINS_URL/job/golem-century-deploy/build" \
  --user $JENKINS_USER:$JENKINS_TOKEN

# Deploy specific branch
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml \
  --extra-vars "git_branch=develop"
```

## 🔍 Monitoring

```bash
# GitHub Actions status
gh run list
gh run watch

# Jenkins status
curl -u $USER:$TOKEN $JENKINS_URL/job/golem-century-deploy/lastBuild/api/json | jq '.result'

# Server logs
ssh user@server 'tail -f /var/log/golem-deploy/deploy-*.log'

# Docker logs
ssh user@server 'docker-compose -f /opt/jenkins/repos/golem/docker-compose.yml logs -f'

# Application health
curl http://server-ip:8081
```

## 🛠️ Troubleshooting

```bash
# Test pipeline
./scripts/test-pipeline.sh

# Test Ansible
ansible -i ansible/inventory.ini deployment_servers -m ping -vvv

# Test Jenkins
curl -u $USER:$TOKEN $JENKINS_URL/api/json

# Check Docker
ssh user@server 'docker ps'
ssh user@server 'docker-compose -f /opt/jenkins/repos/golem/docker-compose.yml ps'

# View GitHub secrets
gh secret list

# Restart deployment
ssh user@server 'cd /opt/jenkins/repos/golem && docker-compose restart'
```

## 📁 Key Files

```
.env.example              → Configuration template
ansible/inventory.ini     → Server details
ansible/deploy-app.yml    → Manual deployment
ansible/setup-jenkins-job.yml → Jenkins setup
scripts/deploy.sh         → Main deployment script
.github/workflows/deploy.yml → Auto-deployment workflow
```

## 🌐 Important URLs

```bash
# GitHub Actions
https://github.com/vietky/golem/actions

# GitHub Secrets
https://github.com/vietky/golem/settings/secrets/actions

# Jenkins (replace with your URL)
http://your-jenkins:8080/job/golem-century-deploy/
```

## ⚙️ Environment Variables (.env)

```bash
JENKINS_URL=http://jenkins:8080
JENKINS_USER=admin
JENKINS_TOKEN=your_token
JENKINS_JOB_NAME=golem-century-deploy
APP_DIR=/opt/jenkins/repos/golem
GIT_BRANCH=main
ANSIBLE_HOST=server_ip
ANSIBLE_USER=user
```

## 🎯 Common Tasks

```bash
# Redeploy current version
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml

# Deploy different branch
ansible-playbook -i ansible/inventory.ini ansible/deploy-app.yml -e "git_branch=staging"

# Check deployment status
ssh user@server 'docker ps | grep golem'

# View recent deployments
ssh user@server 'ls -lht /var/log/golem-deploy/'

# Manual rollback
ssh user@server 'cd /opt/jenkins/repos/golem && git log --oneline'
ssh user@server 'cd /opt/jenkins/repos/golem && git checkout <commit-hash> && docker-compose up -d --build'
```

## ✅ Pre-flight Checklist

Before deploying:
- [ ] .env configured
- [ ] ansible/inventory.ini updated
- [ ] SSH access tested
- [ ] Jenkins running
- [ ] GitHub secrets set
- [ ] Test pipeline passed
- [ ] Manual deploy tested

## 📚 Documentation

- `CICD_SETUP.md` - Quick start
- `docs/DEPLOYMENT.md` - Detailed guide
- `ansible/README.md` - Ansible help
- `IMPLEMENTATION_SUMMARY.md` - Complete overview
