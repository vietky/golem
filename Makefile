.PHONY: help build up down logs restart deploy update status clean test test-unit test-integration run dev

# Variables
ANSIBLE_PLAYBOOK = ansible-playbook
ANSIBLE_DIR = ansible
PLAYBOOK = $(ANSIBLE_DIR)/playbook.yml
INVENTORY = $(ANSIBLE_DIR)/inventory.yml
APP_NAME = golem-century
ENV_FILE = .env
MAIN_FILE = cmd/server/main_new.go

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

# Development commands
dev: ## Run the server locally with hot reload (requires air)
	@which air > /dev/null || (echo "air not found. Install with: go install github.com/air-verse/air@latest" && exit 1)
	air

run: ## Run the server locally
	go run $(MAIN_FILE)

# Testing commands
test: ## Run all tests
	go test -v ./...

test-unit: ## Run unit tests only
	@echo "Running unit tests..."
	go test -v ./internal/game/... -run "TestGameRulesValidation|TestBasicGameFlow|TestEdgeCases"

test-integration: ## Run integration tests with Docker containers
	@echo "Starting Docker containers (MongoDB and Redis)..."
	@sudo docker compose up -d mongodb redis
	@echo "Waiting for containers to be healthy..."
	@sleep 5
	@echo "Running integration tests..."
	@INTEGRATION_TEST=true go test -v ./internal/integration/... -timeout 30s || (echo "Tests failed"; sudo docker compose logs mongodb redis; exit 1)
	@echo "Integration tests completed successfully"

test-integration-cleanup: ## Run integration tests and cleanup containers
	@$(MAKE) test-integration
	@echo "Stopping Docker containers..."
	@sudo docker compose down

test-all: test-unit test-integration ## Run all unit and integration tests
	@echo "All tests completed successfully!"

# Build commands
build: ## Build the Go binary
	go build -o bin/server $(MAIN_FILE)

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

# Event replay commands
replay: ## Replay events for a game (usage: make replay GAME_ID=game-123)
	@if [ -z "$(GAME_ID)" ]; then echo "GAME_ID is required. Usage: make replay GAME_ID=game-123"; exit 1; fi
	@echo "Replaying events for game $(GAME_ID)..."
	@go run scripts/replay_events.go $(GAME_ID)

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
	docker-compose -f docker-compose.dev.yml up -d