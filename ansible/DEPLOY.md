# Ansible Deployment

## Quick Start

Deploy the application to production servers:

```bash
ansible-playbook -i inventory.yml deploy-playbook.yml
```

## Playbooks

### `deploy-playbook.yml` (Recommended)

Simplified deployment playbook that uses the deploy script.

**Features**:
- Sets up server dependencies (Docker, docker-compose, git)
- Copies and executes deploy script
- Verifies deployment health

**Usage**:
```bash
# Deploy latest main branch
ansible-playbook -i inventory.yml deploy-playbook.yml

# Deploy specific branch
ansible-playbook -i inventory.yml deploy-playbook.yml -e "git_branch=feature-xyz"

# Deploy with custom variables
ansible-playbook -i inventory.yml deploy-playbook.yml \
  -e "git_branch=staging" \
  -e "app_port=8082"
```

### `playbook.yml` (Legacy)

Original playbook using archive-based deployment. Still available but `deploy-playbook.yml` is preferred.

## Configuration

### Inventory

Edit `inventory.yml` to configure target servers:

```yaml
all:
  children:
    servers:
      hosts:
        golem-server:
          ansible_host: YOUR_SERVER_IP
          ansible_user: root
          ansible_port: 22
```

### Variables

Key variables you can override:

- `app_name` - Application name (default: `golem-century`)
- `app_user` - System user running the application (default: `golem`)
- `app_dir` - Application directory (default: `/opt/golem-century`)
- `app_port` - Application port (default: `8081`)
- `git_repo` - Git repository URL (default: `https://github.com/vietky/golem.git`)
- `git_branch` - Git branch to deploy (default: `main`)

## Testing

### Test SSH Connectivity

```bash
ansible all -i inventory.yml -m ping
```

### Check Playbook Syntax

```bash
ansible-playbook --syntax-check deploy-playbook.yml
```

### Dry Run

```bash
ansible-playbook -i inventory.yml deploy-playbook.yml --check
```

## Deployment Process

The `deploy-playbook.yml` performs these steps:

1. **System Setup**
   - Updates package repositories
   - Installs required packages (git, curl, ca-certificates)

2. **Docker Setup**
   - Installs Docker and docker-compose if not present
   - Ensures Docker service is running

3. **Application User Setup**
   - Creates application user
   - Creates application directory
   - Sets proper permissions

4. **Deploy Script Execution**
   - Copies deploy script to server
   - Runs deploy script which:
     - Clones/updates git repository
     - Builds Docker images
     - Restarts containers
     - Verifies health

5. **Verification**
   - Checks container status
   - Tests application endpoint
   - Displays deployment summary

## Troubleshooting

### Connection Issues

```bash
# Test connection
ansible all -i inventory.yml -m ping

# Run with verbose output
ansible-playbook -i inventory.yml deploy-playbook.yml -vvv
```

### Deployment Failures

Check logs on the server:
```bash
ssh root@<server-ip>
cat /opt/golem-century/logs/deploy-*.log
```

### Docker Issues

```bash
# Check Docker status on remote server
ansible all -i inventory.yml -m shell -a "docker ps"

# Check docker-compose version
ansible all -i inventory.yml -m shell -a "docker-compose --version"
```

## Archive-based Deployment (Legacy)

The old `playbook.yml` uses a different approach:

1. Create deployment archive locally
2. Transfer archive to server
3. Extract and deploy

To use it:
```bash
# Create archive
make create-archive
# or
./create-deploy-archive.sh

# Deploy
ansible-playbook -i inventory.yml playbook.yml
```

This method is still available but `deploy-playbook.yml` is preferred as it's simpler and uses git directly on the server.
