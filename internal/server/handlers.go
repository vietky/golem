package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"golem_century/internal/game"

	"github.com/gorilla/websocket"
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

	if sessionID == "" {
		sendJSONError(w, http.StatusBadRequest, "Missing session ID")
		return
	}

	session, ok := gs.GetSession(sessionID)
	if !ok {
		sendJSONError(w, http.StatusNotFound, "Session not found")
		return
	}

	// Auto-assign player ID if not provided or if slot is taken
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

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

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
					Type:      game.AcquireCard,
					CardIndex: int(cardIndex),
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
			case "discardCrystals":
				discardMap, _ := actionMsg["discard"].(map[string]interface{})
				getInt := func(m map[string]interface{}, key string) int {
					if val, exists := m[key]; exists {
						if f, ok := val.(float64); ok {
							return int(f)
						}
					}
					return 0
				}
				discard := &game.Resources{
					Yellow: getInt(discardMap, "yellow"),
					Green:  getInt(discardMap, "green"),
					Blue:   getInt(discardMap, "blue"),
					Pink:   getInt(discardMap, "pink"),
				}
				gameAction = game.Action{
					Type:    game.DiscardCrystals,
					Discard: discard,
				}
			case "depositCrystals":
				depositsMap, _ := actionMsg["deposits"].(map[string]interface{})
				targetPos, _ := actionMsg["targetPosition"].(float64)
				deposits := make(map[int][]game.CrystalType)
				for posStr, crystalStr := range depositsMap {
					pos, _ := strconv.Atoi(posStr)
					crystalName, _ := crystalStr.(string)
					var crystalType game.CrystalType
					switch crystalName {
					case "yellow":
						crystalType = game.Yellow
					case "green":
						crystalType = game.Green
					case "blue":
						crystalType = game.Blue
					case "pink":
						crystalType = game.Pink
					default:
						continue
					}
					// Wrap single crystal in array to support stacking
					deposits[pos] = []game.CrystalType{crystalType}
				}
				gameAction = game.Action{
					Type:           game.DepositCrystals,
					CardIndex:      int(cardIndex),
					Deposits:       deposits,
					TargetPosition: int(targetPos),
				}
			case "collectCrystals":
				positionsArr, _ := actionMsg["positions"].([]interface{})
				positions := make([]int, 0, len(positionsArr))
				for _, pos := range positionsArr {
					if f, ok := pos.(float64); ok {
						positions = append(positions, int(f))
					}
				}
				gameAction = game.Action{
					Type:             game.CollectCrystals,
					CardIndex:        int(cardIndex),
					CollectPositions: positions,
				}
			case "collectAllCrystals":
				gameAction = game.Action{
					Type:      game.CollectAllCrystals,
					CardIndex: int(cardIndex),
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
	if r.Method != http.MethodPost {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		NumPlayers int    `json:"numPlayers"`
		Seed       int64  `json:"seed"`
		SessionID  string `json:"sessionID"` // Optional custom session ID
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	if req.NumPlayers < 2 || req.NumPlayers > 4 {
		sendJSONError(w, http.StatusBadRequest, "Invalid number of players")
		return
	}

	if req.Seed == 0 {
		req.Seed = time.Now().UnixNano()
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
		sessionID = fmt.Sprintf("session_%d", time.Now().UnixNano())
	}

	_ = gs.CreateSession(sessionID, req.NumPlayers, req.Seed)

	response := map[string]interface{}{
		"sessionID":  sessionID,
		"numPlayers": req.NumPlayers,
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
	gs.mu.RLock()
	defer gs.mu.RUnlock()

	sessions := make([]map[string]interface{}, 0)
	for sessionID, session := range gs.Sessions {
		session.mu.RLock()
		connectedPlayers := len(session.Connections)
		maxPlayers := len(session.GameState.Players)
		isFull := connectedPlayers >= maxPlayers
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
		if timeUntilDelete > 0 && connectedPlayers == 0 {
			timeUntilDeleteSeconds = int64(timeUntilDelete.Seconds())
		}

		session.mu.RUnlock()

		// Only show active, non-full, non-game-over sessions
		if !isFull && !isGameOver {
			sessions = append(sessions, map[string]interface{}{
				"sessionID":        sessionID,
				"numPlayers":       maxPlayers,
				"connectedPlayers": connectedPlayers,
				"players":          playerNames,
				"status":           "open",
				"timeUntilDelete":  timeUntilDeleteSeconds, // Seconds until auto-delete (only if empty)
			})
		}
	}

	response := map[string]interface{}{
		"sessions": sessions,
		"count":    len(sessions),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
