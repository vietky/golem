package mongodb

import (
	"context"
	"fmt"
	"time"

	"golem_century/internal/events"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MongoEventStore implements the EventStore interface using MongoDB
type MongoEventStore struct {
	client     *mongo.Client
	database   *mongo.Database
	collection *mongo.Collection
}

// NewMongoEventStore creates a new MongoDB event store
func NewMongoEventStore(ctx context.Context, uri, dbName string) (*MongoEventStore, error) {
	clientOptions := options.Client().ApplyURI(uri)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Ping to verify connection
	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	database := client.Database(dbName)
	collection := database.Collection("events")

	// Create indexes
	store := &MongoEventStore{
		client:     client,
		database:   database,
		collection: collection,
	}

	if err := store.createIndexes(ctx); err != nil {
		return nil, fmt.Errorf("failed to create indexes: %w", err)
	}

	return store, nil
}

// createIndexes creates necessary indexes for the events collection
func (m *MongoEventStore) createIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "gameId", Value: 1},
				{Key: "eventId", Value: 1},
			},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{
				{Key: "gameId", Value: 1},
				{Key: "timestamp", Value: 1},
			},
		},
		{
			Keys: bson.D{
				{Key: "gameId", Value: 1},
				{Key: "eventType", Value: 1},
			},
		},
	}

	_, err := m.collection.Indexes().CreateMany(ctx, indexes)
	return err
}

// AppendEvent appends a new event to the store
func (m *MongoEventStore) AppendEvent(ctx context.Context, event *events.Event) (int64, error) {
	// Generate event ID using a counter
	eventID, err := m.getNextEventID(ctx, event.GameID)
	if err != nil {
		return 0, fmt.Errorf("failed to generate event ID: %w", err)
	}

	event.ID = eventID
	event.Timestamp = time.Now()

	// Insert the event
	_, err = m.collection.InsertOne(ctx, event)
	if err != nil {
		return 0, fmt.Errorf("failed to insert event: %w", err)
	}

	return eventID, nil
}

// getNextEventID generates the next event ID for a game using an atomic counter
func (m *MongoEventStore) getNextEventID(ctx context.Context, gameID string) (int64, error) {
	countersCollection := m.database.Collection("counters")

	filter := bson.M{"_id": gameID}
	update := bson.M{"$inc": bson.M{"sequence": 1}}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)

	var result struct {
		Sequence int64 `bson:"sequence"`
	}

	err := countersCollection.FindOneAndUpdate(ctx, filter, update, opts).Decode(&result)
	if err != nil {
		return 0, err
	}

	return result.Sequence, nil
}

// GetEvents retrieves events for a game, optionally starting from a specific event ID
func (m *MongoEventStore) GetEvents(ctx context.Context, gameID string, fromEventID int64) ([]*events.Event, error) {
	filter := bson.M{
		"gameId":  gameID,
		"eventId": bson.M{"$gte": fromEventID},
	}

	opts := options.Find().SetSort(bson.D{{Key: "eventId", Value: 1}})
	cursor, err := m.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %w", err)
	}
	defer cursor.Close(ctx)

	var eventList []*events.Event
	if err := cursor.All(ctx, &eventList); err != nil {
		return nil, fmt.Errorf("failed to decode events: %w", err)
	}

	return eventList, nil
}

// GetEventsByTimeRange retrieves events for a game within a time range
func (m *MongoEventStore) GetEventsByTimeRange(ctx context.Context, gameID string, from, to time.Time) ([]*events.Event, error) {
	filter := bson.M{
		"gameId": gameID,
		"timestamp": bson.M{
			"$gte": from,
			"$lte": to,
		},
	}

	opts := options.Find().SetSort(bson.D{{Key: "_id", Value: 1}})
	cursor, err := m.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %w", err)
	}
	defer cursor.Close(ctx)

	var eventList []*events.Event
	if err := cursor.All(ctx, &eventList); err != nil {
		return nil, fmt.Errorf("failed to decode events: %w", err)
	}

	return eventList, nil
}

// GetLatestEventID gets the latest event ID for a game
func (m *MongoEventStore) GetLatestEventID(ctx context.Context, gameID string) (int64, error) {
	filter := bson.M{"gameId": gameID}
	opts := options.FindOne().SetSort(bson.D{{Key: "_id", Value: -1}})

	var event events.Event
	err := m.collection.FindOne(ctx, filter, opts).Decode(&event)
	if err == mongo.ErrNoDocuments {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("failed to query latest event: %w", err)
	}

	return event.ID, nil
}

// EventExists checks if an event with the given ID already exists
func (m *MongoEventStore) EventExists(ctx context.Context, gameID string, eventID int64) (bool, error) {
	filter := bson.M{
		"gameId":  gameID,
		"eventId": eventID,
	}

	count, err := m.collection.CountDocuments(ctx, filter)
	if err != nil {
		return false, fmt.Errorf("failed to check event existence: %w", err)
	}

	return count > 0, nil
}

// Close closes the MongoDB connection
func (m *MongoEventStore) Close(ctx context.Context) error {
	return m.client.Disconnect(ctx)
}
