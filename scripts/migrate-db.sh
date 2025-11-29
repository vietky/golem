#!/bin/bash
# Database migration script for Golem Century

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-golem_user}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-golem_password}
POSTGRES_DB=${POSTGRES_DB:-golem_db}

echo "Running database migrations..."
echo "Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "Database: $POSTGRES_DB"
echo "User: $POSTGRES_USER"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Error: psql is not installed"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Run migrations
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -f internal/database/schema.sql

echo "Database migrations completed successfully!"
