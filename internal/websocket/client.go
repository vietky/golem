package websocket

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"golem_century/internal/events"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 8192
)

// ServeClient handles a WebSocket connection for a client
func (h *Hub) ServeClient(conn *websocket.Conn, gameID string, playerID int, lastEventID int64) {
	clientID := uuid.New().String()

	client := &Client{
		ID:          clientID,
		GameID:      gameID,
		PlayerID:    playerID,
		Conn:        conn,
		Send:        make(chan []byte, 256),
		LastEventID: lastEventID,
	}

	// Register client
	h.register <- client

	// Start goroutines
	go client.writePump()
	go client.readPump(h)

	// Send player assignment
	assignMsg := createServerMessage("playerAssigned", map[string]interface{}{
		"playerId": playerID,
		"gameId":   gameID,
	}, 0, "")
	client.Send <- assignMsg

	// Handle reconnection - replay missed events
	if lastEventID > 0 {
		h.replayEventsToClient(client, lastEventID)
	} else {
		// New connection - send current game state
		h.sendCurrentGameState(client)
	}

	// Emit PlayerJoined event
	h.emitPlayerJoinedEvent(gameID, playerID)
}

// readPump reads messages from the WebSocket connection
func (c *Client) readPump(h *Hub) {
	defer func() {
		h.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Parse client message
		var msg ClientMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("Failed to parse client message: %v", err)
			continue
		}

		// Handle message
		h.handleClientMessage(c, &msg)
	}
}

// writePump writes messages to the WebSocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to current message
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleClientMessage handles a message from a client
func (h *Hub) handleClientMessage(client *Client, msg *ClientMessage) {
	ctx := context.Background()

	switch msg.Type {
	case "playCard":
		req := PlayCardRequest{
			PlayerID: client.PlayerID,
		}
		if cardIndex, ok := msg.Data["cardIndex"].(float64); ok {
			req.CardIndex = int(cardIndex)
		}
		if multiplier, ok := msg.Data["multiplier"].(float64); ok {
			req.Multiplier = int(multiplier)
		}

		resp := h.HandlePlayCard(ctx, client.GameID, req)
		h.sendResponse(client, "playCardResponse", resp)

	case "acquire":
		req := AcquireRequest{
			PlayerID: client.PlayerID,
		}
		if cardIndex, ok := msg.Data["cardIndex"].(float64); ok {
			req.CardIndex = int(cardIndex)
		}

		resp := h.HandleAcquire(ctx, client.GameID, req)
		h.sendResponse(client, "acquireResponse", resp)

	case "rest":
		req := RestRequest{
			PlayerID: client.PlayerID,
		}

		resp := h.HandleRest(ctx, client.GameID, req)
		h.sendResponse(client, "restResponse", resp)

	case "claim":
		req := ClaimRequest{
			PlayerID: client.PlayerID,
		}
		if cardIndex, ok := msg.Data["cardIndex"].(float64); ok {
			req.CardIndex = int(cardIndex)
		}

		resp := h.HandleClaim(ctx, client.GameID, req)
		h.sendResponse(client, "claimResponse", resp)

	case "ping":
		// Update last event ID if provided
		if eventID, ok := msg.Data["lastEventId"].(float64); ok {
			client.mu.Lock()
			client.LastEventID = int64(eventID)
			client.mu.Unlock()
		}

		pongMsg := createServerMessage("pong", map[string]interface{}{
			"timestamp": time.Now().Unix(),
		}, 0, "")
		client.Send <- pongMsg

	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

// sendResponse sends a response to a client
func (h *Hub) sendResponse(client *Client, msgType string, data interface{}) {
	respBytes, err := json.Marshal(map[string]interface{}{
		"type": msgType,
		"data": data,
	})
	if err != nil {
		log.Printf("Failed to marshal response: %v", err)
		return
	}

	select {
	case client.Send <- respBytes:
	case <-time.After(5 * time.Second):
		log.Printf("Timeout sending response to client %s", client.ID)
	}
}

// replayEventsToClient replays missed events to a reconnecting client
func (h *Hub) replayEventsToClient(client *Client, lastEventID int64) {
	ctx := context.Background()

	// Get events since last seen event
	events, err := h.eventStore.GetEvents(ctx, client.GameID, lastEventID+1)
	if err != nil {
		log.Printf("Failed to get events for replay: %v", err)
		h.sendCurrentGameState(client)
		return
	}

	log.Printf("Replaying %d events to client %s (from event %d)", len(events), client.ID, lastEventID)

	// Send replay start message
	replayStartMsg := createServerMessage("replayStart", map[string]interface{}{
		"fromEventId": lastEventID + 1,
		"count":       len(events),
	}, 0, "")
	client.Send <- replayStartMsg

	// Send each event
	for _, event := range events {
		eventMsg := createServerMessage("event", map[string]interface{}{
			"eventType": event.EventType,
			"playerId":  event.PlayerID,
			"data":      event.Data,
			"timestamp": event.Timestamp,
		}, event.ID, "")
		client.Send <- eventMsg

		// Update client's last event ID
		client.mu.Lock()
		client.LastEventID = event.ID
		client.mu.Unlock()
	}

	// Send replay complete message
	replayEndMsg := createServerMessage("replayComplete", map[string]interface{}{
		"lastEventId": client.LastEventID,
	}, 0, "")
	client.Send <- replayEndMsg
}

// sendCurrentGameState sends the current game state to a client
func (h *Hub) sendCurrentGameState(client *Client) {
	gameState, exists := h.GetGameState(client.GameID)
	if !exists {
		errMsg := createServerMessage("error", nil, 0, "game not found")
		client.Send <- errMsg
		return
	}

	// Get latest event ID
	ctx := context.Background()
	latestEventID, err := h.eventStore.GetLatestEventID(ctx, client.GameID)
	if err != nil {
		log.Printf("Failed to get latest event ID: %v", err)
	}

	stateMsg := createServerMessage("gameState", map[string]interface{}{
		"players":     gameState.Players,
		"market":      gameState.Market,
		"currentTurn": gameState.CurrentTurn,
		"round":       gameState.Round,
		"gameOver":    gameState.GameOver,
		"lastRound":   gameState.LastRound,
	}, latestEventID, "")

	client.Send <- stateMsg

	// Update client's last event ID
	client.mu.Lock()
	client.LastEventID = latestEventID
	client.mu.Unlock()
}

// emitPlayerJoinedEvent emits a PlayerJoined event
func (h *Hub) emitPlayerJoinedEvent(gameID string, playerID int) {
	ctx := context.Background()

	event := &events.Event{
		GameID:    gameID,
		EventType: events.EventPlayerJoined,
		PlayerID:  playerID,
		Data: map[string]interface{}{
			"playerId": playerID,
		},
	}

	if _, err := h.eventStore.AppendEvent(ctx, event); err != nil {
		log.Printf("Failed to append PlayerJoined event: %v", err)
		return
	}

	if err := h.eventPub.Publish(ctx, gameID, event); err != nil {
		log.Printf("Failed to publish PlayerJoined event: %v", err)
	}
}
