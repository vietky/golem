# Ansible Deployment Guide

This directory contains Ansible playbooks and configuration for deploying the Golem Century game server.

## Prerequisites

1. **Ansible installed** on your local machine:
   ```bash
   # macOS
   brew install ansible
   
   # Ubuntu/Debian
   sudo apt-get install ansible
   
   # Or via pip
   pip3 install ansible
   ```

2. **SSH access** to the target server with sudo privileges

3. **Docker and Docker Compose** will be installed automatically on the target server

## Configuration

### 1. Create .env File

**Important:** Sensitive information is stored in `.env` file (which is gitignored) for security.

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your server details:
   ```bash
   # Server connection details
   ANSIBLE_HOST=your-server-ip-or-hostname
   ANSIBLE_USER=root
   ANSIBLE_PORT=22
   
   # SSH key path (optional, leave empty if using password)
   ANSIBLE_SSH_PRIVATE_KEY_FILE=
   
   # Server hostname (for inventory)
   ANSIBLE_SERVER_NAME=golem-server
   ```

3. Generate the inventory file:
   ```bash
   make generate-inventory
   # or
   ./ansible/generate-inventory.sh
   ```

**Note:** The `inventory.yml` file is auto-generated from `.env` and should not be edited manually. It's also gitignored to keep sensitive data secure.

### 2. SSH Key Setup (Recommended)

For passwordless SSH access, set up SSH keys:

```bash
ssh-copy-id user@your-server-ip
```

Then update `.env`:
```bash
ANSIBLE_SSH_PRIVATE_KEY_FILE=~/.ssh/id_rsa
```

Then regenerate the inventory:
```bash
make generate-inventory
```

## Deployment

### Using Makefile (Recommended)

The deployment process automatically generates the inventory from `.env` and creates an archive:

```bash
# Step 1: Ensure .env file is configured (see Configuration section above)
# Step 2: Deploy to remote server (generates inventory, creates archive, and deploys)
make deploy

# Or deploy without creating archive (if archive already exists)
make deploy-only

# Generate inventory from .env (run this if you change .env)
make generate-inventory

# Check deployment without making changes
make deploy-check

# View remote logs
make logs-remote

# Check remote status
make status-remote

# Restart remote containers
make restart-remote

# Clean up deployment archive
make clean-archive
```

**Note:** 
- The `make deploy` command automatically generates the inventory from `.env` and creates the archive if needed
- If you change `.env`, run `make generate-inventory` to update the inventory
- All deployment commands automatically generate the inventory before running

### Using Ansible Directly

**Important:** You must generate the inventory from `.env` and create the deployment archive first:

```bash
# Step 1: Generate inventory from .env
./ansible/generate-inventory.sh
# or
make generate-inventory

# Step 2: Create deployment archive
./ansible/create-deploy-archive.sh
# or
make create-archive

# Step 3: Deploy
ansible-playbook -i ansible/inventory.yml ansible/playbook.yml

# Dry-run (check what would change)
ansible-playbook -i ansible/inventory.yml ansible/playbook.yml --check
```

## What the Playbook Does

The deployment process is optimized using zip archives for faster transfers:

1. **Checks for deployment archive**: Verifies that the archive exists locally (created by `make create-archive`)
2. **Transfers archive**: Copies the single zip file to the remote server (much faster than individual files)
3. **Extracts archive**: Unzips the archive on the remote server
4. **Installs dependencies**: Docker, Docker Compose, Python packages (if not already installed)
5. **Creates application user**: Creates a dedicated user for the application
6. **Sets up directory structure**: Creates `/opt/golem-century`
7. **Builds Docker image**: Builds the Docker image on the remote server
8. **Starts containers**: Uses Docker Compose to run the application
9. **Configures services**: Sets up proper permissions and user groups
10. **Cleans up**: Removes temporary archive file from remote server (local archive is kept)

### Deployment Archive Contents

The archive includes:
- `Dockerfile` and `docker-compose.yml`
- `.dockerignore`
- `go.mod` and `go.sum`
- `cmd/server/` (server source code)
- `internal/` (internal packages)
- `web/` (static web files)
- `vendor/` (Go dependencies)

Excluded from archive:
- Test files (`*_test.go`)
- Git files (`.git/`)
- Build artifacts
- CLI game (`cmd/game/`)
- IDE and OS files

## Customization

### Change Application Directory

Edit `ansible/playbook.yml` and modify the `app_dir` variable:

```yaml
vars:
  app_dir: /opt/golem-century  # Change this
```

### Change Application User

Edit `ansible/playbook.yml` and modify the `app_user` variable:

```yaml
vars:
  app_user: golem  # Change this
```

### Change Port

Edit `ansible/playbook.yml` and modify the `app_port` variable:

```yaml
vars:
  app_port: 8080  # Change this
```

Also update `docker-compose.yml` to match.

## Troubleshooting

### Connection Issues

Test SSH connection:
```bash
ansible all -i ansible/inventory.yml -m ping
```

### Permission Issues

Ensure the user has sudo privileges:
```bash
ansible all -i ansible/inventory.yml -m shell -a "sudo -l" --become
```

### Docker Issues

Check if Docker is installed:
```bash
ansible all -i ansible/inventory.yml -m shell -a "docker --version" --become
```

### View Detailed Output

Run with verbose output:
```bash
ansible-playbook -i ansible/inventory.yml ansible/playbook.yml -v
# or -vv for more verbosity, -vvv for even more
```

## Manual Deployment Steps

If you prefer to deploy manually:

1. Create deployment archive:
   ```bash
   make create-archive
   # or
   ./ansible/create-deploy-archive.sh
   ```

2. Copy archive to server:
   ```bash
   scp /tmp/golem-century-deploy.zip user@server:/tmp/
   ```

3. SSH into server:
   ```bash
   ssh user@server
   ```

4. Extract and deploy:
   ```bash
   mkdir -p /opt/golem-century
   cd /opt/golem-century
   unzip /tmp/golem-century-deploy.zip
   docker-compose up -d --build
   rm /tmp/golem-century-deploy.zip
   ```

## Security Notes

- **`.env` file is gitignored** - Never commit sensitive information to version control
- **`inventory.yml` is gitignored** - It's auto-generated from `.env` and contains sensitive data
- The playbook creates a non-root user by default
- Consider using SSH keys instead of passwords
- Review firewall rules to ensure the application port is accessible
- For production, consider using HTTPS with a reverse proxy (nginx/traefik)
- Keep your `.env` file secure and don't share it publicly

## File Structure

```
.
├── .env                    # Sensitive configuration (gitignored)
├── .env.example            # Template for .env
├── ansible/
│   ├── inventory.yml       # Auto-generated from .env (gitignored)
│   ├── generate-inventory.sh  # Script to generate inventory from .env
│   ├── playbook.yml        # Ansible playbook
│   └── ...
└── Makefile                # Deployment commands
```

