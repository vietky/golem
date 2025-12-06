package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"golem_century/internal/eventstore"
	"golem_century/internal/game"
	"golem_century/internal/logger"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for local play
	},
}

// GameSession represents a multiplayer game session
type GameSession struct {
	ID            string
	GameState     *game.GameState
	Engine        *game.Engine
	Connections   map[int]*websocket.Conn // Player ID -> WebSocket connection
	PlayerNames   map[int]string          // Player ID -> Player name
	PlayerAvatars map[int]string          // Player ID -> Avatar number
	CreatedAt     time.Time               // When session was created
	LastActivity  time.Time               // Last time someone was in the room
	EventStore    eventstore.EventStore   // Event store for recording actions
	mu            sync.RWMutex
	ActionChan    chan PlayerAction
	BroadcastChan chan []byte
}

// PlayerAction represents an action from a player
type PlayerAction struct {
	PlayerID int
	Action   game.Action
}

// NewGameSession creates a new game session
func NewGameSession(sessionID string, numPlayers int, seed int64) *GameSession {
	gameState := game.NewGameState(numPlayers, seed)
	engine := &game.Engine{
		GameState: gameState,
		AI:        nil, // No AI players
	}

	now := time.Now()
	return &GameSession{
		ID:            sessionID,
		GameState:     gameState,
		Engine:        engine,
		Connections:   make(map[int]*websocket.Conn),
		PlayerNames:   make(map[int]string),
		PlayerAvatars: make(map[int]string),
		CreatedAt:     now,
		LastActivity:  now,
		EventStore:    nil, // Will be set by GameServer
		ActionChan:    make(chan PlayerAction, 10),
		BroadcastChan: make(chan []byte, 100),
	}
}

// AddPlayer adds a player to the session
func (gs *GameSession) AddPlayer(playerID int, name string, avatar string, conn *websocket.Conn) {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	gs.Connections[playerID] = conn
	gs.PlayerNames[playerID] = name
	if avatar == "" {
		avatar = fmt.Sprintf("%d", playerID) // Default to player ID
	}
	gs.PlayerAvatars[playerID] = avatar
	gs.LastActivity = time.Now() // Update activity time
	// Player IDs are 1-indexed, array is 0-indexed
	if playerID >= 1 && playerID <= len(gs.GameState.Players) {
		gs.GameState.Players[playerID-1].Name = name
		// All players are human (no AI)
	}
}

// RemovePlayer removes a player from the session
func (gs *GameSession) RemovePlayer(playerID int) {
	gs.mu.Lock()
	defer gs.mu.Unlock()
	delete(gs.Connections, playerID)
	delete(gs.PlayerNames, playerID)
	delete(gs.PlayerAvatars, playerID)
}

// Broadcast sends a message to all connected players
func (gs *GameSession) Broadcast(message []byte) {
	gs.mu.RLock()
	defer gs.mu.RUnlock()

	for _, conn := range gs.Connections {
		if conn != nil {
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			conn.WriteMessage(websocket.TextMessage, message)
		}
	}
}

// SendToPlayer sends a message to a specific player
func (gs *GameSession) SendToPlayer(playerID int, message []byte) error {
	gs.mu.RLock()
	defer gs.mu.RUnlock()

	conn, ok := gs.Connections[playerID]
	if !ok || conn == nil {
		return nil
	}

	conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	return conn.WriteMessage(websocket.TextMessage, message)
}

// GameServer manages multiple game sessions
type GameServer struct {
	Sessions   map[string]*GameSession
	EventStore eventstore.EventStore
	Logger     *logger.Logger
	mu         sync.RWMutex
}

// NewGameServerRequest represents request to create a new game server
type NewGameServerRequest struct {
	EventStore eventstore.EventStore
	Logger     *logger.Logger
}

// NewGameServer creates a new game server
func NewGameServer(req NewGameServerRequest) *GameServer {
	log := req.Logger
	if log == nil {
		log = logger.NewNopLogger()
	}
	return &GameServer{
		Sessions:   make(map[string]*GameSession),
		EventStore: req.EventStore,
		Logger:     log,
	}
}

// CreateSession creates a new game session
func (gs *GameServer) CreateSession(sessionID string, numPlayers int, seed int64) *GameSession {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	session := NewGameSession(sessionID, numPlayers, seed)
	session.EventStore = gs.EventStore // Set event store
	gs.Sessions[sessionID] = session

	// Store initial game state as first event if event store is available
	if session.EventStore != nil {
		req := eventstore.StoreEventRequest{
			GameID:    sessionID,
			PlayerID:  0,                     // System event
			Action:    game.Action{Type: -1}, // Special marker for initial state
			GameState: session.GameState,
		}
		resp := session.EventStore.StoreEvent(req)
		if resp.Error != nil {
			gs.Logger.Warn("Failed to store initial game state", zap.Error(resp.Error))
		}
	}

	// Start game loop
	go session.RunGameLoop()

	// Start cleanup timer for empty rooms
	go gs.startCleanupTimer(sessionID)

	return session
}

// startCleanupTimer starts a timer to clean up empty rooms after 5 minutes
func (gs *GameServer) startCleanupTimer(sessionID string) {
	ticker := time.NewTicker(30 * time.Second) // Check every 30 seconds
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			session, exists := gs.GetSession(sessionID)
			if !exists {
				return // Session already deleted
			}

			session.mu.RLock()
			hasPlayers := len(session.Connections) > 0
			lastActivity := session.LastActivity
			session.mu.RUnlock()

			// If no players and last activity was more than 5 minutes ago, delete
			if !hasPlayers {
				timeSinceActivity := time.Since(lastActivity)
				if timeSinceActivity >= 5*time.Minute {
					gs.Logger.Info("Deleting empty room", zap.String("sessionID", sessionID))
					gs.mu.Lock()
					delete(gs.Sessions, sessionID)
					gs.mu.Unlock()
					return
				}
			} else {
				// Update last activity if players are present
				session.mu.Lock()
				session.LastActivity = time.Now()
				session.mu.Unlock()
			}
		}
	}
}

// GetSession retrieves a game session
func (gs *GameServer) GetSession(sessionID string) (*GameSession, bool) {
	gs.mu.RLock()
	defer gs.mu.RUnlock()
	session, ok := gs.Sessions[sessionID]
	return session, ok
}

// RunGameLoop runs the game loop for a session
func (gs *GameSession) RunGameLoop() {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for !gs.GameState.GameOver {
		select {
		case action := <-gs.ActionChan:
			// Process player action
			currentPlayer := gs.GameState.GetCurrentPlayer()
			if action.PlayerID == currentPlayer.ID {
				if err := gs.GameState.ExecuteAction(action.Action); err == nil {
					// Store event if event store is available
					if gs.EventStore != nil {
						req := eventstore.StoreEventRequest{
							GameID:    gs.ID,
							PlayerID:  action.PlayerID,
							Action:    action.Action,
							GameState: gs.GameState,
						}
						resp := gs.EventStore.StoreEvent(req)
						if resp.Error != nil {
							// Don't fail the action if event store fails
							// TODO: log here
						}
					}

					gs.GameState.CheckGameOver()
					if !gs.GameState.GameOver {
						gs.GameState.NextTurn()
					}
					gs.BroadcastState()
				} else {
					// Send error to player
					errorMsg := map[string]interface{}{
						"type":  "error",
						"error": err.Error(),
					}
					if data, err := json.Marshal(errorMsg); err == nil {
						gs.SendToPlayer(action.PlayerID, data)
					}
				}
			}

		case <-ticker.C:
			// Check if current player is AI
			currentPlayer := gs.GameState.GetCurrentPlayer()
			if currentPlayer.IsAI && gs.Engine.AI != nil {
				// AI turn - execute AI action with a small delay for UX
				time.Sleep(500 * time.Millisecond)

				aiAction := gs.Engine.AI.ChooseAction(currentPlayer, gs.GameState.Market, gs.GameState)
				if err := gs.GameState.ExecuteAction(aiAction); err == nil {
					// Store event if event store is available
					if gs.EventStore != nil {
						req := eventstore.StoreEventRequest{
							GameID:    gs.ID,
							PlayerID:  currentPlayer.ID,
							Action:    aiAction,
							GameState: gs.GameState,
						}
						resp := gs.EventStore.StoreEvent(req)
						if resp.Error != nil {
							// Don't fail the action if event store fails
						}
					}

					gs.GameState.CheckGameOver()
					if !gs.GameState.GameOver {
						gs.GameState.NextTurn()
					}
					gs.BroadcastState()
				} else {
					// If AI action fails, try rest
					gs.GameState.ExecuteAction(game.Action{Type: game.Rest})
					gs.GameState.CheckGameOver()
					if !gs.GameState.GameOver {
						gs.GameState.NextTurn()
					}
					gs.BroadcastState()
				}
			}
		}
	}

	// Game over - send final state
	gs.BroadcastState()
}

// BroadcastState broadcasts the current game state to all players
func (gs *GameSession) BroadcastState() {
	state := gs.SerializeState()
	data, err := json.Marshal(state)
	if err != nil {
		return
	}
	gs.Broadcast(data)
}

// SerializeState serializes the game state for JSON transmission
func (gs *GameSession) SerializeState() map[string]interface{} {
	gs.mu.RLock()
	defer gs.mu.RUnlock()

	players := make([]map[string]interface{}, len(gs.GameState.Players))
	for i, p := range gs.GameState.Players {
		avatar := gs.PlayerAvatars[p.ID]
		if avatar == "" {
			avatar = fmt.Sprintf("%d", p.ID) // Default to player ID
		}
		resourcesMap := map[string]int{
			"yellow": p.Resources.Yellow,
			"green":  p.Resources.Green,
			"blue":   p.Resources.Blue,
			"pink":   p.Resources.Pink,
		}

		players[i] = map[string]interface{}{
			"id":        p.ID,
			"name":      p.Name,
			"avatar":    avatar,
			"resources": resourcesMap,
			// Backwards compatibility: some frontends expect `caravan`
			// as the resource container. Provide the same map under that key.
			"caravan":     resourcesMap,
			"points":      p.GetPoints(),
			"hand":        serializeCards(p.Hand),
			"playedCards": serializeCards(p.PlayedCards),
			"pointCards":  serializeCards(p.PointCards),
			"coins":       serializeCards(p.Coins),
			"hasRested":   p.HasRested,
			"isAI":        p.IsAI,
		}
	}

	marketActionCards := make([]map[string]interface{}, len(gs.GameState.Market.ActionCards))
	for i, card := range gs.GameState.Market.ActionCards {
		cost := gs.GameState.Market.GetActionCardCost(i)
		serialized := serializeCardWithCost(card, cost)
		// Ensure deposits field exists
		if _, exists := serialized["deposits"]; !exists {
			serialized["deposits"] = make(map[string]string)
		}
		marketActionCards[i] = serialized
	}

	marketPointCards := make([]map[string]interface{}, len(gs.GameState.Market.PointCards))
	for i, card := range gs.GameState.Market.PointCards {
		marketPointCards[i] = serializeCard(card)
	}

	marketCoins := serializeCards(gs.GameState.Market.Coins)

	return map[string]interface{}{
		"type":          "state",
		"currentTurn":   gs.GameState.CurrentTurn,
		"currentPlayer": gs.GameState.GetCurrentPlayer().ID,
		"round":         gs.GameState.Round,
		"gameOver":      gs.GameState.GameOver,
		"lastRound":     gs.GameState.LastRound,
		"winner":        gs.getWinnerInfo(),
		"players":       players,
		"market": map[string]interface{}{
			"actionCards": marketActionCards,
			"pointCards":  marketPointCards,
			"actionDeck":  len(gs.GameState.Market.ActionDeck),
			"pointDeck":   len(gs.GameState.Market.PointDeck),
			"coins":       marketCoins,
		},
	}
}

func (gs *GameSession) getWinnerInfo() map[string]interface{} {
	if gs.GameState.Winner == nil {
		return nil
	}
	return map[string]interface{}{
		"id":     gs.GameState.Winner.ID,
		"name":   gs.GameState.Winner.Name,
		"points": gs.GameState.Winner.GetFinalPoints(),
	}
}

func serializeCards(cards []*game.Card) []map[string]interface{} {
	result := make([]map[string]interface{}, len(cards))
	for i, card := range cards {
		result[i] = serializeCard(card)
	}
	return result
}

func serializeCard(card *game.Card) map[string]interface{} {
	result := map[string]interface{}{
		"id":   card.ID,
		"name": card.Name,
		"type": card.Type,
	}

	if card.Type == game.ActionCard {
		result["actionType"] = card.ActionType
		if card.Input != nil {
			result["input"] = map[string]int{
				"yellow": card.Input.Yellow,
				"green":  card.Input.Green,
				"blue":   card.Input.Blue,
				"pink":   card.Input.Pink,
			}
		}
		if card.Output != nil {
			result["output"] = map[string]int{
				"yellow": card.Output.Yellow,
				"green":  card.Output.Green,
				"blue":   card.Output.Blue,
				"pink":   card.Output.Pink,
			}
		}
		if card.ActionType == game.Upgrade {
			result["turnUpgrade"] = card.TurnUpgrade
			// Frontend expects `upgradeLevel` in some components — include alias for compatibility
			result["upgradeLevel"] = card.TurnUpgrade
		}
	} else if card.Type == game.PointCard {
		result["points"] = card.Points
		if card.Requirement != nil {
			result["requirement"] = map[string]int{
				"yellow": card.Requirement.Yellow,
				"green":  card.Requirement.Green,
				"blue":   card.Requirement.Blue,
				"pink":   card.Requirement.Pink,
			}
		}
	} else if card.Type == game.CoinCard {
		result["points"] = card.Points
		result["amount"] = card.Amount
	}

	// Serialize deposits - ALWAYS include deposits field, even if empty
	// Now supports stacking: each position can have multiple crystals
	if card.Deposits != nil {
		result["deposits"] = card.Deposits.ToMap()
	} else {
		// Always include deposits field, even if empty
		result["deposits"] = make(map[string]string)
	}

	return result
}

func serializeCardWithCost(card *game.Card, cost *game.Resources) map[string]interface{} {
	result := serializeCard(card)
	if cost != nil {
		result["cost"] = map[string]int{
			"yellow": cost.Yellow,
			"green":  cost.Green,
			"blue":   cost.Blue,
			"pink":   cost.Pink,
		}
	}
	return result
}
