# Event Store Implementation

## Overview
This implementation provides a complete event sourcing system for the Golem Century game. It records every player action along with the complete game state at that moment, allowing for debugging, replay, and analysis.

## Architecture

### Components

1. **Event Store Interface** (`internal/eventstore/eventstore.go`)
   - Defines the contract for event storage operations
   - Follows SOLID principles with clear separation of concerns

2. **MongoDB Implementation** (`internal/eventstore/mongo.go`)
   - Implements the EventStore interface using MongoDB
   - Stores events in sequence with automatic indexing
   - Maintains latest game state snapshots for quick access

3. **Server Integration** (`internal/server/`)
   - GameSession records events for every player action
   - Automatic event storage on action execution
   - Non-blocking design - game continues even if event storage fails

4. **Admin Interface** (`web/admin-interface/`)
   - React application with Tailwind CSS
   - View event history for any game
   - Inspect game state at any point in time
   - Real-time updates with auto-refresh

## Database Schema

### Events Collection (`game_events`)
```javascript
{
  _id: ObjectId,
  game_id: String,          // Game session ID
  player_id: Number,        // Player who performed the action
  action: {                 // The action taken
    Type: Number,
    CardIndex: Number,
    // ... other action fields
  },
  game_state: {             // Complete game state after action
    Players: [...],
    Market: {...},
    // ... complete state
  },
  timestamp: ISODate,       // When the action occurred
  sequence_num: Number      // Sequential event number per game
}
```

**Indexes:**
- `{game_id: 1, sequence_num: 1}` - Unique compound index
- `{game_id: 1}` - For game queries
- `{timestamp: -1}` - For time-based queries

### Snapshots Collection (`game_snapshots`)
```javascript
{
  _id: ObjectId,
  game_id: String,          // Game session ID
  game_state: {...},        // Latest game state
  last_event: String,       // ID of last event
  sequence_num: Number,     // Sequence number of last event
  updated_at: ISODate       // Last update time
}
```

**Indexes:**
- `{game_id: 1}` - Unique index

## Configuration

Environment variables (see `.env.example`):

```bash
# MongoDB Configuration
MONGO_URI=mongodb://mongodb:27017
MONGO_DB=golem_game
MONGO_EVENTS_COLL=game_events
MONGO_SNAPSHOTS_COLL=game_snapshots
```

## API Endpoints

### Get Events
```
GET /api/events?gameId={gameId}&fromSequence={seq}&limit={limit}
```

Returns events for a game in sequence order.

**Parameters:**
- `gameId` (required): Game session ID
- `fromSequence` (optional): Start from this sequence number
- `limit` (optional): Maximum events to return (default: 100)

**Response:**
```json
{
  "events": [...],
  "count": 5
}
```

### Get Snapshot
```
GET /api/snapshot?gameId={gameId}
```

Returns the latest game state snapshot.

**Response:**
```json
{
  "id": "...",
  "gameId": "session-123",
  "gameState": {...},
  "lastEvent": "...",
  "sequenceNum": 42,
  "updatedAt": "2025-12-05T..."
}
```

### List Games
```
GET /api/games
```

Returns list of games with events.

**Response:**
```json
{
  "games": ["session-123", "session-456"],
  "count": 2
}
```

## Usage

### Running the Application

1. **Start all services:**
   ```bash
   make up
   ```

2. **View logs:**
   ```bash
   make logs
   ```

3. **Access MongoDB shell:**
   ```bash
   make mongo-shell
   ```

### Admin Interface

1. **Install dependencies:**
   ```bash
   make admin-install
   ```

2. **Run in development mode:**
   ```bash
   make admin-dev
   ```
   Access at: http://localhost:3002

3. **Build for production:**
   ```bash
   make admin-build
   ```

### Viewing Events

Using the admin interface:
1. Enter game ID (e.g., "session-123")
2. Click "Load Events"
3. Click on any event to see the game state at that moment
4. Enable "Auto-refresh" for real-time updates

Using curl:
```bash
# List events
make events-list GAME_ID=session-123

# Get snapshot
make events-snapshot GAME_ID=session-123
```

## Testing

### Run all tests:
```bash
make test
```

### Run unit tests only:
```bash
make test-unit
```

### Run integration tests:
```bash
make test-integration
```

Integration tests require MongoDB to be running on localhost:27017.

## Event Flow

1. **Game Creation:**
   - Initial game state is stored as event #1
   - Snapshot is created with initial state

2. **Player Action:**
   - Action is validated and executed
   - New event is stored with action details and resulting state
   - Snapshot is updated with latest state
   - Event storage failures are logged but don't stop the game

3. **Event Retrieval:**
   - Events can be queried by game ID
   - Events are returned in sequence order
   - Snapshots provide quick access to latest state

## Debugging Use Cases

1. **Bug Reproduction:**
   - Find the event where bug occurred
   - Inspect complete game state at that moment
   - Replay events to reproduce the issue

2. **Player Behavior Analysis:**
   - View sequence of actions taken by players
   - Analyze decision patterns
   - Identify common strategies

3. **Game Balance:**
   - Track resource distribution over time
   - Identify winning patterns
   - Measure card effectiveness

## Future Enhancements

- [ ] Event replay functionality to recreate game from events
- [ ] Aggregation queries for game statistics
- [ ] Export events to JSON for offline analysis
- [ ] Event filtering by player or action type
- [ ] Time-travel debugging (load state at any point)
- [ ] Performance metrics and analytics dashboard

## Technical Notes

### Error Handling
- Event storage failures are logged but don't interrupt gameplay
- MongoDB connection failures fall back to graceful degradation
- All event store operations have timeout protection

### Performance
- Indexes ensure fast event queries
- Snapshots avoid replaying all events for current state
- Batch operations minimize database round trips

### Scalability
- Events are partitioned by game_id
- Compound indexes support efficient queries
- Time-based cleanup can be added for old games

## Troubleshooting

### MongoDB connection failed
```bash
# Check MongoDB is running
docker-compose ps

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Events not appearing in admin interface
```bash
# Check if events are in database
make mongo-shell
> db.game_events.find({game_id: "session-123"})

# Check API endpoint
curl http://localhost:8080/api/events?gameId=session-123

# Check server logs
docker-compose logs golem-century
```

### Integration tests failing
```bash
# Ensure MongoDB is running
docker-compose up -d mongodb

# Check MongoDB connectivity
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Run tests with verbose output
go test -v ./internal/eventstore/
```
