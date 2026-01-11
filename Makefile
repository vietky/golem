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

fe-build-local:
# 	docker build --build-arg VITE_API_HOST=https://game.anhtran.dev/api/golem --build-arg VITE_NGINX_HOST=https://game.anhtran.dev -f Dockerfile.fe -t golem-frontend:latest .
# 	docker run --rm -v ./web/react/:/nginx-dest golem-frontend:latest \
#         sh -c "cp -r /app/dist/* /nginx-dest/"
	cp .env.example .env
	cd web/react-frontend && npm i && npm run build
	mkdir -p web/react
	rm -rf web/react/* || true
	cp -rf web/react-frontend/dist/* web/react/

fe-run-local:
	cd web/react-frontend && npm run dev

fe-release:
# 	docker build --build-arg VITE_API_HOST=http://157.66.101.66:3001 --build-arg VITE_NGINX_HOST=http://157.66.101.66 -f Dockerfile.fe -t golem-frontend:latest .
	docker build --build-arg VITE_API_HOST=https://game.anhtran.dev/api/golem --build-arg VITE_NGINX_HOST=https://game.anhtran.dev -f Dockerfile.fe -t golem-frontend:latest .
	docker run --rm -v /opt/nginx/apps/:/nginx-dest golem-frontend:latest \
        sh -c "cp -r /app/dist/* /nginx-dest/golem/"

be-release:
	docker-compose -f docker-compose.yml up -d --build

static-update:
	scp -r web/static/* root@157.66.101.66:/opt/nginx/apps/assets/

symlinks-create:
	sh scripts/create-symlinks.sh

kill-dev:
	lsof -ti :8080 | xargs kill -INT 2>/dev/null; sleep 2; lsof -ti :8080 | xargs kill -9 2>/dev/null; killall -9 main 2>/dev/null; echo "All servers killed"

# Kubernetes/k3s deployment commands
k3s-setup-registry: ## Setup local Docker registry on k3s server
	@echo "Setting up Docker registry on k3s server..."
	cd ansible && ansible-playbook -i inventory.ini setup-docker-registry.yml

k3s-install-ingress: ## Install NGINX Ingress Controller on k3s server
	@echo "Installing NGINX Ingress Controller..."
	ssh root@157.66.101.66 'bash -s' < scripts/install-ingress-controller.sh

k3s-cleanup: ## Cleanup namespaces (usage: make k3s-cleanup ENV=staging|production|all)
	@ENV_VAR=$${ENV:-all}; \
	echo "Cleaning up $$ENV_VAR environment(s)..."; \
	ssh root@157.66.101.66 'bash -s' < scripts/cleanup-namespaces.sh $$ENV_VAR

k3s-test: ## Test k3s deployment configuration
	@echo "Testing k3s deployment configuration..."
	./scripts/test-k3s-deploy.sh

k3s-deploy: ## Deploy backend to k3s cluster (production)
	@echo "Deploying backend to PRODUCTION environment..."
	cd ansible && DEPLOY_ENV=production ansible-playbook -i inventory.ini deploy-k3s-backend.yml

k3s-deploy-staging: ## Deploy backend to STAGING environment
	@echo "Deploying backend to STAGING environment..."
	cd ansible && DEPLOY_ENV=staging ansible-playbook -i inventory.ini deploy-k3s-backend.yml

k3s-deploy-prod: ## Deploy backend to PRODUCTION environment (alias for k3s-deploy)
	@echo "Deploying backend to PRODUCTION environment..."
	cd ansible && DEPLOY_ENV=production ansible-playbook -i inventory.ini deploy-k3s-backend.yml

k3s-deploy-version: ## Deploy specific backend version (usage: make k3s-deploy-version VERSION=v1.0.0 ENV=staging)
	@if [ -z "$(VERSION)" ]; then \
		echo "Error: VERSION variable is required. Usage: make k3s-deploy-version VERSION=v1.0.0 ENV=staging"; \
		exit 1; \
	fi
	@ENV_VAR=$${ENV:-production}; \
	echo "Deploying version $(VERSION) to $$ENV_VAR environment..."; \
	DEPLOY_ENV=$$ENV_VAR APP_VERSION=$(VERSION) cd ansible && ansible-playbook -i inventory.ini deploy-k3s-backend.yml

k3s-frontend-test: ## Deploy frontend to TEST environment
	@echo "Deploying frontend to TEST environment..."
	cd ansible && DEPLOY_ENV=test ansible-playbook -i inventory.ini deploy-frontend.yml

k3s-frontend-prod: ## Deploy frontend to PROD environment
	@echo "Deploying frontend to PROD environment..."
	cd ansible && DEPLOY_ENV=prod ansible-playbook -i inventory.ini deploy-frontend.yml

k3s-deploy-full-test: ## Deploy full stack to TEST environment
	@echo "Deploying full stack to TEST environment..."
	cd ansible && DEPLOY_ENV=test ansible-playbook -i inventory.ini deploy-k3s.yml

k3s-deploy-full-prod: ## Deploy full stack to PROD environment
	@echo "Deploying full stack to PROD environment..."
	cd ansible && DEPLOY_ENV=prod ansible-playbook -i inventory.ini deploy-k3s.yml

k3s-status: ## Check k3s deployment status (usage: make k3s-status ENV=staging)
	@ENV_VAR=$${ENV:-production}; \
	if [ "$$ENV_VAR" = "staging" ]; then \
		NAMESPACE=golem-staging; \
	else \
		NAMESPACE=golem; \
	fi; \
	echo "Checking $$ENV_VAR environment (namespace: $$NAMESPACE)..."; \
	ssh root@157.66.101.66 "kubectl get all -n $$NAMESPACE && kubectl get ingress -n $$NAMESPACE"

k3s-status-all: ## Check status of both staging and production
	@echo "=== STAGING Environment ==="
	@ssh root@157.66.101.66 "kubectl get all -n golem-staging 2>/dev/null" || echo "Staging not deployed"
	@echo ""
	@echo "=== PRODUCTION Environment ==="
	@ssh root@157.66.101.66 "kubectl get all -n golem 2>/dev/null" || echo "Production not deployed"

k3s-logs: ## View k3s application logs (usage: make k3s-logs ENV=staging)
	@ENV_VAR=$${ENV:-production}; \
	if [ "$$ENV_VAR" = "staging" ]; then \
		NAMESPACE=golem-staging; \
	else \
		NAMESPACE=golem; \
	fi; \
	echo "Fetching logs from $$ENV_VAR (namespace: $$NAMESPACE)..."; \
	ssh root@157.66.101.66 "kubectl logs -f -n $$NAMESPACE deployment/golem-century --tail=100"

k3s-logs-db: ## View k3s database logs (usage: make k3s-logs-db ENV=staging)
	@ENV_VAR=$${ENV:-production}; \
	if [ "$$ENV_VAR" = "staging" ]; then \
		NAMESPACE=golem-staging; \
	else \
		NAMESPACE=golem; \
	fi; \
	echo "Fetching database logs from $$ENV_VAR (namespace: $$NAMESPACE)..."; \
	ssh root@157.66.101.66 "kubectl logs -f -n $$NAMESPACE deployment/mongodb --tail=100"

k3s-logs-cache: ## View k3s cache logs (usage: make k3s-logs-cache ENV=staging)
	@ENV_VAR=$${ENV:-production}; \
	if [ "$$ENV_VAR" = "staging" ]; then \
		NAMESPACE=golem-staging; \
	else \
		NAMESPACE=golem; \
	fi; \
	echo "Fetching cache logs from $$ENV_VAR (namespace: $$NAMESPACE)..."; \
	ssh root@157.66.101.66 "kubectl logs -f -n $$NAMESPACE deployment/redis --tail=100"

k3s-restart: ## Restart k3s application (usage: make k3s-restart ENV=staging)
	@ENV_VAR=$${ENV:-production}; \
	if [ "$$ENV_VAR" = "staging" ]; then \
		NAMESPACE=golem-staging; \
	else \
		NAMESPACE=golem; \
	fi; \
	echo "Restarting application in $$ENV_VAR (namespace: $$NAMESPACE)..."; \
	ssh root@157.66.101.66 "kubectl rollout restart deployment/golem-century -n $$NAMESPACE"

k3s-scale: ## Scale k3s application (usage: make k3s-scale REPLICAS=3)
	@if [ -z "$(REPLICAS)" ]; then \
		echo "Error: REPLICAS variable is required. Usage: make k3s-scale REPLICAS=3"; \
		exit 1; \
# Legacy commands (deprecated, use specific environment commands above)
k3s-frontend: k3s-frontend-test ## Deploy frontend (defaults to TEST) - DEPRECATED: use k3s-frontend-test or k3s-frontend-prod

k3s-deploy-full: k3s-deploy-full-test ## Deploy full stack (defaults to TEST) - DEPRECATED: use k3s-deploy-full-test or k3s-deploy-full-prod deployment..."
	ssh root@157.66.101.66 "kubectl describe deployment golem-century -n golem-app"

k3s-frontend: ## Deploy only frontend to nginx
	@echo "Deploying frontend to nginx..."
	cd web/react-frontend && npm install && npm run build
	mkdir -p web/react
	rm -rf web/react/* || true
	cp -rf web/react-frontend/dist/* web/react/
	rsync -avz --delete web/react/ root@157.66.101.66:/opt/nginx/apps/golem/
	rsync -avz web/static/ root@157.66.101.66:/opt/nginx/apps/assets/
	@echo "Frontend deployment complete!"

k3s-deploy-full: ## Deploy both backend (k3s) and frontend (nginx)
	@echo "Starting full deployment (backend + frontend)..."
	make k3s-deploy
	@echo "Full deployment complete!"