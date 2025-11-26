.PHONY: help build up down logs restart deploy update status clean test

# Variables
ANSIBLE_PLAYBOOK = ansible-playbook
ANSIBLE_DIR = ansible
PLAYBOOK = $(ANSIBLE_DIR)/playbook.yml
INVENTORY = $(ANSIBLE_DIR)/inventory.yml
APP_NAME = golem-century
ENV_FILE = .env

# Load .env file if it exists
ifneq (,$(wildcard $(ENV_FILE)))
    include $(ENV_FILE)
    export
endif

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Local Docker commands
build: ## Build the Docker image locally
	docker-compose build

up: ## Start the containers locally
	docker-compose up -d

down: ## Stop the containers locally
	docker-compose down

logs: ## View container logs
	docker-compose logs -f

restart: ## Restart the containers locally
	docker-compose restart

status: ## Show container status
	docker-compose ps

# Ansible deployment commands
generate-inventory: ## Generate inventory.yml from .env file
	@echo "Generating inventory from .env file..."
	@$(ANSIBLE_DIR)/generate-inventory.sh

deploy: generate-inventory create-archive ## Deploy to remote server using Ansible (creates archive first)
	@echo "Deploying $(APP_NAME) to remote server..."
	$(ANSIBLE_PLAYBOOK) -i $(INVENTORY) $(PLAYBOOK) --ask-pass

deploy-only: generate-inventory ## Deploy to remote server using Ansible (requires archive to exist)
	@echo "Deploying $(APP_NAME) to remote server..."
	@if [ ! -f /tmp/$(APP_NAME)-deploy.zip ]; then \
		echo "Error: Archive not found. Run 'make create-archive' first."; \
		exit 1; \
	fi
	$(ANSIBLE_PLAYBOOK) -i $(INVENTORY) $(PLAYBOOK) --ask-pass

deploy-check: generate-inventory ## Check deployment without making changes (dry-run)
	@echo "Checking deployment (dry-run)..."
	$(ANSIBLE_PLAYBOOK) -i $(INVENTORY) $(PLAYBOOK) --check

update: generate-inventory ## Update the application on remote server
	@echo "Updating $(APP_NAME) on remote server..."
	$(ANSIBLE_PLAYBOOK) -i $(INVENTORY) $(PLAYBOOK) --tags update

stop-remote: generate-inventory ## Stop containers on remote server
	@echo "Stopping containers on remote server..."
	ansible all -i $(INVENTORY) -m shell -a "cd /opt/$(APP_NAME) && docker-compose down" --become --become-user golem

start-remote: generate-inventory ## Start containers on remote server
	@echo "Starting containers on remote server..."
	ansible all -i $(INVENTORY) -m shell -a "cd /opt/$(APP_NAME) && docker-compose up -d" --become --become-user golem

restart-remote: generate-inventory ## Restart containers on remote server
	@echo "Restarting containers on remote server..."
	ansible all -i $(INVENTORY) -m shell -a "cd /opt/$(APP_NAME) && docker-compose restart" --become --become-user golem

logs-remote: generate-inventory ## View logs from remote server
	@echo "Fetching logs from remote server..."
	ansible all -i $(INVENTORY) -m shell -a "cd /opt/$(APP_NAME) && docker-compose logs --tail=100" --become --become-user golem

status-remote: generate-inventory ## Check status on remote server
	@echo "Checking status on remote server..."
	ansible all -i $(INVENTORY) -m shell -a "cd /opt/$(APP_NAME) && docker-compose ps" --become --become-user golem

# Utility commands
clean: ## Remove local containers and images
	docker-compose down -v
	docker rmi $$(docker images -q $(APP_NAME)) 2>/dev/null || true

clean-archive: ## Remove deployment archive
	@rm -f /tmp/$(APP_NAME)-deploy.zip
	@echo "Archive cleaned"

create-archive: ## Create deployment archive (required before deploy)
	@echo "Creating deployment archive..."
	@$(ANSIBLE_DIR)/create-deploy-archive.sh
	@echo ""
	@echo "Archive created successfully. You can now run 'make deploy-only' to deploy."

test: ## Run tests (if any)
	@echo "Running tests..."
	go test ./...

validate-ansible: generate-inventory ## Validate Ansible playbook syntax
	$(ANSIBLE_PLAYBOOK) -i $(INVENTORY) $(PLAYBOOK) --syntax-check

# Quick deployment with specific host
deploy-to: ## Deploy to a specific host (usage: make deploy-to HOST=user@hostname)
	@if [ -z "$(HOST)" ]; then \
		echo "Error: HOST variable is required. Usage: make deploy-to HOST=user@hostname"; \
		exit 1; \
	fi
	$(ANSIBLE_PLAYBOOK) -i "$(HOST)," $(PLAYBOOK)

