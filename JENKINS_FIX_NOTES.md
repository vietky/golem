# Jenkins Job Setup - Fix for Atomic Write Failure

## Problem
The Ansible playbook failed with:
```
java.nio.file.NoSuchFileException: /var/jenkins_home/jobs/golem-century-deploy/config.xml-atomic...tmp
```

**Root Cause:** Jenkins CLI's `update-job` command attempts an atomic write operation (write to temp file, then rename). This fails when the target job directory doesn't exist, because Jenkins can't write the temporary file.

## Solution
The playbook has been updated to:

### 1. **Create Job Directory BEFORE CLI Operations**
A new task ensures the job directory exists with proper ownership before attempting `create-job` or `update-job`:

```yaml
- name: Ensure Jenkins job directory exists (fix for atomic write failure)
  file:
    path: "{{ jenkins_home }}/jobs/{{ jenkins_job_name }}"
    state: directory
    owner: "{{ jenkins_user | default('jenkins') }}"
    group: "{{ jenkins_user | default('jenkins') }}"
    mode: '0755'
  become: yes
```

**Key changes:**
- Runs **before** any CLI job creation/update
- Sets owner/group to `jenkins:jenkins` (or whatever Jenkins runs as)
- Ensures write permissions (`0755`)

### 2. **Improved Fallback Logic**
If CLI operations fail, the playbook:
1. Copies the config XML directly to the job directory
2. Reloads Jenkins configuration via REST API

This avoids repeated CLI failures if Jenkins is having issues.

### 3. **Better Error Handling**
- Tracks both `create_job_result` and `update_job_result` separately
- Only falls back if CLI truly failed (not just "already exists")

## How to Verify

Run the updated playbook:
```bash
ansible-playbook -i ansible/inventory.ini ansible/setup-jenkins-job.yml
```

Or, manually check the Jenkins host:
```bash
# On Jenkins host (157.66.101.66):
ls -ld /var/jenkins_home/jobs/golem-century-deploy
stat /var/jenkins_home/jobs/golem-century-deploy/config.xml
```

If the job was created successfully:
- The directory should exist and be owned by `jenkins:jenkins`
- The config.xml should be present

## Testing on Manual Run (if needed)

If you want to retry manually on the Jenkins host:

```bash
# Ensure directory exists
sudo mkdir -p /var/jenkins_home/jobs/golem-century-deploy
sudo chown jenkins:jenkins /var/jenkins_home/jobs/golem-century-deploy

# Retry the job update
java -jar /tmp/jenkins-cli.jar -s http://127.0.0.1:8080 -auth admin:admin \
  update-job golem-century-deploy < /tmp/golem-jenkins-job.xml
```

## Changes Made
- **File:** `ansible/setup-jenkins-job.yml`
- **Task added:** "Ensure Jenkins job directory exists (fix for atomic write failure)" - inserted before CLI operations
- **Task improved:** "Update existing Jenkins job if creation failed" - now registers result for fallback logic
- **Task improved:** "Fallback - Copy config directly and reload if CLI failed" - now properly conditions on both create and update failures

## Related Files
- Playbook: `ansible/setup-jenkins-job.yml`
- Inventory: `ansible/inventory.ini` (defines `deployment_servers` and `jenkins_*` variables)
