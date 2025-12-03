package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"golem_century/internal/config"
	"golem_century/internal/events"
	"golem_century/internal/game"

	"github.com/gorilla/websocket"
)

// Client represents a WebSocket client connection
type Client struct {
	ID             string
	GameID         string
	PlayerID       int
	Conn           *websocket.Conn
	Send           chan []byte
	LastEventID    int64
	mu             sync.RWMutex
	disconnectOnce sync.Once
}

// ClientMessage represents a message from a client
type ClientMessage struct {
	Type    string                 `json:"type"`
	Data    map[string]interface{} `json:"data,omitempty"`
	EventID int64                  `json:"eventId,omitempty"` // For reconnection
}

// ServerMessage represents a message to a client
type ServerMessage struct {
	Type    string                 `json:"type"`
	Data    map[string]interface{} `json:"data,omitempty"`
	EventID int64                  `json:"eventId,omitempty"`
	Error   string                 `json:"error,omitempty"`
}

// Hub manages WebSocket connections and game sessions
type Hub struct {
	config        *config.Config
	eventStore    events.EventStore
	eventPub      events.EventPublisher
	gameStates    map[string]*game.GameState
	gameEngines   map[string]*game.Engine
	clients       map[string]*Client // clientID -> Client
	gameClients   map[string][]*Client // gameID -> []*Client
	register      chan *Client
	unregister    chan *Client
	broadcast     chan *BroadcastMessage
	mu            sync.RWMutex
	ctx           context.Context
	cancel        context.CancelFunc
}

// BroadcastMessage represents a message to broadcast to a game
type BroadcastMessage struct {
	GameID  string
	Message []byte
}

// NewHub creates a new WebSocket hub
func NewHub(cfg *config.Config, eventStore events.EventStore, eventPub events.EventPublisher) *Hub {
	ctx, cancel := context.WithCancel(context.Background())

	return &Hub{
		config:      cfg,
		eventStore:  eventStore,
		eventPub:    eventPub,
		gameStates:  make(map[string]*game.GameState),
		gameEngines: make(map[string]*game.Engine),
		clients:     make(map[string]*Client),
		gameClients: make(map[string][]*Client),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		broadcast:   make(chan *BroadcastMessage, 256),
		ctx:         ctx,
		cancel:      cancel,
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.registerClient(client)
		case client := <-h.unregister:
			h.unregisterClient(client)
		case message := <-h.broadcast:
			h.broadcastToGame(message.GameID, message.Message)
		case <-h.ctx.Done():
			return
		}
	}
}

// registerClient registers a new client
func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.clients[client.ID] = client
	h.gameClients[client.GameID] = append(h.gameClients[client.GameID], client)

	log.Printf("Client registered: %s (Player %d in Game %s)", client.ID, client.PlayerID, client.GameID)
}

// unregisterClient unregisters a client
func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clients[client.ID]; ok {
		delete(h.clients, client.ID)

		// Remove from game clients
		gameClients := h.gameClients[client.GameID]
		for i, c := range gameClients {
			if c.ID == client.ID {
				h.gameClients[client.GameID] = append(gameClients[:i], gameClients[i+1:]...)
				break
			}
		}

		close(client.Send)
		log.Printf("Client unregistered: %s", client.ID)

		// Emit PlayerLeft event
		h.emitPlayerLeftEvent(client.GameID, client.PlayerID)
	}
}

// broadcastToGame broadcasts a message to all clients in a game
func (h *Hub) broadcastToGame(gameID string, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	clients := h.gameClients[gameID]
	for _, client := range clients {
		select {
		case client.Send <- message:
		default:
			// Client send buffer is full, skip
		}
	}
}

// CreateGame creates a new game session
func (h *Hub) CreateGame(gameID string, numPlayers int, seed int64) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, exists := h.gameStates[gameID]; exists {
		return fmt.Errorf("game already exists: %s", gameID)
	}

	// Create game state
	gameState := game.NewGameState(numPlayers, seed)
	engine := &game.Engine{
		GameState: gameState,
		AI:        nil,
	}

	h.gameStates[gameID] = gameState
	h.gameEngines[gameID] = engine

	// Emit GameCreated event
	event := &events.Event{
		GameID:    gameID,
		EventType: events.EventGameCreated,
		PlayerID:  0,
		Data: map[string]interface{}{
			"numPlayers": numPlayers,
			"seed":       seed,
		},
	}

	if _, err := h.eventStore.AppendEvent(h.ctx, event); err != nil {
		return fmt.Errorf("failed to append GameCreated event: %w", err)
	}

	if err := h.eventPub.Publish(h.ctx, gameID, event); err != nil {
		log.Printf("Failed to publish GameCreated event: %v", err)
	}

	log.Printf("Game created: %s (players: %d, seed: %d)", gameID, numPlayers, seed)
	return nil
}

// GetGameState gets the game state for a game
func (h *Hub) GetGameState(gameID string) (*game.GameState, bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	gameState, exists := h.gameStates[gameID]
	return gameState, exists
}

// GetGameEngine gets the game engine for a game
func (h *Hub) GetGameEngine(gameID string) (*game.Engine, bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	engine, exists := h.gameEngines[gameID]
	return engine, exists
}

// emitPlayerLeftEvent emits a PlayerLeft event
func (h *Hub) emitPlayerLeftEvent(gameID string, playerID int) {
	event := &events.Event{
		GameID:    gameID,
		EventType: events.EventPlayerLeft,
		PlayerID:  playerID,
		Data:      map[string]interface{}{},
	}

	if _, err := h.eventStore.AppendEvent(h.ctx, event); err != nil {
		log.Printf("Failed to append PlayerLeft event: %v", err)
		return
	}

	if err := h.eventPub.Publish(h.ctx, gameID, event); err != nil {
		log.Printf("Failed to publish PlayerLeft event: %v", err)
	}
}

// SendToClient sends a message to a specific client
func (h *Hub) SendToClient(clientID string, message []byte) error {
	h.mu.RLock()
	defer h.mu.RUnlock()

	client, ok := h.clients[clientID]
	if !ok {
		return fmt.Errorf("client not found: %s", clientID)
	}

	select {
	case client.Send <- message:
		return nil
	case <-time.After(5 * time.Second):
		return fmt.Errorf("timeout sending to client: %s", clientID)
	}
}

// BroadcastToGame broadcasts a message to all clients in a game
func (h *Hub) BroadcastToGame(gameID string, message []byte) {
	h.broadcast <- &BroadcastMessage{
		GameID:  gameID,
		Message: message,
	}
}

// Shutdown gracefully shuts down the hub
func (h *Hub) Shutdown() {
	h.cancel()

	h.mu.Lock()
	defer h.mu.Unlock()

	// Close all client connections
	for _, client := range h.clients {
		client.Conn.Close()
	}
}

// Helper function to create server message
func createServerMessage(msgType string, data map[string]interface{}, eventID int64, errMsg string) []byte {
	msg := ServerMessage{
		Type:    msgType,
		Data:    data,
		EventID: eventID,
		Error:   errMsg,
	}

	msgBytes, _ := json.Marshal(msg)
	return msgBytes
}
