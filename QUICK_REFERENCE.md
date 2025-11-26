# CI/CD Quick Reference Card

## 🚀 Quick Start

### 1. Manual Deployment
```bash
cd ansible
ansible-playbook -i inventory.yml deploy-playbook.yml
```

### 2. Setup Jenkins Job
```bash
export JENKINS_USER=admin
export JENKINS_TOKEN=your_token
cd ansible
ansible-playbook -i inventory.yml jenkins-setup-playbook.yml
```

### 3. Setup GitHub Secrets
```bash
cp .env.example .env
vim .env  # Edit with your credentials
./scripts/setup-github-secrets.sh
```

### 4. Test Everything
```bash
./scripts/test-cicd.sh
```

## 📋 Common Commands

### Deploy Manually
```bash
# Via Ansible
cd ansible && ansible-playbook -i inventory.yml deploy-playbook.yml

# Via SSH (on server)
ssh root@157.66.101.66
cd /opt/golem-century/scripts && ./deploy.sh
```

### Check Application Status
```bash
# From local machine
curl http://157.66.101.66:8081/

# On server
docker ps
docker-compose logs -f
```

### View Deployment Logs
```bash
# On server
ssh root@157.66.101.66
tail -f /opt/golem-century/logs/deploy-*.log
```

### Trigger Manual Deployment
```bash
# Push to main
git push origin main

# Or manually via GitHub Actions
# Go to: https://github.com/vietky/golem/actions
# Click: "Deploy to Server via Jenkins" > "Run workflow"
```

## 🔧 Troubleshooting

### Check Jenkins
```bash
curl http://157.66.101.66:8080
```

### Check Container Status
```bash
ssh root@157.66.101.66 'docker ps --filter name=golem-century'
```

### View Container Logs
```bash
ssh root@157.66.101.66 'cd /opt/golem-century && docker-compose logs --tail=50'
```

### Test GitHub Secrets
```bash
gh secret list
```

## 📂 Important Files

| File | Purpose |
|------|---------|
| `scripts/deploy.sh` | Main deployment script |
| `ansible/deploy-playbook.yml` | Manual deployment playbook |
| `ansible/jenkins-setup-playbook.yml` | Jenkins job setup |
| `.github/workflows/deploy.yml` | GitHub Actions workflow |
| `scripts/setup-github-secrets.sh` | Setup GitHub secrets |
| `docs/CICD_README.md` | Full documentation |

## 🌐 URLs

- **Application**: http://157.66.101.66:8081/
- **Jenkins**: http://157.66.101.66:8080/
- **Jenkins Job**: http://157.66.101.66:8080/job/golem-century-deploy/
- **GitHub Actions**: https://github.com/vietky/golem/actions
- **Repository**: https://github.com/vietky/golem

## 📊 Environment Variables

### For Ansible (Jenkins Setup)
```bash
export JENKINS_USER=admin
export JENKINS_TOKEN=your_api_token
```

### For Deploy Script
```bash
export APP_NAME=golem-century
export APP_DIR=/opt/golem-century
export APP_PORT=8081
export GIT_REPO=https://github.com/vietky/golem.git
export GIT_BRANCH=main
```

### For .env File (GitHub Secrets)
```bash
JENKINS_URL=http://157.66.101.66:8080
JENKINS_USER=admin
JENKINS_TOKEN=your_api_token
JENKINS_JOB_NAME=golem-century-deploy
```

## ✅ Pre-flight Checklist

- [ ] Server accessible: `ping 157.66.101.66`
- [ ] Jenkins running: `curl http://157.66.101.66:8080`
- [ ] Can SSH to server: `ssh root@157.66.101.66`
- [ ] GitHub CLI installed: `gh --version`
- [ ] Ansible installed: `ansible --version`
- [ ] Docker on server: `ssh root@157.66.101.66 'docker --version'`

## 🎯 Deployment Flow

1. **Developer** commits code to `main` branch
2. **GitHub Actions** detects push and triggers
3. **GitHub Actions** calls Jenkins API with credentials
4. **Jenkins** receives trigger and starts job
5. **Jenkins** runs deploy script on server
6. **Deploy Script** pulls latest code from GitHub
7. **Deploy Script** runs `docker-compose up -d --build`
8. **Docker** rebuilds image and restarts container
9. **Application** is live with latest changes

Total time: ~2-3 minutes from push to deployment
