# CI/CD Quick Reference

## 🚀 Quick Deploy

Deploy to production server:
```bash
make deploy
```

Deploy specific branch:
```bash
make deploy-branch BRANCH=feature-xyz
```

## 📁 Files Created

### Core Deployment
- `scripts/deploy.sh` - Main deployment script (idempotent, logs with timestamps)
- `ansible/deploy-playbook.yml` - New simplified Ansible playbook
- `Jenkinsfile` - Jenkins pipeline definition
- `.github/workflows/deploy.yml` - GitHub Actions workflow

### Documentation
- `cicd.md` - Complete CI/CD implementation guide
- `ansible/DEPLOY.md` - Ansible deployment quick reference

## ✅ Deployment Verification

The deployment was successfully tested and verified:

1. ✅ Deploy script created and tested
2. ✅ Ansible playbook runs successfully
3. ✅ Application deployed and running
4. ✅ Health check passing
5. ✅ Application accessible at http://157.66.101.66:8081/

## 🔧 Available Make Commands

```bash
# Deployment
make deploy                    # Deploy to server (recommended)
make deploy-branch BRANCH=xyz  # Deploy specific branch
make deploy-check              # Dry run deployment
make deploy-legacy             # Use old archive-based method

# Local Development
make build                     # Build Docker image
make up                        # Start containers
make down                      # Stop containers
make logs                      # View logs
make restart                   # Restart containers

# Remote Management
make stop-remote              # Stop containers on server
make start-remote             # Start containers on server
make restart-remote           # Restart containers on server
make logs-remote              # View server logs
make status-remote            # Check server status
```

## 📋 Deployment Flow

### Automated (Production)
```
Push to main → GitHub Actions → Jenkins → Ansible → Deploy Script → Server
```

### Manual
```bash
# Option 1: Via Make
make deploy

# Option 2: Via Ansible directly
ansible-playbook -i ansible/inventory.yml ansible/deploy-playbook.yml

# Option 3: On server
ssh root@server-ip
/opt/golem-century/scripts/deploy.sh
```

## 🔐 Jenkins Setup Required

To enable automated deployment via GitHub Actions → Jenkins:

1. **Create Jenkins Job**
   - New Pipeline job named `golem-century-deploy`
   - Configure SCM to this repository
   - Set Pipeline script to use `Jenkinsfile`

2. **Configure GitHub Secrets**
   Go to Settings → Secrets and variables → Actions, add:
   - `JENKINS_URL` - Your Jenkins URL
   - `JENKINS_USER` - Jenkins username
   - `JENKINS_TOKEN` - Jenkins API token
   - `JENKINS_JOB_NAME` - `golem-century-deploy`

3. **Test**
   - Push to main branch
   - GitHub Actions triggers Jenkins
   - Jenkins runs Ansible
   - Application deploys automatically

## 📝 Logs

Deployment logs are stored on the server:
```
/opt/golem-century/logs/deploy-YYYYMMDD-HHMMSS.log
```

View latest deployment log:
```bash
ssh root@server-ip
tail -f /opt/golem-century/logs/deploy-*.log
```

## 🐛 Troubleshooting

### Deployment fails
```bash
# Check logs on server
ssh root@server-ip
cat /opt/golem-century/logs/deploy-*.log

# Check container status
docker ps
docker-compose logs
```

### Connection issues
```bash
# Test Ansible connectivity
ansible all -i ansible/inventory.yml -m ping

# Run with verbose output
ansible-playbook -i ansible/inventory.yml ansible/deploy-playbook.yml -vvv
```

## 🎯 Next Steps

The CI/CD pipeline is ready to use! Here's what you can do:

1. **For immediate use**: Use `make deploy` to deploy manually
2. **For automation**: Set up Jenkins and GitHub secrets as described above
3. **For testing**: Use `make deploy-branch BRANCH=test` to deploy test branches

See `cicd.md` for complete documentation.
