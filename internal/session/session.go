package session

import (
	"encoding/json"
	"fmt"
	"slices"
	"sync"
	"time"

	"golem_century/internal/eventstore"
	"golem_century/internal/game"
	"golem_century/internal/logger"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

type GameStatus string

const (
	GameStatusWaiting GameStatus = "waiting"
	GameStatusPlaying GameStatus = "playing"
	GameStatusEnded   GameStatus = "ended"
)

type PlayerInfo struct {
	PlayerID int    // in-game player ID, 0 if not assigned
	ClientID string // unique client ID for each unique device
	Conn     *websocket.Conn
	Name     string
	Avatar   string
}

// GameSession represents a multiplayer game session
type GameSession struct {
	ID        string
	GameState *game.GameState
	Engine    *game.Engine
	// Connections    map[int]*websocket.Conn    // Player ID -> WebSocket connection
	Spectators     map[string]*websocket.Conn // Spectator ID -> WebSocket connection
	SpectatorNames map[string]string          // Spectator ID -> Spectator name
	// PlayerNames    map[int]string             // Player ID -> Player name
	// PlayerAvatars  map[int]string             // Player ID -> Avatar number
	CreatedAt     time.Time             // When session was created
	LastActivity  time.Time             // Last time someone was in the room
	EventStore    eventstore.EventStore // Event store for recording actions
	TurnTimeout   time.Duration         // Maximum time per turn (default 60s)
	TurnStartTime time.Time             // When the current turn started
	mu            sync.RWMutex
	ActionChan    chan PlayerAction
	BroadcastChan chan []byte
	logger        *logger.Logger
	maxChatMsgs   int // Max chat messages from config

	MaxPlayers      int
	players         map[string]*PlayerInfo // Client ID -> PlayerInfo (game players)
	assignedPlayers map[int]string         // Player ID -> Client ID
	status          GameStatus
}

// PlayerAction represents an action from a player
type PlayerAction struct {
	PlayerID int
	ClientID string
	Action   game.Action
}

// NewGameSession creates a new game session
func NewGameSession(sessionID string, numPlayers int, seed int64, turnTimeoutInSecond int, aiPlayer game.AIStrategy, eventstore eventstore.EventStore, logger *logger.Logger) *GameSession {
	// gameState := game.NewGameState(numPlayers, seed)
	// if aiPlayer == nil {
	// 	aiPlayer = game.NewAIPlayer(gameState.RNG)
	// }
	// engine := &game.Engine{
	// 	GameState: gameState,
	// 	AI:        aiPlayer,
	// }

	now := time.Now()
	return &GameSession{
		ID: sessionID,
		// GameState: gameState,
		// Engine:    engine,
		// Connections:    make(map[int]*websocket.Conn),
		Spectators:     make(map[string]*websocket.Conn),
		SpectatorNames: make(map[string]string),
		// PlayerNames:    make(map[int]string),
		// PlayerAvatars:  make(map[int]string),
		CreatedAt:     now,
		LastActivity:  now,
		EventStore:    eventstore,
		TurnTimeout:   time.Duration(turnTimeoutInSecond) * time.Second, // Default 60s timeout
		TurnStartTime: now,
		ActionChan:    make(chan PlayerAction, 10),
		BroadcastChan: make(chan []byte, 100),
		logger:        logger,
		maxChatMsgs:   10, // Default, will be set from config

		MaxPlayers:      numPlayers,
		players:         make(map[string]*PlayerInfo),
		assignedPlayers: make(map[int]string),
		status:          GameStatusWaiting,
	}
}

// AddPlayer adds a player to the session
func (gs *GameSession) AddPlayer(playerID int, clientID string, name string, avatar string, conn *websocket.Conn) error {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	if avatar == "" {
		avatar = fmt.Sprintf("%d", playerID) // Default to player ID
	}
	if name == "" {
		name = fmt.Sprintf("Player %d", playerID)
	}
	gs.LastActivity = time.Now() // Update activity time

	log := gs.logger.With(
		zap.String("sessionID", gs.ID),
		zap.String("clientID", clientID),
		zap.Int("playerID", playerID),
	)

	if gs.status == GameStatusWaiting {
		err := gs.addToWaitingList(clientID, name, avatar, conn)
		if err != nil {
			return fmt.Errorf("failed to add player to waiting list: %w", err)
		}
	}

	if gs.status == GameStatusPlaying {
		err := gs.addPlayerToGame(playerID, clientID, name, avatar, conn)
		if err != nil {
			log.Error("failed to add player to game", zap.Error(err))
			if conn != nil {
				conn.Close()
			}
			return fmt.Errorf("failed to add player to game: %w", err)
		}
	}

	go gs.handlePlayerMessage(clientID, conn)

	// Send assigned player ID back to client -> only after the game is started
	// Send initial state -> only after the game is started

	// Notify all users (players and spectators) that a player joined
	// gs.broadcastPlayerJoined(clientID, name, false)

	// Broadcast updated state to all players so they see the new player's name
	// gs.BroadcastState()

	return nil
}

func (gs *GameSession) assignPlayerID() int {
	for i := 1; i <= gs.MaxPlayers; i++ {
		if _, ok := gs.assignedPlayers[i]; !ok {
			return i
		}
	}
	return 0
}

func (gs *GameSession) addPlayerToGame(playerID int, clientID string, name string, avatar string, conn *websocket.Conn) error {
	if gs.status != GameStatusPlaying {
		return fmt.Errorf("game is not playing")
	}
	if len(gs.players) >= gs.MaxPlayers {
		return fmt.Errorf("game is full")
	}

	// check if playerID is already in the players list
	if gs.assignedPlayers[playerID] != "" {
		gs.logger.Warn("playerID already in the players list", zap.Int("playerID", playerID))
		playerID = 0 // auto-assign next available player ID
	}
	if playerID == 0 {
		playerID = gs.assignPlayerID()
		if playerID == 0 {
			return fmt.Errorf("failed to assign player ID, game is full")
		}
	}

	gs.players[clientID] = &PlayerInfo{
		PlayerID: playerID,
		Conn:     conn,
		Name:     name,
		Avatar:   avatar,
		ClientID: clientID,
	}

	assignedMsg := map[string]interface{}{
		"type":     "playerAssigned",
		"playerID": playerID,
	}
	if err := gs.sendToPlayer(clientID, assignedMsg); err != nil {
		return fmt.Errorf("failed to send assigned message to player: %w", err)
	}

	// Broadcast updated state to all players so they see the new player's name
	gs.broadcastPlayerJoined(clientID, playerID, name)
	gs.BroadcastState()

	return nil
}

func (gs *GameSession) addToWaitingList(clientID string, name string, avatar string, conn *websocket.Conn) error {
	// check to remove the player with the same clientID if exists
	gs.removePlayer(clientID)

	if len(gs.players) >= gs.MaxPlayers {
		return fmt.Errorf("waiting list is full")
	}

	gs.players[clientID] = &PlayerInfo{
		ClientID: clientID,
		Conn:     conn,
		Name:     name,
		Avatar:   avatar,
	}
	gs.broadcastPlayerJoined(clientID, 0, name)
	return nil
}

func (gs *GameSession) removePlayer(clientID string) {
	p := gs.players[clientID]
	if p != nil {
		if p.Conn != nil {
			p.Conn.Close()
		}
		delete(gs.players, clientID)
	}
}

func (gs *GameSession) handlePlayerMessage(clientID string, conn *websocket.Conn) {
	log := gs.logger.With(zap.String("clientID", clientID))

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Error("read error", zap.Error(err))
			break
		}

		var req map[string]interface{}
		if err := json.Unmarshal(message, &req); err != nil {
			log.Error("invalid message", zap.Error(err))
			continue
		}

		actionType, ok := req["type"].(string)
		if !ok {
			continue
		}

		switch actionType {
		case "chat":
			gs.handleChatMessage(clientID, req)
		case "action":
			gs.handlePlayerAction(clientID, req)
		}
	}
}

func (gs *GameSession) handleChatMessage(clientID string, req map[string]any) {
	message, _ := req["message"].(string)
	if message == "" {
		return
	}

	// Get player name
	gs.mu.RLock()
	playerName := gs.players[clientID].Name
	gs.mu.RUnlock()

	// Broadcast chat message to all players
	chatMsg := map[string]interface{}{
		"type":   "chat",
		"player": playerName,
		// "playerID":  playerID,
		"message":   message,
		"timestamp": time.Now().Unix(),
	}
	gs.broadcast(chatMsg, clientID)
}

func (gs *GameSession) handlePlayerAction(clientID string, req map[string]any) {
	if gs.status != GameStatusPlaying { // game not started yet
		return
	}
	if _, ok := gs.players[clientID]; !ok { // invalid clientID from obsolete connection
		return
	}

	playerID := gs.players[clientID].PlayerID

	actionTypeStr, _ := req["actionType"].(string)
	cardIndex, _ := req["cardIndex"].(float64)

	// Parse input and output resources if present
	var inputResources *game.Resources
	var outputResources *game.Resources

	if inputRes, ok := req["inputResources"].(map[string]interface{}); ok {
		getInt := func(m map[string]interface{}, key string) int {
			if val, exists := m[key]; exists {
				if f, ok := val.(float64); ok {
					return int(f)
				}
			}
			return 0
		}
		inputResources = &game.Resources{
			Yellow: getInt(inputRes, "yellow"),
			Green:  getInt(inputRes, "green"),
			Blue:   getInt(inputRes, "blue"),
			Pink:   getInt(inputRes, "pink"),
		}
	}

	if outputRes, ok := req["outputResources"].(map[string]interface{}); ok {
		getInt := func(m map[string]interface{}, key string) int {
			if val, exists := m[key]; exists {
				if f, ok := val.(float64); ok {
					return int(f)
				}
			}
			return 0
		}
		outputResources = &game.Resources{
			Yellow: getInt(outputRes, "yellow"),
			Green:  getInt(outputRes, "green"),
			Blue:   getInt(outputRes, "blue"),
			Pink:   getInt(outputRes, "pink"),
		}
	}

	// Parse multiplier if present
	multiplier := 1
	if mult, ok := req["multiplier"].(float64); ok {
		multiplier = int(mult)
		if multiplier < 1 {
			multiplier = 1
		}
	}

	// Parse deposit list if present (for acquireCard action)
	var depositList []game.DepositData
	if deposits, ok := req["deposits"].([]interface{}); ok {
		for _, dep := range deposits {
			if depMap, ok := dep.(map[string]interface{}); ok {
				if crystalStr, ok := depMap["crystal"].(string); ok {
					var crystal game.CrystalType
					switch crystalStr {
					case "yellow":
						crystal = game.Yellow
					case "green":
						crystal = game.Green
					case "blue":
						crystal = game.Blue
					case "pink":
						crystal = game.Pink
					default:
						continue
					}
					depositList = append(depositList, game.DepositData{Crystal: crystal})
				}
			}
		}
	}

	var gameAction game.Action
	switch actionTypeStr {
	case "playCard":
		gameAction = game.Action{
			Type:            game.PlayCard,
			CardIndex:       int(cardIndex),
			Multiplier:      multiplier,
			InputResources:  inputResources,
			OutputResources: outputResources,
		}
	case "acquireCard":
		gameAction = game.Action{
			Type:        game.AcquireCard,
			CardIndex:   int(cardIndex),
			DepositList: depositList,
		}
	case "claimPointCard":
		gameAction = game.Action{
			Type:      game.ClaimPointCard,
			CardIndex: int(cardIndex),
		}
	case "rest":
		gameAction = game.Action{
			Type: game.Rest,
		}
	case "discard":
		// Parse discard resources
		var discardResources *game.Resources
		if discardRes, ok := req["discardResources"].(map[string]interface{}); ok {
			getInt := func(m map[string]interface{}, key string) int {
				if val, exists := m[key]; exists {
					if f, ok := val.(float64); ok {
						return int(f)
					}
				}
				return 0
			}
			discardResources = &game.Resources{
				Yellow: getInt(discardRes, "yellow"),
				Green:  getInt(discardRes, "green"),
				Blue:   getInt(discardRes, "blue"),
				Pink:   getInt(discardRes, "pink"),
			}
		}
		gameAction = game.Action{
			Type:             game.Discard,
			DiscardResources: discardResources,
		}
	default:
		return
	}
	gs.ActionChan <- PlayerAction{
		PlayerID: playerID,
		ClientID: clientID,
		Action:   gameAction,
	}
}

// RemovePlayer removes a player from the session
// func (gs *GameSession) RemovePlayer(playerID int) {
// 	gs.mu.Lock()
// 	defer gs.mu.Unlock()
// 	delete(gs.Connections, playerID)
// 	delete(gs.PlayerNames, playerID)
// 	delete(gs.PlayerAvatars, playerID)
// }

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

// CanBeDeleted checks if the session can be deleted
func (gs *GameSession) CanBeDeleted() bool {
	gs.mu.RLock()
	defer gs.mu.RUnlock()

	hasPlayers := len(gs.players) > 0
	hasSpectators := len(gs.Spectators) > 0
	timeSinceActivity := time.Since(gs.LastActivity)

	return !hasPlayers && !hasSpectators && timeSinceActivity >= 5*time.Minute
}

// GetStatus returns the status of the session
func (gs *GameSession) GetStatus() GameStatus {
	gs.mu.RLock()
	defer gs.mu.RUnlock()
	return gs.status
}

// GetConnectedPlayersCount returns the number of connected players
func (gs *GameSession) GetConnectedPlayersCount() int {
	gs.mu.RLock()
	defer gs.mu.RUnlock()
	return len(gs.players)
}

// GetPlayerNames returns a list of all connected player names
func (gs *GameSession) GetPlayerNames() []string {
	gs.mu.RLock()
	defer gs.mu.RUnlock()

	playerNames := make([]string, 0)
	for _, playerInfo := range gs.players {
		if playerInfo.Name != "" {
			playerNames = append(playerNames, playerInfo.Name)
		}
	}
	return playerNames
}

// broadcastPlayerJoined notifies all users when a player or spectator joins
func (gs *GameSession) broadcastPlayerJoined(clientID string, playerID int, name string) {
	connectedPlayers := len(gs.players)
	spectatorCount := len(gs.Spectators)

	joinMsg := map[string]interface{}{
		"type":       "playerJoined",
		"clientID":   clientID,
		"playerID":   playerID,
		"playerName": name,
		// "avatar":           avatar,
		// "isSpectator":      isSpectator,
		"connectedPlayers": connectedPlayers,
		"spectatorCount":   spectatorCount,
	}
	gs.broadcast(joinMsg)
}

// broadcast sends a message to all connected players and spectators
func (gs *GameSession) broadcast(data any, excludeClientIDs ...string) {
	// gs.mu.RLock()
	// defer gs.mu.RUnlock()

	msg, _ := json.Marshal(data)

	// Send to all players
	for _, player := range gs.players {
		if player.Conn != nil && !slices.Contains(excludeClientIDs, player.ClientID) {
			player.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			player.Conn.WriteMessage(websocket.TextMessage, msg)
		}
	}

	// Send to all spectators
	for _, conn := range gs.Spectators {
		if conn != nil {
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			conn.WriteMessage(websocket.TextMessage, msg)
		}
	}
}

// SendToPlayer sends a message to a specific player
func (gs *GameSession) sendToPlayer(clientID string, data any) error {
	gs.mu.RLock()
	defer gs.mu.RUnlock()

	player := gs.players[clientID]
	if player == nil || player.Conn == nil {
		return nil
	}

	msg, _ := json.Marshal(data)

	player.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	return player.Conn.WriteMessage(websocket.TextMessage, msg)
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
						gs.sendToPlayer(action.ClientID, data)
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
		gs.broadcast(data)
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
	gs.broadcast(data)
}

func (gs *GameSession) getPlayerAvatar(playerID int) string {
	clientID := gs.assignedPlayers[playerID]
	playerInfo := gs.players[clientID]
	if playerInfo == nil || playerInfo.Avatar == "" {
		return fmt.Sprintf("%d", playerID)
	}
	return playerInfo.Avatar
}

// SerializeState serializes the game state for JSON transmission
func (gs *GameSession) SerializeState() map[string]interface{} {
	gs.mu.RLock()
	defer gs.mu.RUnlock()

	players := make([]map[string]interface{}, len(gs.GameState.Players))
	for i, p := range gs.GameState.Players {
		avatar := gs.getPlayerAvatar(p.ID)
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
