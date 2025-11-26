#!/bin/bash
# Helper script to create deployment archive
# This can be used standalone or called by the playbook

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ARCHIVE_NAME="golem-century-deploy.zip"
ARCHIVE_PATH="/tmp/${ARCHIVE_NAME}"

cd "$PROJECT_ROOT"

echo "Creating deployment archive..."

# Remove old archive if exists
rm -f "$ARCHIVE_PATH"

# Create zip archive with necessary files
zip -r "$ARCHIVE_PATH" \
  Dockerfile \
  docker-compose.yml \
  .dockerignore \
  go.mod \
  go.sum \
  cmd/server \
  internal \
  web \
  vendor \
  -x "*.git*" \
  -x "*_test.go" \
  -x "*.DS_Store" \
  -x "cmd/game/*" \
  -x "**/node_modules/*" \
  > /dev/null

# Get archive size
ARCHIVE_SIZE=$(du -h "$ARCHIVE_PATH" | cut -f1)
echo "Archive created: $ARCHIVE_PATH ($ARCHIVE_SIZE)"

echo "$ARCHIVE_PATH"

