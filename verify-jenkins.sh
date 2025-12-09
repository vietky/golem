#!/bin/bash
# Jenkins Job Verification Script
# Tests that the golem-century-deploy job can run builds

set -e

echo "=== Jenkins Job Verification ==="
echo ""

# Test 1: Check if job exists
echo "1. Checking if job exists..."
JOB_URL="http://157.66.101.66:8080/job/golem-century-deploy"
if curl -s -u admin:avietidol "$JOB_URL/api/json" | grep -q '"buildable":true'; then
    echo "✅ Job exists and is buildable"
else
    echo "❌ Job not found or not buildable"
    exit 1
fi

# Test 2: Check write capability inside container
echo ""
echo "2. Testing write capability in Jenkins container..."
ssh root@157.66.101.66 "docker exec jenkins sh -c 'cd /var/jenkins_home/jobs/golem-century-deploy && echo test > test-write.txt && rm test-write.txt && echo SUCCESS'" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Jenkins can write to job directory"
else
    echo "❌ Jenkins cannot write to job directory"
    exit 1
fi

# Test 3: Check last build status
echo ""
echo "3. Checking last build status..."
LAST_BUILD=$(curl -s -u admin:avietidol "$JOB_URL/lastBuild/api/json" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'Build #{data[\"number\"]}: {data[\"result\"]}')" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Last build: $LAST_BUILD"
else
    echo "⚠️  No previous builds found (this is OK for new job)"
fi

# Test 4: Show next build number
echo ""
echo "4. Next build number..."
NEXT_BUILD=$(curl -s -u admin:avietidol "$JOB_URL/api/json" | python3 -c "import sys, json; print(json.load(sys.stdin)['nextBuildNumber'])")
echo "✅ Next build will be #$NEXT_BUILD"

echo ""
echo "=== Verification Complete ==="
echo ""
echo "To trigger a build manually:"
echo "1. Visit: $JOB_URL"
echo "2. Click 'Build with Parameters'"
echo "3. Click 'Build'"
echo ""
echo "Or run: make setup-jenkins (to recreate the job)"
