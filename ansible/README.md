# Ansible Playbooks for Golem Century

This directory contains Ansible playbooks for deploying and managing the Golem Century application.

## Playbooks

### 1. deploy-app.yml
Deploys the application manually using the deploy script.

**Usage:**
```bash
ansible-playbook -i inventory.ini deploy-app.yml
```

**Variables:**
- `git_branch` - Branch to deploy (default: main)
- `app_dir` - Application directory (default: /opt/jenkins/repos/golem)

**Example:**
```bash
# Deploy specific branch
ansible-playbook -i inventory.ini deploy-app.yml --extra-vars "git_branch=develop"
```

### 2. setup-jenkins-job.yml
Creates and configures the Jenkins job for automated deployments.

**Usage:**
```bash
ansible-playbook -i inventory.ini setup-jenkins-job.yml
```

**What it does:**
- Installs required dependencies
- Creates Jenkins job configuration
- Sets up job with parameters
- Configures webhook trigger

## Inventory

Update `inventory.ini` with your server details:

```ini
[deployment_servers]
golem-server ansible_host=YOUR_SERVER_IP

[deployment_servers:vars]
ansible_user=YOUR_SSH_USER
ansible_ssh_private_key_file=~/.ssh/id_rsa
```

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
