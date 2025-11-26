#!/bin/bash
# Generate inventory.yml from .env file

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
INVENTORY_FILE="$SCRIPT_DIR/inventory.yml"

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE"
    echo "Please copy .env.example to .env and fill in your values:"
    echo "  cp .env.example .env"
    exit 1
fi

# Source .env file
set -a
source "$ENV_FILE"
set +a

# Set defaults
ANSIBLE_HOST=${ANSIBLE_HOST:-your-server-ip-or-hostname}
ANSIBLE_USER=${ANSIBLE_USER:-root}
ANSIBLE_PORT=${ANSIBLE_PORT:-22}
ANSIBLE_SERVER_NAME=${ANSIBLE_SERVER_NAME:-golem-server}

# Validate required variables
if [ "$ANSIBLE_HOST" = "your-server-ip-or-hostname" ]; then
    echo "Error: ANSIBLE_HOST is not set in .env file"
    exit 1
fi

# Generate inventory.yml
cat > "$INVENTORY_FILE" <<EOF
all:
  children:
    servers:
      hosts:
        ${ANSIBLE_SERVER_NAME}:
          ansible_host: ${ANSIBLE_HOST}
          ansible_user: ${ANSIBLE_USER}
          ansible_port: ${ANSIBLE_PORT}
EOF

# Add SSH key if specified
if [ -n "$ANSIBLE_SSH_PRIVATE_KEY_FILE" ]; then
    cat >> "$INVENTORY_FILE" <<EOF
          ansible_ssh_private_key_file: ${ANSIBLE_SSH_PRIVATE_KEY_FILE}
EOF
fi

# Add vars section
cat >> "$INVENTORY_FILE" <<EOF
          
  vars:
    ansible_python_interpreter: /usr/bin/python3
EOF

echo "Inventory generated successfully from .env file"

