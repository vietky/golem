package server

import (
	"encoding/json"
	"fmt"
	"golem_century/internal/game"

	"github.com/gorilla/websocket"
)

// StartGame transitions the lobby to a started game
func (gs *GameSession) StartGame() error {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	if gs.IsGameStarted {
		return fmt.Errorf("game already started")
	}

	if !gs.LobbyState.CanStart() {
		return fmt.Errorf("cannot start game: need at least 2 players")
	}

	// Assign player IDs to all occupied slots
	gs.LobbyState.AssignPlayerIDs()

	// Count actual players for the game
	actualPlayerCount := gs.LobbyState.GetOccupiedSlotCount()

	// Create new game state with actual player count
	// Use current time as seed for new game
	gs.GameState = game.NewGameState(actualPlayerCount, gs.CreatedAt.UnixNano())

	// Collect occupied slots and shuffle them for random player order
	occupiedSlots := make([]*Slot, 0)
	for _, slot := range gs.LobbyState.Slots {
		if slot.IsOccupied() {
			occupiedSlots = append(occupiedSlots, slot)
		}
	}

	// Shuffle slots for random turn order using Fisher-Yates algorithm
	for i := len(occupiedSlots) - 1; i > 0; i-- {
		j := int(gs.CreatedAt.UnixNano()%(int64(i)+1)) % (i + 1)
		occupiedSlots[i], occupiedSlots[j] = occupiedSlots[j], occupiedSlots[i]
	}

	// Set up players and AI based on shuffled slots
	for playerIndex, slot := range occupiedSlots {
		if playerIndex >= len(gs.GameState.Players) {
			break
		}

		player := gs.GameState.Players[playerIndex]
		playerID := playerIndex + 1

		switch slot.Type {
		case SlotAI:
			// Set up AI player
			player.IsAI = true
			player.Name = slot.PlayerName
			player.ID = playerID

			// Create and store AI strategy for this specific player
			aiStrategy := slot.CreateAIStrategy()
			if aiStrategy != nil {
				gs.AIStrategies[playerID] = aiStrategy
			}

			// Update PlayerNames (no avatar for AI)
			gs.PlayerNames[playerID] = slot.PlayerName
		case SlotPlayer:
			// Set up human player
			player.IsAI = false
			player.Name = slot.PlayerName
			player.ID = playerID

			// Update PlayerNames and PlayerAvatars maps
			gs.PlayerNames[playerID] = slot.PlayerName
			gs.PlayerAvatars[playerID] = slot.PlayerAvatar
		}
	}

	// Update engine with new game state
	gs.Engine.GameState = gs.GameState

	gs.IsGameStarted = true
	gs.LobbyState.IsGameStarted = true

	return nil
}

// JoinLobbySlot joins a player to a specific lobby slot
func (gs *GameSession) JoinLobbySlot(slotIndex int, playerName string, playerAvatar string, conn *websocket.Conn) error {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	if gs.IsGameStarted {
		return fmt.Errorf("game already started")
	}

	if slotIndex < 0 || slotIndex >= len(gs.LobbyState.Slots) {
		return fmt.Errorf("invalid slot index")
	}

	slot := gs.LobbyState.Slots[slotIndex]
	if !slot.CanJoin() {
		return fmt.Errorf("slot not available")
	}

	// Generate a temporary player ID (will be reassigned when game starts)
	tempPlayerID := slotIndex + 1

	// Set the slot to player
	slot.SetPlayer(tempPlayerID, playerName, playerAvatar)

	// Update connections
	gs.Connections[tempPlayerID] = conn
	gs.PlayerNames[tempPlayerID] = playerName
	gs.PlayerAvatars[tempPlayerID] = playerAvatar
	gs.LastActivity = gs.CreatedAt // Update activity time

	// Set host if this is the first player
	if gs.LobbyState.HostPlayerID == 0 {
		gs.LobbyState.HostPlayerID = tempPlayerID
		slot.IsHost = true
	}

	return nil
}

// SetSlotAI sets a slot to an AI player
func (gs *GameSession) SetSlotAI(slotIndex int, aiType AIType, requesterPlayerID int) error {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	if gs.IsGameStarted {
		return fmt.Errorf("game already started")
	}

	// Only host can set AI
	if requesterPlayerID != gs.LobbyState.HostPlayerID {
		return fmt.Errorf("only host can configure AI slots")
	}

	if slotIndex < 0 || slotIndex >= len(gs.LobbyState.Slots) {
		return fmt.Errorf("invalid slot index")
	}

	slot := gs.LobbyState.Slots[slotIndex]

	// Can't change host slot to AI
	if slot.IsHost {
		return fmt.Errorf("cannot set host slot to AI")
	}

	// Clear any existing player from the slot
	if slot.Type == SlotPlayer && slot.PlayerID > 0 {
		delete(gs.Connections, slot.PlayerID)
		delete(gs.PlayerNames, slot.PlayerID)
		delete(gs.PlayerAvatars, slot.PlayerID)
	}

	return slot.SetAI(aiType)
}

// ClearSlot clears a slot back to empty
func (gs *GameSession) ClearSlot(slotIndex int, requesterPlayerID int) error {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	if gs.IsGameStarted {
		return fmt.Errorf("game already started")
	}

	// Only host can clear slots
	if requesterPlayerID != gs.LobbyState.HostPlayerID {
		return fmt.Errorf("only host can clear slots")
	}

	if slotIndex < 0 || slotIndex >= len(gs.LobbyState.Slots) {
		return fmt.Errorf("invalid slot index")
	}

	slot := gs.LobbyState.Slots[slotIndex]

	// Can't clear host slot
	if slot.IsHost {
		return fmt.Errorf("cannot clear host slot")
	}

	// Clear connections if it was a player
	if slot.Type == SlotPlayer && slot.PlayerID > 0 {
		delete(gs.Connections, slot.PlayerID)
		delete(gs.PlayerNames, slot.PlayerID)
		delete(gs.PlayerAvatars, slot.PlayerID)
	}

	slot.ClearSlot()
	return nil
}

// GetLobbyState returns the current lobby state
func (gs *GameSession) GetLobbyState() *LobbyState {
	gs.mu.RLock()
	defer gs.mu.RUnlock()
	return gs.LobbyState
}

// SerializeLobbyState serializes the lobby state for sending to clients
func (gs *GameSession) SerializeLobbyState() map[string]interface{} {
	gs.mu.RLock()
	defer gs.mu.RUnlock()

	return map[string]interface{}{
		"type":          "lobbyState",
		"slots":         gs.LobbyState.Slots,
		"maxPlayers":    gs.LobbyState.MaxPlayers,
		"hostPlayerID":  gs.LobbyState.HostPlayerID,
		"isGameStarted": gs.LobbyState.IsGameStarted,
		"canStart":      gs.LobbyState.CanStart(),
	}
}

// BroadcastLobbyState broadcasts the current lobby state to all connected players
func (gs *GameSession) BroadcastLobbyState() {
	lobbyState := gs.SerializeLobbyState()
	if data, err := json.Marshal(lobbyState); err == nil {
		gs.Broadcast(data)
	}
}
