package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"golem_century/internal/game"

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

	if sessionID == "" {
		sendJSONError(w, http.StatusBadRequest, "Missing session ID")
		return
	}

	session, ok := gs.GetSession(sessionID)
	if !ok {
		sendJSONError(w, http.StatusNotFound, "Session not found")
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

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
		NumPlayers  int      `json:"numPlayers"`
		Seed        int64    `json:"seed"`
		SessionID   string   `json:"sessionID"`   // Optional custom session ID
		GameName    string   `json:"gameName"`    // Optional game name
		TurnTimeout int      `json:"turnTimeout"` // Optional turn timeout in seconds (default 60)
		AIPlayers   []string `json:"aiPlayers"`   // List of AI types for specific slots (e.g., ["basic", "", "rest"] means AI in slots 2 and 4)
		HostName    string   `json:"hostName"`    // Name of the host player
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
		if _, exists := gs.GetSession(req.SessionID); exists {
			sendJSONError(w, http.StatusConflict, "Session ID already exists")
			return
		}
		sessionID = req.SessionID
	} else {
		if req.GameName != "" {
			sessionID = req.GameName
		} else {
			sessionID = fmt.Sprintf("session_%d", time.Now().UnixNano())
		}
	}

	// Create AI strategy (default to RestOnlyAI)
	aiStrategy := game.NewRestOnlyAI()
	session := gs.CreateSession(sessionID, req.NumPlayers, req.Seed, aiStrategy)

	// Set custom turn timeout if specified
	session.mu.Lock()
	session.TurnTimeout = time.Duration(req.TurnTimeout) * time.Second

	// Configure AI players based on request
	if len(req.AIPlayers) > 0 {
		for i := 0; i < len(req.AIPlayers) && i < req.NumPlayers; i++ {
			aiType := req.AIPlayers[i]
			if aiType != "" {
				// Mark this player as AI
				session.GameState.Players[i].IsAI = true
				switch aiType {
				case "basic":
					session.GameState.Players[i].Name = fmt.Sprintf("AI (Basic) %d", i+1)
				case "rest":
					session.GameState.Players[i].Name = fmt.Sprintf("AI (Rest) %d", i+1)
				default:
					session.GameState.Players[i].Name = fmt.Sprintf("AI %d", i+1)
				}
			}
		}
	}

	// Store host name in session metadata
	if req.HostName != "" {
		session.PlayerNames[1] = req.HostName
		session.GameState.Players[0].Name = req.HostName
	}

	session.mu.Unlock()

	response := map[string]interface{}{
		"sessionID":   sessionID,
		"numPlayers":  req.NumPlayers,
		"turnTimeout": req.TurnTimeout,
		"gameName":    req.GameName,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
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
	// Get query parameters for filtering
	searchQuery := r.URL.Query().Get("search")
	statusFilter := r.URL.Query().Get("status") // "waiting", "playing", "all"

	gs.mu.RLock()
	defer gs.mu.RUnlock()

	sessions := make([]map[string]interface{}, 0)
	for sessionID, session := range gs.Sessions {
		session.mu.RLock()
		connectedPlayers := len(session.Connections)
		spectatorCount := len(session.Spectators)
		maxPlayers := len(session.GameState.Players)
		isGameOver := session.GameState.GameOver
		gameStarted := session.GameState.CurrentTurn > 0

		// Get player names
		playerNames := make([]string, 0)
		for i := 1; i <= maxPlayers; i++ {
			if name, exists := session.PlayerNames[i]; exists {
				playerNames = append(playerNames, name)
			} else if i <= len(session.GameState.Players) && session.GameState.Players[i-1].IsAI {
				playerNames = append(playerNames, session.GameState.Players[i-1].Name)
			}
		}

		// Get host name (first player)
		hostName := "Unknown"
		if name, exists := session.PlayerNames[1]; exists {
			hostName = name
		} else if len(session.GameState.Players) > 0 {
			hostName = session.GameState.Players[0].Name
		}

		// Calculate time until deletion
		timeSinceActivity := time.Since(session.LastActivity)
		timeUntilDelete := 5*time.Minute - timeSinceActivity
		var timeUntilDeleteSeconds int64
		if timeUntilDelete > 0 && connectedPlayers == 0 && spectatorCount == 0 {
			timeUntilDeleteSeconds = int64(timeUntilDelete.Seconds())
		}

		// Determine game status
		var gameStatus string
		if isGameOver {
			gameStatus = "finished"
		} else if gameStarted {
			gameStatus = "playing"
		} else {
			gameStatus = "waiting"
		}

		session.mu.RUnlock()

		// Apply filters
		if isGameOver {
			continue // Skip finished games
		}

		// Apply status filter
		if statusFilter != "" && statusFilter != "all" && gameStatus != statusFilter {
			continue
		}

		// Apply search filter (search in sessionID, host name, or player names)
		if searchQuery != "" {
			found := false
			searchLower := ""
			for _, char := range searchQuery {
				if char >= 'A' && char <= 'Z' {
					searchLower += string(char + 32)
				} else {
					searchLower += string(char)
				}
			}

			// Check sessionID
			sessionIDLower := ""
			for _, char := range sessionID {
				if char >= 'A' && char <= 'Z' {
					sessionIDLower += string(char + 32)
				} else {
					sessionIDLower += string(char)
				}
			}
			if contains(sessionIDLower, searchLower) {
				found = true
			}

			// Check host name
			if !found {
				hostLower := ""
				for _, char := range hostName {
					if char >= 'A' && char <= 'Z' {
						hostLower += string(char + 32)
					} else {
						hostLower += string(char)
					}
				}
				if contains(hostLower, searchLower) {
					found = true
				}
			}

			// Check player names
			if !found {
				for _, name := range playerNames {
					nameLower := ""
					for _, char := range name {
						if char >= 'A' && char <= 'Z' {
							nameLower += string(char + 32)
						} else {
							nameLower += string(char)
						}
					}
					if contains(nameLower, searchLower) {
						found = true
						break
					}
				}
			}

			if !found {
				continue
			}
		}

		sessions = append(sessions, map[string]interface{}{
			"sessionID":        sessionID,
			"numPlayers":       maxPlayers,
			"connectedPlayers": connectedPlayers,
			"spectatorCount":   spectatorCount,
			"players":          playerNames,
			"host":             hostName,
			"status":           gameStatus,
			"createdAt":        session.CreatedAt.Unix(),
			"timeUntilDelete":  timeUntilDeleteSeconds, // Seconds until auto-delete (only if empty)
		})
	}

	response := map[string]interface{}{
		"sessions": sessions,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Helper function for case-insensitive substring search
func contains(str, substr string) bool {
	if len(substr) == 0 {
		return true
	}
	if len(str) < len(substr) {
		return false
	}
	for i := 0; i <= len(str)-len(substr); i++ {
		match := true
		for j := 0; j < len(substr); j++ {
			if str[i+j] != substr[j] {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
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
		sendJSONError(w, http.StatusBadRequest, "Number of AI opponents must be 1-3")
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
