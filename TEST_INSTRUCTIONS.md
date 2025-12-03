# Test Instructions

## Overview

The project now has comprehensive test coverage including:
- **Unit Tests**: Game logic validation
- **Integration Tests**: Full stack tests with MongoDB and Redis

## Prerequisites

### For Unit Tests
- Go 1.21+

### For Integration Tests
- Docker and Docker Compose
- MongoDB container running
- Redis container running

## Running Tests

### Quick Start with Make Commands

```bash
# Run unit tests only
make test-unit

# Run integration tests (starts Docker containers automatically)
make test-integration

# Run all tests (unit + integration)
make test-all

# Run integration tests and cleanup containers after
make test-integration-cleanup
```

### 1. Start Docker Containers (for manual testing)

```bash
# Start MongoDB and Redis
sudo docker compose up -d mongodb redis

# Verify containers are running
sudo docker ps | grep -E "(mongo|redis)"
```

Expected output:
```
golem-redis     redis:7-alpine   Up X minutes (healthy)
golem-mongodb   mongo:7          Up X minutes (healthy)
```

### 2. Run Unit Tests

```bash
# Run game validation tests
go test -v ./internal/game/... -run "TestGameRulesValidation|TestBasicGameFlow|TestEdgeCases"
```

**Expected**: All 10 subtests PASS
- TestEdgeCases (3/3)
  - EmptyHandRest ✓
  - AllCardsAcquired ✓
  - NoAffordableActions ✓
- TestGameRulesValidation (7/7)
  - InitialSetup ✓
  - CaravanCapacity ✓
  - UpgradeChain ✓
  - GameEndCondition ✓
  - TurnProgression ✓
  - RestAction ✓
  - TokenBonusScoring ✓
- TestBasicGameFlow ✓

### 3. Run Integration Tests

```bash
# Run integration tests with Docker containers
INTEGRATION_TEST=true go test -v ./internal/integration/... -timeout 30s
```

**Expected**: All 4 subtests PASS
- TestIntegrationWithDockerContainers
  - CreateAndStoreGame ✓
  - PlayCompleteGameRound ✓
  - EventReplay ✓
  - ConcurrentEventStorage ✓

### 4. Run All Tests Together

```bash
# Unit tests
go test ./internal/game/... -run "TestGameRulesValidation|TestBasicGameFlow|TestEdgeCases"

# Integration tests
INTEGRATION_TEST=true go test ./internal/integration/... -timeout 30s
```

## Test Coverage

### Unit Tests (`internal/game/validation_test.go`)

#### Game Rules Validation
- ✅ Initial Setup: Validates 5 point cards, 5 action cards, correct starting resources
- ✅ Caravan Capacity: 10 crystal maximum enforced
- ✅ Upgrade Chain: Yellow → Green → Blue → Pink mechanics
- ✅ Game End Condition: 5 point cards triggers last round
- ✅ Turn Progression: Player rotation with modulo arithmetic
- ✅ Rest Action: Cards return to hand correctly
- ✅ Token Bonus Scoring: Coins contribute to final score

#### Edge Cases
- ✅ Empty Hand Rest: Rest action works with no cards
- ✅ All Cards Acquired: Market empty scenario
- ✅ No Affordable Actions: Fallback to Rest

#### Basic Game Flow
- ✅ Game initialization with 2 players
- ✅ Multiple turns executed successfully
- ✅ Rest actions work as expected

### Integration Tests (`internal/integration/integration_test.go`)

#### Full Stack Validation
- ✅ **CreateAndStoreGame**: Event creation → MongoDB storage → Redis publish
- ✅ **PlayCompleteGameRound**: 10 turns, 11 events stored and published
- ✅ **EventReplay**: Retrieve events from specific positions
- ✅ **ConcurrentEventStorage**: Atomic event ID generation under concurrent load

## Test Output Example

### Successful Unit Test Run
```
=== RUN   TestGameRulesValidation
=== RUN   TestGameRulesValidation/InitialSetup
    validation_test.go:39: ✓ Initial setup valid: 5 point cards, 5 action cards, correct starting resources
=== RUN   TestGameRulesValidation/CaravanCapacity
    validation_test.go:52: ✓ Correctly detected caravan over capacity: 11 > 10
... [more tests]
--- PASS: TestGameRulesValidation (0.00s)
PASS
ok      golem_century/internal/game     0.011s
```

### Successful Integration Test Run
```
=== RUN   TestIntegrationWithDockerContainers
2025-12-04T00:34:35.851+0700    INFO    Starting integration test with MongoDB and Redis
=== RUN   TestIntegrationWithDockerContainers/CreateAndStoreGame
    integration_test.go:128: ✓ Successfully created game, stored event in MongoDB, and published to Redis
=== RUN   TestIntegrationWithDockerContainers/PlayCompleteGameRound
    integration_test.go:213: ✓ Successfully played 10 turns, stored 11 events, all published to Redis
... [more tests]
--- PASS: TestIntegrationWithDockerContainers (0.40s)
PASS
ok      golem_century/internal/integration      0.406s
```

## Troubleshooting

### Integration Tests Failing

**Problem**: `Failed to connect to MongoDB` or `Failed to connect to Redis`

**Solution**:
```bash
# Check containers are running
sudo docker ps | grep -E "(mongo|redis)"

# Restart if needed
sudo docker compose restart mongodb redis

# Check health
sudo docker compose ps
```

### Port Conflicts

**Problem**: Containers won't start due to port already in use

**Solution**:
```bash
# Check what's using the ports
sudo lsof -i :27017  # MongoDB
sudo lsof -i :6379   # Redis

# Stop conflicting services or change ports in docker-compose.yml
```

### Permission Denied on Docker

**Problem**: `permission denied while trying to connect to the docker API`

**Solution**:
```bash
# Use sudo
sudo docker compose up -d mongodb redis

# Or add user to docker group (logout/login required)
sudo usermod -aG docker $USER
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Run Unit Tests
        run: go test -v ./internal/game/...
      
      - name: Run Integration Tests
        run: INTEGRATION_TEST=true go test -v ./internal/integration/...
```

## Summary

✅ **All Tests Passing**
- 10/10 Unit Tests
- 4/4 Integration Tests
- Full game logic validation
- Full stack MongoDB + Redis integration
- Concurrent event handling verified

The test suite validates:
1. Game rules compliance per `game_rules.md`
2. Event-sourced architecture with MongoDB
3. Real-time updates via Redis Pub/Sub
4. Concurrent event handling with atomic counters
5. Event replay capability for game reconstruction
