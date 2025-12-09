package server

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"golem_century/internal/eventstore"
)

// HandleGetEventsRequest represents a request to get events
type HandleGetEventsRequest struct {
	w http.ResponseWriter
	r *http.Request
}

// HandleGetEvents handles GET /api/events?gameId=xxx&fromSequence=1&limit=100
func (gs *GameServer) HandleGetEvents(w http.ResponseWriter, r *http.Request) {
	gameID := r.URL.Query().Get("gameId")
	if gameID == "" {
		sendJSONError(w, http.StatusBadRequest, "Missing gameId parameter")
		return
	}

	fromSequence := int64(0)
	if fromSeqStr := r.URL.Query().Get("fromSequence"); fromSeqStr != "" {
		if seq, err := strconv.ParseInt(fromSeqStr, 10, 64); err == nil {
			fromSequence = seq
		}
	}

	limit := 100 // Default limit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	if gs.EventStore == nil {
		sendJSONError(w, http.StatusServiceUnavailable, "Event store not available")
		return
	}

	req := eventstore.GetEventsRequest{
		GameID:       gameID,
		FromSequence: fromSequence,
		Limit:        limit,
	}

	resp := gs.EventStore.GetEvents(req)
	if resp.Error != nil {
		log.Printf("Error getting events: %v", resp.Error)
		sendJSONError(w, http.StatusInternalServerError, "Failed to retrieve events")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"events": resp.Events,
		"count":  len(resp.Events),
	})
}

// HandleGetSnapshot handles GET /api/snapshot?gameId=xxx
func (gs *GameServer) HandleGetSnapshot(w http.ResponseWriter, r *http.Request) {
	gameID := r.URL.Query().Get("gameId")
	if gameID == "" {
		sendJSONError(w, http.StatusBadRequest, "Missing gameId parameter")
		return
	}

	if gs.EventStore == nil {
		sendJSONError(w, http.StatusServiceUnavailable, "Event store not available")
		return
	}

	req := eventstore.GetSnapshotRequest{
		GameID: gameID,
	}

	resp := gs.EventStore.GetSnapshot(req)
	if resp.Error != nil {
		log.Printf("Error getting snapshot: %v", resp.Error)
		sendJSONError(w, http.StatusInternalServerError, "Failed to retrieve snapshot")
		return
	}

	if resp.Snapshot == nil {
		sendJSONError(w, http.StatusNotFound, "Snapshot not found")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp.Snapshot)
}

// HandleListGames handles GET /api/games - lists all games with events
func (gs *GameServer) HandleListGames(w http.ResponseWriter, r *http.Request) {
	if gs.EventStore == nil {
		sendJSONError(w, http.StatusServiceUnavailable, "Event store not available")
		return
	}

	// Get list of all game IDs by querying distinct game_ids from events
	// For now, we'll return active sessions
	gs.mu.RLock()
	gameIDs := make([]string, 0, len(gs.Sessions))
	for id := range gs.Sessions {
		gameIDs = append(gameIDs, id)
	}
	gs.mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"games": gameIDs,
		"count": len(gameIDs),
	})
}
