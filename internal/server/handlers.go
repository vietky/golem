package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"slices"
	"strings"
	"time"

	"golem_century/internal/game"
	"golem_century/internal/session"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

// sendJSONError sends a JSON error response
func sendJSONError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error":  message,
		"status": "error",
	})
}

// HandleWebSocket handles WebSocket connections
func (gs *GameServer) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session")
	playerIDStr := r.URL.Query().Get("player")
	playerName := r.URL.Query().Get("name")
	spectateMode := r.URL.Query().Get("spectate") == "true"

	gs.Logger.Info("🔌 WebSocket connection attempt",
		zap.String("sessionID", sessionID),
		zap.String("playerID", playerIDStr),
		zap.String("playerName", playerName),
		zap.Bool("spectateMode", spectateMode),
		zap.String("remoteAddr", r.RemoteAddr),
		zap.String("userAgent", r.UserAgent()),
	)

	if sessionID == "" {
		gs.Logger.Warn("❌ WebSocket rejected: Missing session ID")
		sendJSONError(w, http.StatusBadRequest, "Missing session ID")
		return
	}

	if isSessionV2(sessionID) {
		gs.Logger.Debug("Routing to WebSocket V2 handler")
		gs.HandleWebSocketV2(w, r)
		return
	}

	session, ok := gs.GetSession(sessionID)
	if !ok {
		gs.Logger.Warn("❌ WebSocket rejected: Session not found", zap.String("sessionID", sessionID))
		sendJSONError(w, http.StatusNotFound, "Session not found")
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		gs.Logger.Error("❌ WebSocket upgrade failed", zap.Error(err))
		return
	}
	defer conn.Close()

	gs.Logger.Info("✅ WebSocket upgraded successfully", zap.String("sessionID", sessionID))

	// Handle spectator mode
	if spectateMode {
		spectatorID := fmt.Sprintf("spectator_%d", time.Now().UnixNano())
		if playerName == "" {
			playerName = "Spectator"
		}

		session.AddSpectator(spectatorID, playerName, conn)
		defer session.RemoveSpectator(spectatorID)

		// Send spectator assignment
		assignedMsg := map[string]interface{}{
			"type":        "spectatorAssigned",
			"spectatorID": spectatorID,
			"isSpectator": true,
		}
		if data, err := json.Marshal(assignedMsg); err == nil {
			conn.WriteMessage(websocket.TextMessage, data)
		}

		// Send initial state
		state := session.SerializeState()
		if data, err := json.Marshal(state); err == nil {
			conn.WriteMessage(websocket.TextMessage, data)
		}

		// Notify all users that a spectator joined
		session.BroadcastPlayerJoined(0, playerName, "", true)

		// Keep connection alive (spectators don't send actions)
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				log.Printf("Spectator read error: %v", err)
				break
			}
		}
		return
	}

	// Regular player join logic
	var playerID int
	if playerIDStr != "" {
		if _, err := fmt.Sscanf(playerIDStr, "%d", &playerID); err != nil {
			sendJSONError(w, http.StatusBadRequest, "Invalid player ID")
			return
		}
		// Check if this player ID is already taken
		session.mu.RLock()
		_, taken := session.Connections[playerID]
		session.mu.RUnlock()
		if taken {
			playerID = 0 // Force auto-assign
		}
	}

	// Auto-assign next available player ID
	if playerID == 0 {
		session.mu.RLock()
		maxPlayers := len(session.GameState.Players)
		for i := 1; i <= maxPlayers; i++ {
			if _, exists := session.Connections[i]; !exists {
				playerID = i
				break
			}
		}
		session.mu.RUnlock()

		if playerID == 0 {
			sendJSONError(w, http.StatusForbidden, "Game is full")
			return
		}
	}

	// Validate player ID is within bounds
	if playerID < 1 || playerID > len(session.GameState.Players) {
		sendJSONError(w, http.StatusBadRequest, "Invalid player ID")
		return
	}

	// Add player to session
	if playerName == "" {
		playerName = fmt.Sprintf("Player %d", playerID)
	}
	playerAvatar := r.URL.Query().Get("avatar")
	session.AddPlayer(playerID, playerName, playerAvatar, conn)

	// Send assigned player ID back to client
	assignedMsg := map[string]interface{}{
		"type":     "playerAssigned",
		"playerID": playerID,
	}
	if data, err := json.Marshal(assignedMsg); err == nil {
		conn.WriteMessage(websocket.TextMessage, data)
	}

	// Send initial state
	state := session.SerializeState()
	if data, err := json.Marshal(state); err == nil {
		conn.WriteMessage(websocket.TextMessage, data)
	}

	// Notify all users (players and spectators) that a player joined
	session.BroadcastPlayerJoined(playerID, playerName, playerAvatar, false)

	// Broadcast updated state to all players so they see the new player's name
	session.BroadcastState()

	// Handle incoming messages
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Read error: %v", err)
			break
		}

		var actionMsg map[string]interface{}
		if err := json.Unmarshal(message, &actionMsg); err != nil {
			log.Printf("Invalid message: %v", err)
			continue
		}

		actionType, ok := actionMsg["type"].(string)
		if !ok {
			continue
		}

		switch actionType {
		case "chat":
			// Handle chat message
			message, _ := actionMsg["message"].(string)
			if message != "" {
				// Get player name
				session.mu.RLock()
				playerName := session.PlayerNames[playerID]
				if playerName == "" {
					playerName = fmt.Sprintf("Player %d", playerID)
				}
				session.mu.RUnlock()

				// Broadcast chat message to all players
				chatMsg := map[string]interface{}{
					"type":      "chat",
					"player":    playerName,
					"playerID":  playerID,
					"message":   message,
					"timestamp": time.Now().Unix(),
				}
				if data, err := json.Marshal(chatMsg); err == nil {
					session.Broadcast(data)
				}
			}
		case "action":
			actionTypeStr, _ := actionMsg["actionType"].(string)
			cardIndex, _ := actionMsg["cardIndex"].(float64)

			// Parse input and output resources if present
			var inputResources *game.Resources
			var outputResources *game.Resources

			if inputRes, ok := actionMsg["inputResources"].(map[string]interface{}); ok {
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

			if outputRes, ok := actionMsg["outputResources"].(map[string]interface{}); ok {
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
			if mult, ok := actionMsg["multiplier"].(float64); ok {
				multiplier = int(mult)
				if multiplier < 1 {
					multiplier = 1
				}
			}

			// Parse deposit list if present (for acquireCard action)
			var depositList []game.DepositData
			if deposits, ok := actionMsg["deposits"].([]interface{}); ok {
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
				if discardRes, ok := actionMsg["discardResources"].(map[string]interface{}); ok {
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
				continue
			}

			session.ActionChan <- PlayerAction{
				PlayerID: playerID,
				Action:   gameAction,
			}
		}
	}

	session.RemovePlayer(playerID)
}

func (gs *GameServer) HandleWebSocketV2(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session")
	playerIDStr := r.URL.Query().Get("player")
	playerName := r.URL.Query().Get("name")
	spectateMode := r.URL.Query().Get("spectate") == "true"
	playerAvatar := r.URL.Query().Get("avatar")
	clientID := r.URL.Query().Get("clientID")

	log := gs.Logger.With(
		zap.String("sessionID", sessionID),
		zap.String("playerID", playerIDStr),
		zap.String("clientID", clientID),
		zap.String("playerName", playerName),
		zap.Bool("spectateMode", spectateMode),
		zap.String("remoteAddr", r.RemoteAddr),
	)
	log.Info("🔌 WebSocket V2 connection attempt")

	if sessionID == "" {
		log.Warn("❌ WebSocket rejected: Missing session ID")
		sendJSONError(w, http.StatusBadRequest, "Missing session ID")
		return
	}

	session, ok := gs.GetSessionV2(sessionID)
	if !ok {
		log.Warn("❌ WebSocket rejected: Session not found")
		sendJSONError(w, http.StatusNotFound, "Session not found")
		return
	}

	var playerID int
	if playerIDStr != "" {
		if _, err := fmt.Sscanf(playerIDStr, "%d", &playerID); err != nil {
			log.Warn("❌ WebSocket rejected: Invalid player ID", zap.Error(err))
			sendJSONError(w, http.StatusBadRequest, "Invalid player ID")
			return
		}
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error("❌ WebSocket upgrade failed", zap.Error(err))
		return
	}
	// defer conn.Close()

	log.Info("✅ WebSocket upgraded successfully")

	// Handle spectator mode
	if spectateMode {
		log.Info("Adding spectator to session")
		err = session.AddSpectator(playerName, conn)
		if err != nil {
			log.Error("❌ Failed to add spectator to session", zap.Error(err))
			// Send error message to client before closing
			errorMsg := map[string]interface{}{
				"type":  "error",
				"error": fmt.Sprintf("Failed to join as spectator: %v", err),
			}
			if data, _ := json.Marshal(errorMsg); data != nil {
				conn.WriteMessage(websocket.TextMessage, data)
			}
			conn.Close()
		}
		return
	}

	log.Info("Adding player to session")
	err = session.AddPlayer(playerID, clientID, playerName, playerAvatar, conn)
	if err != nil {
		log.Error("❌ Failed to add player to session", zap.Error(err))
		// Send error message to client before closing
		errorMsg := map[string]interface{}{
			"type":  "error",
			"error": fmt.Sprintf("Failed to join game: %v", err),
		}
		if data, _ := json.Marshal(errorMsg); data != nil {
			conn.WriteMessage(websocket.TextMessage, data)
		}
		conn.Close()
	}
}

// HandleCreateSession creates a new game session
func (gs *GameServer) HandleCreateSession(w http.ResponseWriter, r *http.Request) {
	// Allow CORS preflight
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		NumPlayers  int    `json:"numPlayers"`
		Seed        int64  `json:"seed"`
		SessionID   string `json:"sessionID"`   // Optional custom session ID
		TurnTimeout int    `json:"turnTimeout"` // Optional turn timeout in seconds (default 60)
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	if req.NumPlayers < 2 || req.NumPlayers > 5 {
		sendJSONError(w, http.StatusBadRequest, "Invalid number of players")
		return
	}

	if req.Seed == 0 {
		req.Seed = time.Now().UnixNano()
	}

	// Default turn timeout to 60 seconds if not specified or invalid
	if req.TurnTimeout <= 0 {
		req.TurnTimeout = gs.config.DefaultTurnTimeoutInSeconds
	}

	// Use custom session ID if provided, otherwise generate one
	var sessionID string
	if req.SessionID != "" {
		// Check if session already exists
		if gs.checkSessionExists(req.SessionID) {
			sendJSONError(w, http.StatusConflict, "Session ID already exists")
			return
		}
		sessionID = req.SessionID
	} else {
		sessionID = fmt.Sprintf("session_%d", time.Now().UnixNano())
	}

	if isSessionV2(sessionID) {
		gs.CreateSessionV2(sessionID, req.NumPlayers, game.NewRestOnlyAI(), req.TurnTimeout)

		response := map[string]any{
			"sessionID":   sessionID,
			"numPlayers":  req.NumPlayers,
			"turnTimeout": req.TurnTimeout,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

		return
	}

	session := gs.CreateSession(sessionID, req.NumPlayers, req.Seed, game.NewRestOnlyAI())

	// Set custom turn timeout if specified
	session.mu.Lock()
	session.TurnTimeout = time.Duration(req.TurnTimeout) * time.Second
	session.mu.Unlock()

	response := map[string]interface{}{
		"sessionID":   sessionID,
		"numPlayers":  req.NumPlayers,
		"turnTimeout": req.TurnTimeout,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (gs *GameServer) HandleStartGame(w http.ResponseWriter, r *http.Request) {
	// Allow CORS preflight
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		SessionID string `json:"sessionID"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	if !isSessionV2(req.SessionID) {
		sendJSONError(w, http.StatusBadRequest, "Start game is only supported for v2 sessions")
		return
	}

	session, ok := gs.GetSessionV2(req.SessionID)
	if !ok {
		sendJSONError(w, http.StatusNotFound, "Session not found")
		return
	}
	if err := session.StartGame(); err != nil {
		sendJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"sessionID": session.ID, "status": "success"})
}

// HandleJoinSession handles joining an existing session
func (gs *GameServer) HandleJoinSession(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session")
	if sessionID == "" {
		sendJSONError(w, http.StatusBadRequest, "Missing session ID")
		return
	}

	session, ok := gs.GetSession(sessionID)
	if !ok {
		sendJSONError(w, http.StatusNotFound, "Session not found")
		return
	}

	// Return session info
	response := map[string]interface{}{
		"sessionID":  sessionID,
		"status":     "ready",
		"numPlayers": len(session.GameState.Players),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleListSessions lists all active game sessions
func (gs *GameServer) HandleListSessions(w http.ResponseWriter, r *http.Request) {
	// Check for client ID from cookie, generate and set if not present
	clientID := getClientIDFromCookie(w, r)
	if clientID == "" {
		// Generate a new unique client ID
		clientID = fmt.Sprintf("client_%d", time.Now().UnixNano())
		setClientIDToCookie(w, r, clientID)
	}

	gs.mu.RLock()
	defer gs.mu.RUnlock()

	sessions := make([]map[string]interface{}, 0)

	// Process v1 sessions
	for sessionID, session := range gs.Sessions {
		session.mu.RLock()
		connectedPlayers := len(session.Connections)
		spectatorCount := len(session.Spectators)
		maxPlayers := len(session.GameState.Players)
		// isFull := connectedPlayers >= maxPlayers
		isGameOver := session.GameState.GameOver

		// Get player names
		playerNames := make([]string, 0)
		for i := 1; i <= maxPlayers; i++ {
			if name, exists := session.PlayerNames[i]; exists {
				playerNames = append(playerNames, name)
			}
		}

		timeSinceActivity := time.Since(session.LastActivity)
		timeUntilDelete := 5*time.Minute - timeSinceActivity
		var timeUntilDeleteSeconds int64
		if timeUntilDelete > 0 && connectedPlayers == 0 && spectatorCount == 0 {
			timeUntilDeleteSeconds = int64(timeUntilDelete.Seconds())
		}

		session.mu.RUnlock()

		// Only show active, non-full, non-game-over sessions
		if !isGameOver {
			sessions = append(sessions, map[string]interface{}{
				"sessionID":        sessionID,
				"numPlayers":       maxPlayers,
				"connectedPlayers": connectedPlayers,
				"spectatorCount":   spectatorCount,
				"players":          playerNames,
				"status":           "open",
				"timeUntilDelete":  timeUntilDeleteSeconds, // Seconds until auto-delete (only if empty)
			})
		}
	}

	// Process v2 sessions
	for sessionID, ss := range gs.SessionsV2 {
		connectedPlayers := ss.GetConnectedPlayersCount()
		spectatorCount := ss.GetConnectedSpectatorsCount()
		maxPlayers := ss.GetMaxPlayers()
		playerNames := ss.GetPlayerNames()

		isGameOver := ss.GetStatus() == session.GameStatusEnded

		timeSinceActivity := time.Since(ss.LastActivity)
		timeUntilDelete := 5*time.Minute - timeSinceActivity
		var timeUntilDeleteSeconds int64
		if timeUntilDelete > 0 && connectedPlayers == 0 && spectatorCount == 0 {
			timeUntilDeleteSeconds = int64(timeUntilDelete.Seconds())
		}

		// Only show active, non-game-over sessions
		if !isGameOver {
			sessions = append(sessions, map[string]interface{}{
				"sessionID":        sessionID,
				"numPlayers":       maxPlayers,
				"connectedPlayers": connectedPlayers,
				"spectatorCount":   spectatorCount,
				"players":          playerNames,
				"status":           ss.GetStatus(),
				"timeUntilDelete":  timeUntilDeleteSeconds, // Seconds until auto-delete (only if empty)
			})
		}
	}

	// Sort sessions by creation time to avoid flickering effect in the UI
	slices.SortFunc(sessions, func(a, b map[string]interface{}) int {
		aTimeUntilDelete, _ := a["timeUntilDelete"].(int64)
		bTimeUntilDelete, _ := b["timeUntilDelete"].(int64)
		return int(aTimeUntilDelete - bTimeUntilDelete)
	})

	response := map[string]interface{}{
		"sessions": sessions,
		"count":    len(sessions),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleCreateSinglePlayer creates a single-player game with AI opponents
func (gs *GameServer) HandleCreateSinglePlayer(w http.ResponseWriter, r *http.Request) {
	// Allow CORS preflight
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		NumAI       int    `json:"numAI"` // Number of AI opponents (1-3)
		Seed        int64  `json:"seed"`
		SessionID   string `json:"sessionID"`   // Optional custom session ID
		TurnTimeout int    `json:"turnTimeout"` // Optional turn timeout in seconds (default 60)
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	// Validate number of AI opponents (player + AI = 2-4 total)
	if req.NumAI < 1 || req.NumAI > 4 {
		sendJSONError(w, http.StatusBadRequest, "Number of AI opponents must be 1-4")
		return
	}

	if req.Seed == 0 {
		req.Seed = time.Now().UnixNano()
	}

	// Default turn timeout to 60 seconds if not specified or invalid
	gs.Logger.Info("Default turn timeout:", zap.Int("turnTimeout", gs.config.DefaultTurnTimeoutInSeconds))
	if req.TurnTimeout <= 0 {
		req.TurnTimeout = gs.config.DefaultTurnTimeoutInSeconds
	}

	// Use custom session ID if provided, otherwise generate one
	var sessionID string
	if req.SessionID != "" {
		// Check if session already exists
		if _, exists := gs.GetSession(req.SessionID); exists {
			sendJSONError(w, http.StatusConflict, "Session ID already exists")
			return
		}
		sessionID = req.SessionID
	} else {
		sessionID = fmt.Sprintf("single_%d", time.Now().UnixNano())
	}

	// Total players = 1 human + numAI
	totalPlayers := 1 + req.NumAI

	// Initialize AI in the engine
	session := gs.CreateSession(sessionID, totalPlayers, req.Seed, nil)

	// Set custom turn timeout if specified
	session.mu.Lock()
	session.TurnTimeout = time.Duration(req.TurnTimeout) * time.Second
	session.mu.Unlock()

	// Mark AI players (all except first player which is human)
	session.mu.Lock()
	for i := 1; i < totalPlayers; i++ {
		session.GameState.Players[i].IsAI = true
		session.GameState.Players[i].Name = fmt.Sprintf("AI Player %d", i+1)
	}
	session.mu.Unlock()

	response := map[string]interface{}{
		"sessionID":   sessionID,
		"numPlayers":  totalPlayers,
		"numAI":       req.NumAI,
		"mode":        "singlePlayer",
		"turnTimeout": req.TurnTimeout,
	}

	gs.Logger.Info("Created single-player session", zap.String("sessionID", sessionID), zap.Int("numAI", req.NumAI), zap.Int("turnTimeout", req.TurnTimeout), zap.Any("response", response))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func isSessionV2(sessionID string) bool {
	// V2 sessions don't contain "v1" AND don't contain "single_"
	// V1 sessions contain "v1" OR contain "single_"
	return !strings.Contains(sessionID, "v1") && !strings.Contains(sessionID, "single_")
}
