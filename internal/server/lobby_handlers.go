package server

import (
	"encoding/json"
	"net/http"
)

// HandleLobbyState returns the current lobby state
func (gs *GameServer) HandleLobbyState(w http.ResponseWriter, r *http.Request) {
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

	lobbyState := session.SerializeLobbyState()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lobbyState)
}

// HandleSetSlotAI sets a lobby slot to an AI player
func (gs *GameServer) HandleSetSlotAI(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		SessionID string `json:"sessionID"`
		SlotIndex int    `json:"slotIndex"`
		AIType    AIType `json:"aiType"`
		PlayerID  int    `json:"playerID"` // Requester player ID (must be host)
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	session, ok := gs.GetSession(req.SessionID)
	if !ok {
		sendJSONError(w, http.StatusNotFound, "Session not found")
		return
	}

	if err := session.SetSlotAI(req.SlotIndex, req.AIType, req.PlayerID); err != nil {
		sendJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Broadcast updated lobby state to all connected players
	session.BroadcastLobbyState()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "AI slot configured",
	})
}

// HandleClearSlot clears a lobby slot
func (gs *GameServer) HandleClearSlot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		SessionID string `json:"sessionID"`
		SlotIndex int    `json:"slotIndex"`
		PlayerID  int    `json:"playerID"` // Requester player ID (must be host)
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	session, ok := gs.GetSession(req.SessionID)
	if !ok {
		sendJSONError(w, http.StatusNotFound, "Session not found")
		return
	}

	if err := session.ClearSlot(req.SlotIndex, req.PlayerID); err != nil {
		sendJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Broadcast updated lobby state to all connected players
	session.BroadcastLobbyState()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Slot cleared",
	})
}

// HandleStartGame starts the game from the lobby
func (gs *GameServer) HandleStartGame(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		SessionID string `json:"sessionID"`
		PlayerID  int    `json:"playerID"` // Requester player ID (must be host)
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	session, ok := gs.GetSession(req.SessionID)
	if !ok {
		sendJSONError(w, http.StatusNotFound, "Session not found")
		return
	}

	// Only host can start the game
	session.mu.RLock()
	hostPlayerID := session.LobbyState.HostPlayerID
	session.mu.RUnlock()

	if req.PlayerID != hostPlayerID {
		sendJSONError(w, http.StatusForbidden, "Only host can start the game")
		return
	}

	if err := session.StartGame(); err != nil {
		sendJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Broadcast game started message
	gameStartedMsg := map[string]interface{}{
		"type":    "gameStarted",
		"message": "Game has started!",
	}
	if data, err := json.Marshal(gameStartedMsg); err == nil {
		session.Broadcast(data)
	}

	// Send initial game state to all players
	state := session.SerializeState()
	if data, err := json.Marshal(state); err == nil {
		session.Broadcast(data)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Game started",
	})
}
