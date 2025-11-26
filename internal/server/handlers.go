package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
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

			var gameAction game.Action
			switch actionTypeStr {
			case "playCard":
				gameAction = game.Action{
					Type:      game.PlayCard,
					CardIndex: int(cardIndex),
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
