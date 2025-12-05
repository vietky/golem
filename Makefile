.PHONY: help build up down logs restart deploy update status clean test test-unit test-integration run dev

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

# Docker commands
docker-build: ## Build the Docker image locally
	docker-compose build

up: ## Start all services (MongoDB, Redis, Server)
	docker-compose up -d

down: ## Stop all containers
	docker-compose down

logs: ## View container logs
	docker-compose logs -f

restart: ## Restart all containers
	docker-compose restart

status: ## Show container status
	docker-compose ps

# Database commands
mongo-shell: ## Open MongoDB shell
	docker-compose exec mongodb mongosh golem_game

redis-cli: ## Open Redis CLI
	docker-compose exec redis redis-cli

# Testing commands
test: ## Run all tests
	go test -v ./...

test-unit: ## Run unit tests
	go test -v -short ./...

test-integration: ## Run integration tests
	go test -v -run Integration ./...

# Admin interface commands
admin-install: ## Install admin interface dependencies
	cd web/admin-interface && npm install

admin-dev: ## Run admin interface in development mode
	cd web/admin-interface && npm run dev

admin-build: ## Build admin interface for production
	cd web/admin-interface && npm run build

# Event store commands
events-list: ## List events for a game (requires GAME_ID)
	@if [ -z "$(GAME_ID)" ]; then \
		echo "Error: GAME_ID not set. Usage: make events-list GAME_ID=session-123"; \
		exit 1; \
	fi
	@curl -s "http://localhost:8080/api/events?gameId=$(GAME_ID)" | jq .

events-snapshot: ## Get latest snapshot for a game (requires GAME_ID)
	@if [ -z "$(GAME_ID)" ]; then \
		echo "Error: GAME_ID not set. Usage: make events-snapshot GAME_ID=session-123"; \
		exit 1; \
	fi
	@curl -s "http://localhost:8080/api/snapshot?gameId=$(GAME_ID)" | jq .

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

validate-ansible: generate-inventory ## Validate Ansible playbook syntax
	$(ANSIBLE_PLAYBOOK) -i $(INVENTORY) $(PLAYBOOK) --syntax-check

# Quick deployment with specific host
deploy-to: ## Deploy to a specific host (usage: make deploy-to HOST=user@hostname)
	@if [ -z "$(HOST)" ]; then \
		echo "Error: HOST variable is required. Usage: make deploy-to HOST=user@hostname"; \
		exit 1; \
	fi
	$(ANSIBLE_PLAYBOOK) -i "$(HOST)," $(PLAYBOOK)

setup-jenkins:
	ansible-playbook -i ansible/inventory.ini ansible/setup-jenkins-job.yml

dev:
	sudo docker compose -f docker-compose.dev.yml up -d --build
	sudo docker exec -it golem-century-server sh

check-data:
	mkdir -p data/
	docker exec -it golem-mongodb mongoexport \
		--db=golem_game_test \
		--collection=events \
		--out=/data/events.json
	docker cp golem-mongodb:/data/events.json ./data/events.json

fe-build:
	cd web/react-frontend && npm run build
	rm -rf web/react/*
	cp -rf web/react-frontend/dist/* web/react/