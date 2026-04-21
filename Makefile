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

dev:
	sudo docker compose -f docker-compose.dev.yml up -d
	sudo docker exec -it golem-century-server sh

k3s-deploy: ## Deploy backend to k3s cluster (production)
	@echo "Deploying backend to PRODUCTION environment..."
	cd ansible && DEPLOY_ENV=production ansible-playbook -i inventory.ini deploy-k3s-backend.yml

k3s-frontend: ## Deploy frontend to PROD environment (Gateway API)
	@echo "Deploying frontend to PROD environment..."
	cd ansible && DEPLOY_ENV=production ansible-playbook -i inventory.ini deploy-frontend-gateway.yml
