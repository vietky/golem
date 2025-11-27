# Jenkins Job Troubleshooting

## Common Issues

### 1. Deploy Script Not Found Error

**Error Message:**
```
cp: cannot stat '/opt/jenkins/repos/golem/deploy.sh': No such file or directory
Build step 'Execute shell' marked build as failure
```

**Root Cause:**
The Jenkins job cannot find the deployment script because:
- The repository might not be cloned yet
- The script path is incorrect
- The script is in a subdirectory (`scripts/deploy.sh`)

**Solution 1: Run the Setup Playbook Again**
```bash
ansible-playbook -i ansible/inventory.ini ansible/setup-jenkins-job.yml
```

This will:
- Clone/update the repository to `/opt/jenkins/repos/golem`
- Copy the deploy script to `/opt/jenkins/scripts/deploy.sh`
- Update the Jenkins job configuration to check both locations

**Solution 2: Manual Fix on Server**

SSH into the server and run:
```bash
# Download and run the fix script
curl -o /tmp/fix-jenkins-deploy.sh https://raw.githubusercontent.com/vietky/golem/main/scripts/fix-jenkins-deploy.sh
chmod +x /tmp/fix-jenkins-deploy.sh
/tmp/fix-jenkins-deploy.sh
```

Or manually:
```bash
# Create directories
mkdir -p /opt/jenkins/scripts
mkdir -p /opt/jenkins/repos

# Clone repository
cd /opt/jenkins/repos
git clone https://github.com/vietky/golem.git

# Copy deploy script
cp /opt/jenkins/repos/golem/scripts/deploy.sh /opt/jenkins/scripts/deploy.sh
chmod +x /opt/jenkins/scripts/deploy.sh
```

**Solution 3: Update Existing Job**

If you already have the Jenkins job created, update it via the web UI:

1. Go to Jenkins → golem-century-deploy → Configure
2. Update the "Execute shell" command to:

```bash
#!/bin/bash
set -e

# Export environment variables
export APP_NAME="golem-century"
export APP_DIR="/opt/jenkins/repos/golem"
export APP_PORT="8081"
export GIT_REPO="https://github.com/vietky/golem.git"
export GIT_BRANCH="${GIT_BRANCH:-main}"

# Check if deploy script exists in repo, otherwise use Jenkins copy
if [ -f "/opt/jenkins/repos/golem/scripts/deploy.sh" ]; then
  DEPLOY_SCRIPT="/opt/jenkins/repos/golem/scripts/deploy.sh"
elif [ -f "/opt/jenkins/scripts/deploy.sh" ]; then
  DEPLOY_SCRIPT="/opt/jenkins/scripts/deploy.sh"
else
  echo "ERROR: Deploy script not found!"
  exit 1
fi

echo "Using deploy script: ${DEPLOY_SCRIPT}"
chmod +x "${DEPLOY_SCRIPT}"

# Run deployment
"${DEPLOY_SCRIPT}"
```

### 2. Git Repository Not Cloned

**Solution:**
```bash
cd /opt/jenkins/repos
git clone https://github.com/vietky/golem.git
```

### 3. Permission Issues

**Error:**
```
Permission denied: /opt/jenkins/scripts/deploy.sh
```

**Solution:**
```bash
# Fix ownership
chown -R jenkins:jenkins /opt/jenkins/repos
chown -R jenkins:jenkins /opt/jenkins/scripts

# Fix permissions
chmod +x /opt/jenkins/scripts/deploy.sh
```

## Verification

After applying any fix, verify the setup:

```bash
# Check repository
ls -la /opt/jenkins/repos/golem/scripts/deploy.sh

# Check Jenkins scripts directory
ls -la /opt/jenkins/scripts/deploy.sh

# Check Jenkins user can access
sudo -u jenkins ls -la /opt/jenkins/scripts/deploy.sh
```

## How the Updated Setup Works

The updated `setup-jenkins-job.yml` playbook now:

1. **Creates necessary directories:**
   - `/opt/jenkins/scripts` - for deploy script
   - `/opt/jenkins/repos` - for git repositories

2. **Clones the repository:**
   - Ensures the repo is available at `/opt/jenkins/repos/golem`

3. **Copies deploy script:**
   - From local `scripts/deploy.sh` to `/opt/jenkins/scripts/deploy.sh`

4. **Updates job configuration:**
   - Job checks for script in repo first: `/opt/jenkins/repos/golem/scripts/deploy.sh`
   - Falls back to Jenkins copy: `/opt/jenkins/scripts/deploy.sh`
   - Fails with clear error if neither exists

## Re-running the Setup

To completely recreate the Jenkins job:

```bash
# Remove existing job (optional)
ansible-playbook -i ansible/inventory.ini ansible/remove-jenkins-job.yml

# Setup job again
ansible-playbook -i ansible/inventory.ini ansible/setup-jenkins-job.yml
```

## Testing the Job

After fixing, trigger a test build:

```bash
# Via curl
curl -X POST http://157.66.101.66:8080/job/golem-century-deploy/build \
  --user admin:admin

# Via Jenkins CLI
java -jar jenkins-cli.jar -s http://157.66.101.66:8080 \
  -auth admin:admin build golem-century-deploy
```
