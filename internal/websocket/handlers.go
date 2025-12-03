package websocket

import (
	"context"
	"fmt"
	"log"

	"golem_century/internal/events"
	"golem_century/internal/game"
)

// PlayCardRequest represents a request to play a card
type PlayCardRequest struct {
	PlayerID   int `json:"playerId"`
	CardIndex  int `json:"cardIndex"`
	Multiplier int `json:"multiplier,omitempty"`
}

// PlayCardResponse represents a response to a play card request
type PlayCardResponse struct {
	Success bool   `json:"success"`
	EventID int64  `json:"eventId,omitempty"`
	Error   string `json:"error,omitempty"`
}

// HandlePlayCard handles a play card request
func (h *Hub) HandlePlayCard(ctx context.Context, gameID string, req PlayCardRequest) PlayCardResponse {
	// Get game engine
	engine, exists := h.GetGameEngine(gameID)
	if !exists {
		return PlayCardResponse{Success: false, Error: "game not found"}
	}

	// Validate turn
	if engine.GameState.CurrentTurn != req.PlayerID-1 {
		return PlayCardResponse{Success: false, Error: "not your turn"}
	}

	// Emit PlayCardRequested event
	requestEvent := &events.Event{
		GameID:    gameID,
		EventType: events.EventPlayCardRequested,
		PlayerID:  req.PlayerID,
		Data: map[string]interface{}{
			"cardIndex":  req.CardIndex,
			"multiplier": req.Multiplier,
		},
	}

	eventID, err := h.eventStore.AppendEvent(ctx, requestEvent)
	if err != nil {
		return PlayCardResponse{Success: false, Error: fmt.Sprintf("failed to store event: %v", err)}
	}

	// Execute action
	action := game.Action{
		Type:       game.PlayCard,
		CardIndex:  req.CardIndex,
		Multiplier: req.Multiplier,
	}

	if err := engine.GameState.ExecuteAction(action); err != nil {
		return PlayCardResponse{Success: false, Error: err.Error(), EventID: eventID}
	}

	// Emit CardPlayed event
	playedEvent := &events.Event{
		GameID:    gameID,
		EventType: events.EventCardPlayed,
		PlayerID:  req.PlayerID,
		Data: map[string]interface{}{
			"cardIndex": req.CardIndex,
			"cardType":  "action", // Could be more specific
		},
	}

	playedEventID, err := h.eventStore.AppendEvent(ctx, playedEvent)
	if err != nil {
		log.Printf("Failed to store CardPlayed event: %v", err)
	} else {
		h.eventPub.Publish(ctx, gameID, playedEvent)
	}

	// Broadcast updated game state
	h.broadcastGameState(ctx, gameID, engine.GameState, playedEventID)

	return PlayCardResponse{Success: true, EventID: playedEventID}
}

// AcquireRequest represents a request to acquire a card
type AcquireRequest struct {
	PlayerID  int `json:"playerId"`
	CardIndex int `json:"cardIndex"`
}

// AcquireResponse represents a response to an acquire request
type AcquireResponse struct {
	Success bool   `json:"success"`
	EventID int64  `json:"eventId,omitempty"`
	Error   string `json:"error,omitempty"`
}

// HandleAcquire handles an acquire card request
func (h *Hub) HandleAcquire(ctx context.Context, gameID string, req AcquireRequest) AcquireResponse {
	engine, exists := h.GetGameEngine(gameID)
	if !exists {
		return AcquireResponse{Success: false, Error: "game not found"}
	}

	if engine.GameState.CurrentTurn != req.PlayerID-1 {
		return AcquireResponse{Success: false, Error: "not your turn"}
	}

	// Emit AcquireRequested event
	requestEvent := &events.Event{
		GameID:    gameID,
		EventType: events.EventAcquireRequested,
		PlayerID:  req.PlayerID,
		Data: map[string]interface{}{
			"cardIndex": req.CardIndex,
		},
	}

	eventID, err := h.eventStore.AppendEvent(ctx, requestEvent)
	if err != nil {
		return AcquireResponse{Success: false, Error: fmt.Sprintf("failed to store event: %v", err)}
	}

	// Execute action
	action := game.Action{
		Type:      game.AcquireCard,
		CardIndex: req.CardIndex,
	}

	if err := engine.GameState.ExecuteAction(action); err != nil {
		return AcquireResponse{Success: false, Error: err.Error(), EventID: eventID}
	}

	// Emit ItemAcquired event
	acquiredEvent := &events.Event{
		GameID:    gameID,
		EventType: events.EventItemAcquired,
		PlayerID:  req.PlayerID,
		Data: map[string]interface{}{
			"cardIndex": req.CardIndex,
			"cardType":  "merchant",
		},
	}

	acquiredEventID, err := h.eventStore.AppendEvent(ctx, acquiredEvent)
	if err != nil {
		log.Printf("Failed to store ItemAcquired event: %v", err)
	} else {
		h.eventPub.Publish(ctx, gameID, acquiredEvent)
	}

	// Broadcast updated game state
	h.broadcastGameState(ctx, gameID, engine.GameState, acquiredEventID)

	return AcquireResponse{Success: true, EventID: acquiredEventID}
}

// RestRequest represents a request to rest
type RestRequest struct {
	PlayerID int `json:"playerId"`
}

// RestResponse represents a response to a rest request
type RestResponse struct {
	Success bool   `json:"success"`
	EventID int64  `json:"eventId,omitempty"`
	Error   string `json:"error,omitempty"`
}

// HandleRest handles a rest request
func (h *Hub) HandleRest(ctx context.Context, gameID string, req RestRequest) RestResponse {
	engine, exists := h.GetGameEngine(gameID)
	if !exists {
		return RestResponse{Success: false, Error: "game not found"}
	}

	if engine.GameState.CurrentTurn != req.PlayerID-1 {
		return RestResponse{Success: false, Error: "not your turn"}
	}

	// Emit RestRequested event
	requestEvent := &events.Event{
		GameID:    gameID,
		EventType: events.EventRestRequested,
		PlayerID:  req.PlayerID,
		Data:      map[string]interface{}{},
	}

	eventID, err := h.eventStore.AppendEvent(ctx, requestEvent)
	if err != nil {
		return RestResponse{Success: false, Error: fmt.Sprintf("failed to store event: %v", err)}
	}

	// Execute action
	action := game.Action{Type: game.Rest}

	if err := engine.GameState.ExecuteAction(action); err != nil {
		return RestResponse{Success: false, Error: err.Error(), EventID: eventID}
	}

	// Emit PlayerRested event
	restedEvent := &events.Event{
		GameID:    gameID,
		EventType: events.EventPlayerRested,
		PlayerID:  req.PlayerID,
		Data:      map[string]interface{}{},
	}

	restedEventID, err := h.eventStore.AppendEvent(ctx, restedEvent)
	if err != nil {
		log.Printf("Failed to store PlayerRested event: %v", err)
	} else {
		h.eventPub.Publish(ctx, restedEvent.GameID, restedEvent)
	}

	// Broadcast updated game state
	h.broadcastGameState(ctx, gameID, engine.GameState, restedEventID)

	return RestResponse{Success: true, EventID: restedEventID}
}

// ClaimRequest represents a request to claim a point card
type ClaimRequest struct {
	PlayerID  int `json:"playerId"`
	CardIndex int `json:"cardIndex"`
}

// ClaimResponse represents a response to a claim request
type ClaimResponse struct {
	Success bool   `json:"success"`
	EventID int64  `json:"eventId,omitempty"`
	Error   string `json:"error,omitempty"`
}

// HandleClaim handles a claim point card request
func (h *Hub) HandleClaim(ctx context.Context, gameID string, req ClaimRequest) ClaimResponse {
	engine, exists := h.GetGameEngine(gameID)
	if !exists {
		return ClaimResponse{Success: false, Error: "game not found"}
	}

	if engine.GameState.CurrentTurn != req.PlayerID-1 {
		return ClaimResponse{Success: false, Error: "not your turn"}
	}

	// Emit ClaimRequested event
	requestEvent := &events.Event{
		GameID:    gameID,
		EventType: events.EventClaimRequested,
		PlayerID:  req.PlayerID,
		Data: map[string]interface{}{
			"cardIndex": req.CardIndex,
		},
	}

	eventID, err := h.eventStore.AppendEvent(ctx, requestEvent)
	if err != nil {
		return ClaimResponse{Success: false, Error: fmt.Sprintf("failed to store event: %v", err)}
	}

	// Execute action
	action := game.Action{
		Type:      game.ClaimPointCard,
		CardIndex: req.CardIndex,
	}

	if err := engine.GameState.ExecuteAction(action); err != nil {
		return ClaimResponse{Success: false, Error: err.Error(), EventID: eventID}
	}

	// Emit ClaimCompleted event
	claimEvent := &events.Event{
		GameID:    gameID,
		EventType: events.EventClaimCompleted,
		PlayerID:  req.PlayerID,
		Data: map[string]interface{}{
			"cardIndex":   req.CardIndex,
			"pointsGained": 0, // Would need to get actual points from card
		},
	}

	claimEventID, err := h.eventStore.AppendEvent(ctx, claimEvent)
	if err != nil {
		log.Printf("Failed to store ClaimCompleted event: %v", err)
	} else {
		h.eventPub.Publish(ctx, gameID, claimEvent)
	}

	// Broadcast updated game state
	h.broadcastGameState(ctx, gameID, engine.GameState, claimEventID)

	return ClaimResponse{Success: true, EventID: claimEventID}
}

// broadcastGameState broadcasts the current game state to all clients
func (h *Hub) broadcastGameState(ctx context.Context, gameID string, gameState *game.GameState, eventID int64) {
	// Create GameStateUpdated event
	stateEvent := &events.Event{
		GameID:    gameID,
		EventType: events.EventGameStateUpdated,
		PlayerID:  0,
		Data: map[string]interface{}{
			"players":     gameState.Players,
			"market":      gameState.Market,
			"currentTurn": gameState.CurrentTurn,
			"round":       gameState.Round,
			"gameOver":    gameState.GameOver,
			"lastRound":   gameState.LastRound,
		},
	}

	stateEventID, err := h.eventStore.AppendEvent(ctx, stateEvent)
	if err != nil {
		log.Printf("Failed to store GameStateUpdated event: %v", err)
		return
	}

	if err := h.eventPub.Publish(ctx, gameID, stateEvent); err != nil {
		log.Printf("Failed to publish GameStateUpdated event: %v", err)
		return
	}

	// Marshal and broadcast
	msg := createServerMessage("gameState", stateEvent.Data, stateEventID, "")
	h.BroadcastToGame(gameID, msg)
}
