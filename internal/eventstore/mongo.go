package eventstore

import (
	"context"
	"fmt"
	"log"
	"time"

	"golem_century/internal/game"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MongoEventStore implements EventStore interface using MongoDB
type MongoEventStore struct {
	client        *mongo.Client
	database      *mongo.Database
	eventsColl    *mongo.Collection
	snapshotsColl *mongo.Collection
	config        EventStoreConfig
}

// NewMongoEventStoreRequest represents request to create a new MongoDB event store
type NewMongoEventStoreRequest struct {
	Config EventStoreConfig
}

// NewMongoEventStoreResponse represents response from creating a MongoDB event store
type NewMongoEventStoreResponse struct {
	Store *MongoEventStore
	Error error
}

// NewMongoEventStore creates a new MongoDB event store
func NewMongoEventStore(req NewMongoEventStoreRequest) NewMongoEventStoreResponse {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(req.Config.MongoURI))
	if err != nil {
		return NewMongoEventStoreResponse{
			Store: nil,
			Error: fmt.Errorf("failed to connect to MongoDB: %w", err),
		}
	}

	// Ping to verify connection
	if err := client.Ping(ctx, nil); err != nil {
		return NewMongoEventStoreResponse{
			Store: nil,
			Error: fmt.Errorf("failed to ping MongoDB: %w", err),
		}
	}

	database := client.Database(req.Config.Database)
	eventsColl := database.Collection(req.Config.EventsColl)
	snapshotsColl := database.Collection(req.Config.SnapshotsColl)

	// Create indexes
	store := &MongoEventStore{
		client:        client,
		database:      database,
		eventsColl:    eventsColl,
		snapshotsColl: snapshotsColl,
		config:        req.Config,
	}

	if err := store.createIndexes(); err != nil {
		log.Printf("Warning: failed to create indexes: %v", err)
	}

	return NewMongoEventStoreResponse{
		Store: store,
		Error: nil,
	}
}

// createIndexes creates necessary indexes for the collections
func (m *MongoEventStore) createIndexes() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Index for events collection
	eventsIndexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "game_id", Value: 1},
				{Key: "sequence_num", Value: 1},
			},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "game_id", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "timestamp", Value: -1}},
		},
	}

	_, err := m.eventsColl.Indexes().CreateMany(ctx, eventsIndexes)
	if err != nil {
		return fmt.Errorf("failed to create events indexes: %w", err)
	}

	// Index for snapshots collection
	snapshotsIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "game_id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
	}

	_, err = m.snapshotsColl.Indexes().CreateMany(ctx, snapshotsIndexes)
	if err != nil {
		return fmt.Errorf("failed to create snapshots indexes: %w", err)
	}

	return nil
}

// StoreEvent stores a game event
func (m *MongoEventStore) StoreEvent(req StoreEventRequest) StoreEventResponse {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Get next sequence number
	sequenceNum, err := m.getNextSequenceNumber(ctx, req.GameID)
	if err != nil {
		return StoreEventResponse{
			EventID:     "",
			SequenceNum: 0,
			Error:       fmt.Errorf("failed to get sequence number: %w", err),
		}
	}

	event := Event{
		GameID:      req.GameID,
		PlayerID:    req.PlayerID,
		Action:      req.Action,
		GameState:   req.GameState,
		Timestamp:   time.Now(),
		SequenceNum: sequenceNum,
	}

	result, err := m.eventsColl.InsertOne(ctx, event)
	if err != nil {
		return StoreEventResponse{
			EventID:     "",
			SequenceNum: 0,
			Error:       fmt.Errorf("failed to insert event: %w", err),
		}
	}

	// Get the inserted ID as string
	eventID := fmt.Sprintf("%v", result.InsertedID)

	// Update snapshot
	if err := m.UpdateSnapshot(req.GameID, req.GameState, eventID, sequenceNum); err != nil {
		log.Printf("Warning: failed to update snapshot: %v", err)
	}

	return StoreEventResponse{
		EventID:     eventID,
		SequenceNum: sequenceNum,
		Error:       nil,
	}
}

// getNextSequenceNumber gets the next sequence number for a game
func (m *MongoEventStore) getNextSequenceNumber(ctx context.Context, gameID string) (int64, error) {
	// Find the last event for this game
	opts := options.FindOne().SetSort(bson.D{{Key: "sequence_num", Value: -1}})
	var lastEvent Event
	err := m.eventsColl.FindOne(ctx, bson.M{"game_id": gameID}, opts).Decode(&lastEvent)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return 1, nil // First event
		}
		return 0, err
	}
	return lastEvent.SequenceNum + 1, nil
}

// GetEvents retrieves events for a game
func (m *MongoEventStore) GetEvents(req GetEventsRequest) GetEventsResponse {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"game_id": req.GameID}
	if req.FromSequence > 0 {
		filter["sequence_num"] = bson.M{"$gte": req.FromSequence}
	}

	opts := options.Find().SetSort(bson.D{{Key: "sequence_num", Value: 1}})
	if req.Limit > 0 {
		opts.SetLimit(int64(req.Limit))
	}

	cursor, err := m.eventsColl.Find(ctx, filter, opts)
	if err != nil {
		return GetEventsResponse{
			Events: nil,
			Error:  fmt.Errorf("failed to query events: %w", err),
		}
	}
	defer cursor.Close(ctx)

	var events []Event
	if err := cursor.All(ctx, &events); err != nil {
		return GetEventsResponse{
			Events: nil,
			Error:  fmt.Errorf("failed to decode events: %w", err),
		}
	}

	return GetEventsResponse{
		Events: events,
		Error:  nil,
	}
}

// GetSnapshot retrieves the latest game state snapshot
func (m *MongoEventStore) GetSnapshot(req GetSnapshotRequest) GetSnapshotResponse {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var snapshot GameStateSnapshot
	err := m.snapshotsColl.FindOne(ctx, bson.M{"game_id": req.GameID}).Decode(&snapshot)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return GetSnapshotResponse{
				Snapshot: nil,
				Error:    nil, // No snapshot yet
			}
		}
		return GetSnapshotResponse{
			Snapshot: nil,
			Error:    fmt.Errorf("failed to get snapshot: %w", err),
		}
	}

	return GetSnapshotResponse{
		Snapshot: &snapshot,
		Error:    nil,
	}
}

// UpdateSnapshot updates the latest game state snapshot
func (m *MongoEventStore) UpdateSnapshot(gameID string, gameState *game.GameState, lastEventID string, sequenceNum int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	snapshot := GameStateSnapshot{
		GameID:      gameID,
		GameState:   gameState,
		LastEvent:   lastEventID,
		SequenceNum: sequenceNum,
		UpdatedAt:   time.Now(),
	}

	opts := options.Update().SetUpsert(true)
	_, err := m.snapshotsColl.UpdateOne(
		ctx,
		bson.M{"game_id": gameID},
		bson.M{"$set": snapshot},
		opts,
	)
	if err != nil {
		return fmt.Errorf("failed to update snapshot: %w", err)
	}

	return nil
}

// Close closes the MongoDB connection
func (m *MongoEventStore) Close() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return m.client.Disconnect(ctx)
}
