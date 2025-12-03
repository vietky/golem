package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"golem_century/internal/game"

	"github.com/gorilla/websocket"
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
	Sessions map[string]*GameSession
	mu       sync.RWMutex
}

// NewGameServer creates a new game server
func NewGameServer() *GameServer {
	return &GameServer{
		Sessions: make(map[string]*GameSession),
	}
}

// CreateSession creates a new game session
func (gs *GameServer) CreateSession(sessionID string, numPlayers int, seed int64) *GameSession {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	session := NewGameSession(sessionID, numPlayers, seed)
	gs.Sessions[sessionID] = session

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
					log.Printf("Deleting empty room %s (inactive for %v)", sessionID, timeSinceActivity)
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
					// DepositCrystals and CollectCrystals don't end the turn
					// They are intermediate actions before acquiring a card
					if action.Action.Type != game.DepositCrystals && action.Action.Type != game.CollectCrystals && action.Action.Type != game.CollectAllCrystals {
						gs.GameState.CheckGameOver()
						if !gs.GameState.GameOver {
							gs.GameState.NextTurn()
						}
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
			// No AI processing - all players are human
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
		log.Printf("Error marshaling state: %v", err)
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
		players[i] = map[string]interface{}{
			"id":     p.ID,
			"name":   p.Name,
			"avatar": avatar,
			"resources": map[string]int{
				"yellow": p.Resources.Yellow,
				"green":  p.Resources.Green,
				"blue":   p.Resources.Blue,
				"pink":   p.Resources.Pink,
			},
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
		// Debug: log deposits when serializing - check if field exists
		deposits, hasDeposits := serialized["deposits"]
		if hasDeposits {
			if depositsMap, ok := deposits.(map[string]string); ok {
				if len(depositsMap) > 0 {
					logger.GetLogger().Debug("Market card has deposits",
						zap.Int("cardIndex", i),
						zap.Int("position", i+1),
						zap.Any("deposits", depositsMap))
				} else {
					logger.GetLogger().Debug("Market card has empty deposits",
						zap.Int("cardIndex", i),
						zap.Int("position", i+1))
				}
			} else {
				logger.GetLogger().Warn("Market card deposits field has wrong type",
					zap.Int("cardIndex", i),
					zap.Int("position", i+1),
					zap.String("type", fmt.Sprintf("%T", deposits)))
			}
		} else {
			logger.GetLogger().Warn("Market card missing deposits field",
				zap.Int("cardIndex", i),
				zap.Int("position", i+1))
		}
		// Ensure deposits field exists
		if _, exists := serialized["deposits"]; !exists {
			logger.GetLogger().Debug("Adding missing deposits field",
				zap.String("cardName", card.Name))
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
	if card.Deposits != nil && len(card.Deposits) > 0 {
		depositsMap := make(map[string]string)
		for pos, depositArray := range card.Deposits {
			if len(depositArray) == 0 {
				continue
			}
			posStr := fmt.Sprintf("%d", pos)
			// For each crystal in the array, add to map
			// Since map can only have one value per key, we'll count and store as "crystalType:count"
			// Or we can serialize as array - but frontend expects map[string]string
			// Let's count crystals by type at this position
			crystalCounts := make(map[game.CrystalType]int)
			for _, crystalType := range depositArray {
				crystalCounts[crystalType]++
			}
			// For now, serialize as "crystalType" (frontend will count)
			// Or better: serialize all crystals as comma-separated or array
			// Actually, let's change to map[string][]string to support multiple
			// But that requires frontend changes too. For now, let's use a simple approach:
			// Store as "crystalType1,crystalType2,..." or just the first one with count
			// Convert all crystals in array to comma-separated string
			var crystalNames []string
			for _, crystalType := range depositArray {
				var crystalName string
				switch crystalType {
				case game.Yellow:
					crystalName = "yellow"
				case game.Green:
					crystalName = "green"
				case game.Blue:
					crystalName = "blue"
				case game.Pink:
					crystalName = "pink"
				default:
					continue
				}
				crystalNames = append(crystalNames, crystalName)
			}
			// Store as comma-separated string (frontend will split and count)
			depositsMap[posStr] = strings.Join(crystalNames, ",")
		}
		result["deposits"] = depositsMap
		logger.GetLogger().Debug("Card has deposits",
			zap.String("cardName", card.Name),
			zap.Any("deposits", depositsMap))
	} else {
		// Always include deposits field, even if empty
		result["deposits"] = make(map[string]string)
		logger.GetLogger().Debug("Card has no deposits",
			zap.String(\"cardName\", card.Name))
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
