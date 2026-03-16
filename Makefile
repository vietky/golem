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
	# Build frontend container image for Gateway API (serves at /apps/golem)
	cp .env.example .env
	cd web/react-frontend && npm i && npm run build
	mkdir -p web/react
	rm -rf web/react/* || true
	cp -rf web/react-frontend/dist/* web/react/

fe-build-gateway: ## Build frontend container for Gateway API deployment
	docker build \
		--platform linux/amd64 \
		--build-arg VITE_API_HOST=https://game.anhtran.dev/apps/golem/api \
		--build-arg VITE_NGINX_HOST=https://statics.vietky.io.vn \
		--build-arg VITE_BASE_PATH=/apps/golem/ \
		-f Dockerfile.frontend \
		-t golem-frontend:latest .

fe-push-gateway: fe-build-gateway ## Build and push frontend to k3s server registry
	docker save golem-frontend:latest | ssh root@157.66.101.66 'docker load && docker tag golem-frontend:latest 10.100.0.2:5000/golem-frontend:latest && docker push 10.100.0.2:5000/golem-frontend:latest'

fe-run-local:
	cd web/react-frontend && npm run dev

fe-release:
# 	docker build --build-arg VITE_API_HOST=http://157.66.101.66:3001 --build-arg VITE_NGINX_HOST=http://157.66.101.66 -f Dockerfile.fe -t golem-frontend:latest .
	docker build --build-arg VITE_API_HOST=https://game.anhtran.dev/api/golem --build-arg VITE_NGINX_HOST=https://game.anhtran.dev/static -f Dockerfile.fe -t golem-frontend:latest .
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

k3s-frontend-staging: ## Deploy frontend to STAGING environment (Gateway API)
	@echo "Deploying frontend to STAGING environment..."
	cd ansible && DEPLOY_ENV=staging ansible-playbook -i inventory.ini deploy-frontend-gateway.yml

k3s-frontend: ## Deploy frontend to PROD environment (Gateway API)
	@echo "Deploying frontend to PROD environment..."
	cd ansible && DEPLOY_ENV=production ansible-playbook -i inventory.ini deploy-frontend-gateway.yml

k3s-deploy-full-prod: ## Deploy full stack to PROD environment
	@echo "Deploying full stack to PROD environment..."
	cd ansible && DEPLOY_ENV=production ansible-playbook -i inventory.ini deploy-k3s-backend.yml
	cd ansible && DEPLOY_ENV=production ansible-playbook -i inventory.ini deploy-frontend-gateway.yml

k3s-deploy-gateway-staging: ## Deploy with Gateway API (staging)
	@echo "Deploying with Gateway API to STAGING..."
	@echo "Building and pushing images..."
	make be-push-gateway
	make fe-push-gateway
	@echo "Deploying backend and frontend..."
	cd ansible && DEPLOY_ENV=staging ansible-playbook -i inventory.ini deploy-k3s-backend.yml
	@echo "Gateway API deployment complete!"

k3s-gateway-status: ## Check Gateway API resources
	@echo "=== Gateway Resources ==="
	ssh root@157.66.101.66 "kubectl get gateway,httproute -n default"
	@echo ""
	@echo "=== Staging Gateway Resources ==="
	ssh root@157.66.101.66 "kubectl get gateway,httproute -n staging 2>/dev/null" || echo "No staging resources"

k3s-status: ## Check k3s deployment status (usage: make k3s-status ENV=staging)
	@ENV_VAR=$${ENV:-production}; \
	if [ "$$ENV_VAR" = "staging" ]; then \
		NAMESPACE=staging; \
	else \
		NAMESPACE=default; \
	fi; \
	echo "Checking $$ENV_VAR environment (namespace: $$NAMESPACE)..."; \
	ssh root@157.66.101.66 "kubectl get all -n $$NAMESPACE -l app=golem"

k3s-status-all: ## Check status of both staging and production
	@echo "=== STAGING Environment ==="
	@ssh root@157.66.101.66 "kubectl get all -n staging -l app=golem 2>/dev/null" || echo "Staging not deployed"
	@echo ""
	@echo "=== PRODUCTION Environment ==="
	@ssh root@157.66.101.66 "kubectl get all -n default -l app=golem 2>/dev/null" || echo "Production not deployed"

k3s-logs: ## View k3s application logs (usage: make k3s-logs ENV=staging)
	@ENV_VAR=$${ENV:-production}; \
	if [ "$$ENV_VAR" = "staging" ]; then \
		NAMESPACE=staging; \
		DEPLOYMENT=golem-century-staging; \
	else \
		NAMESPACE=default; \
		DEPLOYMENT=golem-century; \
	fi; \
	echo "Fetching logs from $$ENV_VAR (namespace: $$NAMESPACE)..."; \
	ssh root@157.66.101.66 "kubectl logs -f -n $$NAMESPACE deployment/$$DEPLOYMENT --tail=100"

k3s-logs-db: ## View k3s database logs (usage: make k3s-logs-db ENV=staging)
	@ENV_VAR=$${ENV:-production}; \
	if [ "$$ENV_VAR" = "staging" ]; then \
		NAMESPACE=staging; \
		DEPLOYMENT=mongodb-staging; \
	else \
		NAMESPACE=default; \
		DEPLOYMENT=mongodb; \
	fi; \
	echo "Fetching database logs from $$ENV_VAR (namespace: $$NAMESPACE)..."; \
	ssh root@157.66.101.66 "kubectl logs -f -n $$NAMESPACE deployment/$$DEPLOYMENT --tail=100"

k3s-logs-cache: ## View k3s cache logs (usage: make k3s-logs-cache ENV=staging)
	@ENV_VAR=$${ENV:-production}; \
	if [ "$$ENV_VAR" = "staging" ]; then \
		NAMESPACE=staging; \
		DEPLOYMENT=redis-staging; \
	else \
		NAMESPACE=default; \
		DEPLOYMENT=redis; \
	fi; \
	echo "Fetching cache logs from $$ENV_VAR (namespace: $$NAMESPACE)..."; \
	ssh root@157.66.101.66 "kubectl logs -f -n $$NAMESPACE deployment/$$DEPLOYMENT --tail=100"

k3s-restart: ## Restart k3s application (usage: make k3s-restart ENV=staging)
	@ENV_VAR=$${ENV:-production}; \
	if [ "$$ENV_VAR" = "staging" ]; then \
		NAMESPACE=staging; \
		DEPLOYMENT=golem-century-staging; \
	else \
		NAMESPACE=default; \
		DEPLOYMENT=golem-century; \
	fi; \
	echo "Restarting application in $$ENV_VAR (namespace: $$NAMESPACE)..."; \
	ssh root@157.66.101.66 "kubectl rollout restart deployment/$$DEPLOYMENT -n $$NAMESPACE"

k3s-scale: ## Scale k3s application (usage: make k3s-scale REPLICAS=3 ENV=staging)
	@if [ -z "$(REPLICAS)" ]; then \
		echo "Error: REPLICAS variable is required. Usage: make k3s-scale REPLICAS=3 ENV=staging"; \
		exit 1; \
	fi
	@ENV_VAR=$${ENV:-production}; \
	if [ "$$ENV_VAR" = "staging" ]; then \
		NAMESPACE=staging; \
		DEPLOYMENT=golem-century-staging; \
	else \
		NAMESPACE=default; \
		DEPLOYMENT=golem-century; \
	fi; \
	echo "Scaling $$DEPLOYMENT in $$ENV_VAR to $(REPLICAS) replicas..."; \
	ssh root@157.66.101.66 "kubectl scale deployment/$$DEPLOYMENT -n $$NAMESPACE --replicas=$(REPLICAS)"

k3s-deploy-full: ## Deploy both backend (k3s) and frontend (nginx)
	@echo "Starting full deployment (backend + frontend)..."
	make k3s-deploy
	@echo "Full deployment complete!"