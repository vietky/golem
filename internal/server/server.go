package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"golem_century/internal/config"
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
	ID             string
	GameState      *game.GameState
	Engine         *game.Engine
	Connections    map[int]*websocket.Conn    // Player ID -> WebSocket connection
	Spectators     map[string]*websocket.Conn // Spectator ID -> WebSocket connection
	SpectatorNames map[string]string          // Spectator ID -> Spectator name
	PlayerNames    map[int]string             // Player ID -> Player name
	PlayerAvatars  map[int]string             // Player ID -> Avatar number
	CreatedAt      time.Time                  // When session was created
	LastActivity   time.Time                  // Last time someone was in the room
	EventStore     eventstore.EventStore      // Event store for recording actions
	TurnTimeout    time.Duration              // Maximum time per turn (default 60s)
	TurnStartTime  time.Time                  // When the current turn started
	mu             sync.RWMutex
	ActionChan     chan PlayerAction
	BroadcastChan  chan []byte
	logger         *logger.Logger
	maxChatMsgs   int // Max chat messages from config
}

// PlayerAction represents an action from a player
type PlayerAction struct {
	PlayerID int
	Action   game.Action
}

// NewGameSession creates a new game session
func NewGameSession(sessionID string, numPlayers int, seed int64, turnTimeoutInSecond int, aiPlayer game.AIStrategy, logger *logger.Logger) *GameSession {
	gameState := game.NewGameState(numPlayers, seed)
	if aiPlayer == nil {
		aiPlayer = game.NewAIPlayer(gameState.RNG)
	}
	engine := &game.Engine{
		GameState: gameState,
		AI:        aiPlayer,
	}

	now := time.Now()
	return &GameSession{
		ID:             sessionID,
		GameState:      gameState,
		Engine:         engine,
		Connections:    make(map[int]*websocket.Conn),
		Spectators:     make(map[string]*websocket.Conn),
		SpectatorNames: make(map[string]string),
		PlayerNames:    make(map[int]string),
		PlayerAvatars:  make(map[int]string),
		CreatedAt:      now,
		LastActivity:   now,
		EventStore:     nil,                                              // Will be set by GameServer
		TurnTimeout:    time.Duration(turnTimeoutInSecond) * time.Second, // Default 60s timeout
		TurnStartTime:  now,
		ActionChan:     make(chan PlayerAction, 10),
		BroadcastChan:  make(chan []byte, 100),
		logger:         logger,
		maxChatMsgs:   10, // Default, will be set from config
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

// AddSpectator adds a spectator to the session
func (gs *GameSession) AddSpectator(spectatorID string, name string, conn *websocket.Conn) {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	gs.Spectators[spectatorID] = conn
	gs.SpectatorNames[spectatorID] = name
	gs.LastActivity = time.Now()
}

// RemoveSpectator removes a spectator from the session
func (gs *GameSession) RemoveSpectator(spectatorID string) {
	gs.mu.Lock()
	defer gs.mu.Unlock()
	delete(gs.Spectators, spectatorID)
	delete(gs.SpectatorNames, spectatorID)
}

// BroadcastPlayerJoined notifies all users when a player or spectator joins
func (gs *GameSession) BroadcastPlayerJoined(playerID int, name string, avatar string, isSpectator bool) {
	gs.mu.RLock()
	connectedPlayers := len(gs.Connections)
	spectatorCount := len(gs.Spectators)
	gs.mu.RUnlock()

	joinMsg := map[string]interface{}{
		"type":             "playerJoined",
		"playerID":         playerID,
		"playerName":       name,
		"avatar":           avatar,
		"isSpectator":      isSpectator,
		"connectedPlayers": connectedPlayers,
		"spectatorCount":   spectatorCount,
	}

	if data, err := json.Marshal(joinMsg); err == nil {
		gs.Broadcast(data)
	}
}

// Broadcast sends a message to all connected players and spectators
func (gs *GameSession) Broadcast(message []byte) {
	gs.mu.RLock()
	defer gs.mu.RUnlock()

	// Send to all players
	for _, conn := range gs.Connections {
		if conn != nil {
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			conn.WriteMessage(websocket.TextMessage, message)
		}
	}

	// Send to all spectators
	for _, conn := range gs.Spectators {
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
	config     *config.Config
}

// NewGameServerRequest represents request to create a new game server
type NewGameServerRequest struct {
	EventStore eventstore.EventStore
	Logger     *logger.Logger
	Config     *config.Config
}

// NewGameServer creates a new game server
func NewGameServer(req NewGameServerRequest) *GameServer {
	log := req.Logger
	if log == nil {
		log = logger.NewNopLogger()
	}
	if req.Config == nil {
		cfg := config.LoadConfig()
		req.Config = &cfg
	}
	return &GameServer{
		Sessions:   make(map[string]*GameSession),
		EventStore: req.EventStore,
		Logger:     log,
		config:     req.Config,
	}
}

// CreateSession creates a new game session
func (gs *GameServer) CreateSession(sessionID string, numPlayers int, seed int64, aiPlayer game.AIStrategy) *GameSession {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	session := NewGameSession(sessionID, numPlayers, seed, gs.config.DefaultTurnTimeoutInSeconds, aiPlayer, gs.Logger)
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

	for range ticker.C {
		session, exists := gs.GetSession(sessionID)
		if !exists {
			return // Session already deleted
		}

		session.mu.RLock()
		hasPlayers := len(session.Connections) > 0
		hasSpectators := len(session.Spectators) > 0
		lastActivity := session.LastActivity
		session.mu.RUnlock()

		// If no players or spectators and last activity was more than 5 minutes ago, delete
		if !hasPlayers && !hasSpectators {
			timeSinceActivity := time.Since(lastActivity)
			if timeSinceActivity >= 5*time.Minute {
				gs.Logger.Info("Deleting empty room", zap.String("sessionID", sessionID))
				gs.mu.Lock()
				delete(gs.Sessions, sessionID)
				gs.mu.Unlock()
				return
			}
		} else {
			// Update last activity if players or spectators are present
			session.mu.Lock()
			session.LastActivity = time.Now()
			session.mu.Unlock()
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

// handleAIDiscard handles the discard action when AI has pending discards
func (gs *GameSession) handleAIDiscard(player *game.Player) {
	discardResources := game.NewResources()
	remaining := player.PendingDiscard
	for _, crystalType := range []game.CrystalType{game.Yellow, game.Green, game.Blue, game.Pink} {
		available := player.Resources.Get(crystalType)
		toDiscard := min(available, remaining)
		discardResources.Add(crystalType, toDiscard)
		remaining -= toDiscard
		if remaining <= 0 {
			break
		}
	}
	discardAction := game.Action{
		Type:             game.Discard,
		DiscardResources: discardResources,
	}
	gs.GameState.ExecuteAction(discardAction)
	gs.BroadcastState()
}

// storeGameEvent stores an action in the event store
func (gs *GameSession) storeGameEvent(playerID int, action game.Action) {
	if gs.EventStore != nil {
		req := eventstore.StoreEventRequest{
			GameID:    gs.ID,
			PlayerID:  playerID,
			Action:    action,
			GameState: gs.GameState,
		}
		resp := gs.EventStore.StoreEvent(req)
		if resp.Error != nil {
			// Don't fail the action if event store fails
		}
	}
}

// advanceTurn advances to the next turn and resets the timer
func (gs *GameSession) advanceTurn() {
	if !gs.GameState.GameOver {
		currentPlayer := gs.GameState.GetCurrentPlayer()
		if currentPlayer.PendingDiscard == 0 {
			gs.GameState.NextTurn()
			// Reset turn timer for next player
			gs.mu.Lock()
			gs.TurnStartTime = time.Now()
			gs.mu.Unlock()
		}
	}
}

// executeAITurn executes a single AI turn with proper error handling
func (gs *GameSession) executeAITurn(player *game.Player) {
	aiAction := gs.Engine.AI.ChooseAction(player, gs.GameState.Market, gs.GameState)
	if err := gs.GameState.ExecuteAction(aiAction); err == nil {
		gs.storeGameEvent(player.ID, aiAction)
		gs.GameState.CheckGameOver()
		gs.advanceTurn()
		gs.BroadcastState()
	} else {
		// If AI action fails, try rest
		gs.GameState.ExecuteAction(game.Action{Type: game.Rest})
		gs.GameState.CheckGameOver()
		gs.advanceTurn()
		gs.BroadcastState()
	}
}

// RunGameLoop runs the game loop for a session
func (gs *GameSession) RunGameLoop() {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	// Initialize AI for timeout handling
	if gs.Engine.AI == nil {
		gs.Engine.AI = game.NewAIPlayer(gs.GameState.RNG)
	}

	// Set the start time for the first turn
	gs.mu.Lock()
	gs.TurnStartTime = time.Now()
	gs.mu.Unlock()

	for !gs.GameState.GameOver {
		select {
		case action := <-gs.ActionChan:
			// Process player action
			currentPlayer := gs.GameState.GetCurrentPlayer()
			if action.PlayerID == currentPlayer.ID {
				if err := gs.GameState.ExecuteAction(action.Action); err == nil {
					gs.storeGameEvent(action.PlayerID, action.Action)
					gs.GameState.CheckGameOver()
					gs.advanceTurn()
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
			currentPlayer := gs.GameState.GetCurrentPlayer()

			// Check for turn timeout (only for human players)
			gs.mu.RLock()
			turnDuration := time.Since(gs.TurnStartTime)
			timeout := gs.TurnTimeout
			gs.mu.RUnlock()

			if gs.GameState.Round == 1 && gs.GameState.CurrentTurn == 0 {
				// Skip timeout check for first turn to allow setup
				continue
			}
			gs.logger.Debug("Checking turn timeout", zap.Bool("isAI", currentPlayer.IsAI), zap.Int("playerID", currentPlayer.ID), zap.Duration("turnDuration", turnDuration), zap.Duration("timeout", timeout))
			if !currentPlayer.IsAI && turnDuration >= timeout {
				gs.logger.Info("[1] AI taking action", zap.Duration("turnDuration", turnDuration), zap.Duration("timeout", timeout))
				// Timeout! Let AI make the move
				gs.handleTurnTimeout(currentPlayer)
				continue
			}

			// Check if current player is AI
			if currentPlayer.IsAI && gs.Engine.AI != nil {
				gs.logger.Info("[2] AI taking action", zap.Duration("turnDuration", turnDuration), zap.Duration("timeout", timeout))
				// AI turn - execute AI action with a small delay for UX
				time.Sleep(500 * time.Millisecond)

				// AI chooses action (including discard if needed)
				gs.executeAITurn(currentPlayer)
			}
		}
	}

	// Game over - send final state
	gs.BroadcastState()
}

// handleTurnTimeout handles the case when a player's turn times out
func (gs *GameSession) handleTurnTimeout(player *game.Player) {
	// Send timeout notification to all clients
	timeoutMsg := map[string]interface{}{
		"type":     "turnTimeout",
		"playerID": player.ID,
		"message":  fmt.Sprintf("%s took too long. AI is making a move.", player.Name),
	}
	if data, err := json.Marshal(timeoutMsg); err == nil {
		gs.Broadcast(data)
	}

	// Small delay so the notification is visible
	time.Sleep(500 * time.Millisecond)

	// Let AI make the move (it will handle discard if needed)
	gs.executeAITurn(player)
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
			"caravan":        resourcesMap,
			"points":         p.GetPoints(),
			"hand":           serializeCards(p.Hand),
			"playedCards":    serializeCards(p.PlayedCards),
			"pointCards":     serializeCards(p.PointCards),
			"coins":          serializeCards(p.Coins),
			"hasRested":      p.HasRested,
			"isAI":           p.IsAI,
			"pendingDiscard": p.PendingDiscard,
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
		"type":            "state",
		"currentTurn":     gs.GameState.CurrentTurn,
		"currentPlayer":   gs.GameState.GetCurrentPlayer().ID,
		"round":           gs.GameState.Round,
		"gameOver":        gs.GameState.GameOver,
		"lastRound":       gs.GameState.LastRound,
		"winner":          gs.getWinnerInfo(),
		"players":         players,
		"maxChatMessages": gs.maxChatMsgs,
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
