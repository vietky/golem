# CI/CD Pipeline Troubleshooting Guide

## Issues Encountered and Solutions

### 1. Jenkins Job Creation Failures (HTTP 403 CSRF Errors)

**Problem**: Initial attempts to create Jenkins jobs via API failed with HTTP 403 errors.

**Root Cause**: Jenkins has CSRF protection enabled, requiring crumb tokens for API requests.

**Solution**: 
- Implemented cookie jar persistence (`/tmp/jenkins-cookies.txt`)
- Modified playbook to fetch CSRF crumb before each API call
- Used the same cookie jar for both crumb fetching and job operations

```yaml
- name: Get CSRF crumb with cookie persistence
  uri:
    url: "http://{{ ansible_host }}:8080/crumbIssuer/api/json"
    method: GET
    return_content: yes
    headers:
      Cookie: "{{ lookup('file', '/tmp/jenkins-cookies.txt', errors='ignore') }}"
  register: crumb_response

- name: Create/Update job with CSRF token and cookies
  shell: |
    curl -s -c /tmp/jenkins-cookies.txt -b /tmp/jenkins-cookies.txt \
      -H "{{ crumb_response.json.crumbRequestField }}:{{ crumb_response.json.crumb }}" \
      -X POST --data-binary @"{{ job_config_path }}" \
      -H "Content-Type:application/xml" \
      "http://{{ ansible_host }}:8080/createItem?name={{ job_name }}"
```

### 2. Pipeline Job Creation Failures (HTTP 500 Errors)

**Problem**: Attempts to create Pipeline jobs resulted in HTTP 500 errors.

**Root Cause**: Jenkins installation lacks Pipeline plugins (workflow-aggregator, workflow-job).

**Solution**: 
- Reverted to FreeStyle project format
- FreeStyle projects are supported out-of-the-box in Jenkins core

**Lesson**: Always verify required plugins are installed before using advanced Jenkins features.

### 3. Jenkins Build Failures - Script File Not Found

**Problem**: Build executions failed with `/bin/sh: cannot open /tmp/jenkins*.sh: No such file`.

**Root Cause**: Permission mismatch in `/var/jenkins_home` directory. Jenkins container runs as root but the home directory was owned by `jenkins:jenkins`.

**Solution**:
```bash
docker exec jenkins chown -R root:root /var/jenkins_home
docker restart jenkins
```

**Prevention**: Ensure consistent user ownership when running Jenkins container as non-default user.

### 4. SSH Permission Denied from Jenkins Container

**Problem**: Jenkins builds failed when trying to SSH to deployment server with "Permission denied (publickey,password)".

**Root Cause**: No SSH keys configured for Jenkins container to authenticate with the server.

**Solution**: Created automated SSH setup playbook:
```yaml
- name: Generate SSH keypair in Jenkins container
  shell: |
    docker exec jenkins bash -c '
    mkdir -p /root/.ssh
    if [ ! -f /root/.ssh/id_rsa ]; then
      ssh-keygen -t rsa -b 4096 -f /root/.ssh/id_rsa -N ""
    fi
    cat /root/.ssh/id_rsa.pub
    '
  register: jenkins_pubkey

- name: Add Jenkins public key to server authorized_keys
  authorized_key:
    user: root
    key: "{{ jenkins_pubkey.stdout_lines | last }}"
    state: present
```

### 5. XML Parsing Errors (HTTP 500 on Job Update)

**Problem**: Job updates failed with HTTP 500 when using heredoc syntax in shell commands.

**Root Cause**: XML parsing issues with complex heredoc syntax inside CDATA sections.

**Solution**: 
1. Initially used CDATA wrapper: `<command><![CDATA[...]]></command>`
2. Simplified to single-line command with proper XML escaping:
```xml
<command>echo "Deploying..." &amp;&amp; ssh -o StrictHostKeyChecking=no root@server "commands" &amp;&amp; echo "Done!"</command>
```

## Current Working Configuration

### Jenkins Job Configuration
- **Type**: FreeStyle Project
- **Execution**: Single-line shell command with SSH
- **Command Structure**:
  ```bash
  echo "Deploying APP from ${GIT_BRANCH}..." && \
  ssh -o StrictHostKeyChecking=no root@SERVER "cd /path/to/app/scripts && chmod +x deploy.sh && ./deploy.sh" && \
  echo "Deployment completed!"
  ```

### File Structure
```
ansible/
├── ansible.cfg
├── inventory.yml
├── deploy-playbook.yml          # Manual deployment
├── jenkins-setup-playbook.yml   # Jenkins job creation
├── setup-jenkins-ssh.yml        # SSH key configuration
└── templates/
    └── jenkins-job-config.xml.j2
```

### Deployment Flow
1. **Manual Deployment**: `ansible-playbook -i inventory.yml deploy-playbook.yml`
2. **Jenkins Setup**: `ansible-playbook -i inventory.yml jenkins-setup-playbook.yml`
3. **SSH Setup**: `ansible-playbook -i inventory.yml setup-jenkins-ssh.yml`
4. **GitHub Integration**: GitHub Actions triggers Jenkins on push to main

## Testing the Pipeline

### Test Jenkins Job Manually
```bash
# Get CSRF crumb
CRUMB=$(curl -s -c /tmp/jenkins-cookies.txt -b /tmp/jenkins-cookies.txt \
  'http://157.66.101.66:8080/crumbIssuer/api/json' | \
  jq -r '.crumbRequestField + ":" + .crumb')

# Trigger build
curl -s -c /tmp/jenkins-cookies.txt -b /tmp/jenkins-cookies.txt \
  -X POST -H "$CRUMB" \
  "http://157.66.101.66:8080/job/golem-century-deploy/buildWithParameters?GIT_BRANCH=main"

# Check build status
curl -s "http://157.66.101.66:8080/job/golem-century-deploy/lastBuild/consoleText"
```

### Verify Application
```bash
curl http://157.66.101.66:8081/
```

## Key Learnings

1. **CSRF Protection**: Always implement cookie jar persistence for Jenkins API interactions
2. **Plugin Dependencies**: Verify required Jenkins plugins before using advanced features
3. **Container Permissions**: Ensure consistent user/group ownership in container volumes
4. **SSH Key Management**: Automate SSH key distribution for container-to-host communication
5. **XML Escaping**: Use proper XML entity encoding (&amp; instead of &) in job configurations
6. **Simplicity**: Single-line commands are more reliable than complex multiline scripts in XML

## Future Improvements

1. **Security**:
   - Enable Jenkins authentication
   - Use SSH key passphrases
   - Implement proper StrictHostKeyChecking
   - Use Jenkins credentials plugin for sensitive data

2. **Monitoring**:
   - Add deployment notifications (Slack, email)
   - Implement rollback mechanisms
   - Add health check verification post-deployment

3. **Pipeline Evolution**:
   - Install Pipeline plugins for more advanced workflows
   - Implement multi-stage deployments
   - Add automated testing stages
