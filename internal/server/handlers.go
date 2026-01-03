package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"time"

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

// HandleWebSocket handles WebSocket connections (routes to V2 handler)
func (gs *GameServer) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session")

	gs.Logger.Info("🔌 WebSocket connection attempt",
		zap.String("sessionID", sessionID),
		zap.String("remoteAddr", r.RemoteAddr),
	)

	if sessionID == "" {
		gs.Logger.Warn("❌ WebSocket rejected: Missing session ID")
		sendJSONError(w, http.StatusBadRequest, "Missing session ID")
		return
	}

	// All sessions are now V2
	gs.Logger.Debug("Routing to WebSocket V2 handler")
	gs.HandleWebSocketV2(w, r)
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
		return
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
		CreatorName string `json:"creatorName"` // Optional creator name for notifications
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

	defer func() {
		gs.Logger.Debug("Created new game session")
		// Send Telegram notification
		if gs.TelegramNotifier.IsEnabled() {
			creatorName := req.CreatorName
			if creatorName == "" {
				creatorName = "Anonymous"
			}
			go func() {
				err := gs.TelegramNotifier.SendRoomCreatedNotification(sessionID, creatorName, req.NumPlayers)
				if err != nil {
					gs.Logger.Warn("Failed to send Telegram notification",
						zap.String("sessionID", sessionID),
						zap.Error(err),
					)
				}
			}()
		}
	}()

	// All sessions are now V2
	gs.CreateSessionV2(sessionID, req.NumPlayers, req.TurnTimeout)

	response := map[string]any{
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

	// All sessions are now V2
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

	session, ok := gs.GetSessionV2(sessionID)
	if !ok {
		sendJSONError(w, http.StatusNotFound, "Session not found")
		return
	}

	// Return session info
	response := map[string]interface{}{
		"sessionID":  sessionID,
		"status":     session.GetStatus(),
		"numPlayers": session.GetMaxPlayers(),
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

	// Process v2 sessions (all sessions are now V2)
	for sessionID, ss := range gs.SessionsV2 {
		connectedPlayers := ss.GetActivelyConnectedPlayersCount()
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
		NumAI       int    `json:"numAI"`       // Number of AI opponents (1-3)
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

	// Default turn timeout to 60 seconds if not specified or invalid
	gs.Logger.Info("Default turn timeout:", zap.Int("turnTimeout", gs.config.DefaultTurnTimeoutInSeconds))
	if req.TurnTimeout <= 0 {
		req.TurnTimeout = gs.config.DefaultTurnTimeoutInSeconds
	}

	// Use custom session ID if provided, otherwise generate one
	var sessionID string
	if req.SessionID != "" {
		// Check if session already exists
		if _, exists := gs.GetSessionV2(req.SessionID); exists {
			sendJSONError(w, http.StatusConflict, "Session ID already exists")
			return
		}
		sessionID = req.SessionID
	} else {
		sessionID = fmt.Sprintf("single_%d", time.Now().UnixNano())
	}

	// Total players = 1 human + numAI
	totalPlayers := 1 + req.NumAI

	gs.CreateSessionV2(sessionID, totalPlayers, req.TurnTimeout)

	response := map[string]interface{}{
		"sessionID":   sessionID,
		"numPlayers":  totalPlayers,
		"numAI":       req.NumAI,
		"mode":        "singlePlayer",
		"turnTimeout": req.TurnTimeout,
	}

	gs.Logger.Info("Created single-player V2 session", zap.String("sessionID", sessionID), zap.Int("numAI", req.NumAI), zap.Int("turnTimeout", req.TurnTimeout), zap.Any("response", response))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
