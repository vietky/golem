package server

import (
	"fmt"
	"golem_century/internal/game"
)

// SlotType defines the type of a slot in the lobby
type SlotType string

const (
	SlotEmpty  SlotType = "empty"  // Empty slot, waiting for player or AI
	SlotPlayer SlotType = "player" // Occupied by a human player
	SlotAI     SlotType = "ai"     // Occupied by an AI player
)

// AIType defines available AI strategies
type AIType string

const (
	AITypeNone     AIType = "none"  // No AI (empty slot)
	AITypeBasic    AIType = "basic" // BasicAI strategy
	AITypeRestOnly AIType = "rest"  // RestOnlyAI strategy (passive)
)

// Slot represents a player slot in the lobby
type Slot struct {
	Index        int      `json:"index"`        // 0-based slot index
	Type         SlotType `json:"type"`         // Type of slot (empty/player/ai)
	AIType       AIType   `json:"aiType"`       // Type of AI if slot is AI
	PlayerID     int      `json:"playerID"`     // Player ID (1-based, 0 if empty)
	PlayerName   string   `json:"playerName"`   // Player or AI name
	PlayerAvatar string   `json:"playerAvatar"` // Player avatar
	IsHost       bool     `json:"isHost"`       // Whether this slot is the host
	IsLocked     bool     `json:"isLocked"`     // Whether slot is locked (can't be changed)
}

// NewSlot creates a new empty slot
func NewSlot(index int, isHost bool) *Slot {
	return &Slot{
		Index:    index,
		Type:     SlotEmpty,
		AIType:   AITypeNone,
		PlayerID: 0,
		IsHost:   isHost,
		IsLocked: false,
	}
}

// SetPlayer sets the slot to a human player
func (s *Slot) SetPlayer(playerID int, name string, avatar string) {
	s.Type = SlotPlayer
	s.AIType = AITypeNone
	s.PlayerID = playerID
	s.PlayerName = name
	s.PlayerAvatar = avatar
}

// SetAI sets the slot to an AI player
func (s *Slot) SetAI(aiType AIType) error {
	if aiType == AITypeNone {
		return fmt.Errorf("invalid AI type: none")
	}
	s.Type = SlotAI
	s.AIType = aiType
	s.PlayerID = 0
	s.PlayerName = s.getAIName(aiType)
	s.PlayerAvatar = ""
	return nil
}

// ClearSlot clears the slot back to empty
func (s *Slot) ClearSlot() {
	// Can't clear host slot or locked slots
	if !s.IsHost && !s.IsLocked {
		s.Type = SlotEmpty
		s.AIType = AITypeNone
		s.PlayerID = 0
		s.PlayerName = ""
		s.PlayerAvatar = ""
	}
}

// CanJoin checks if a player can join this slot
func (s *Slot) CanJoin() bool {
	return s.Type == SlotEmpty || s.Type == SlotAI
}

// IsOccupied checks if the slot is occupied
func (s *Slot) IsOccupied() bool {
	return s.Type == SlotPlayer || s.Type == SlotAI
}

// getAIName generates a name for an AI player with random name
func (s *Slot) getAIName(aiType AIType) string {
	// Random AI names
	aiNames := []string{
		"Alpha", "Beta", "Gamma", "Delta", "Epsilon",
		"Zeta", "Theta", "Lambda", "Sigma", "Omega",
		"Nova", "Orion", "Phoenix", "Nexus", "Apex",
		"Titan", "Quantum", "Cipher", "Matrix", "Vector",
	}

	// Use slot index as seed for deterministic random name
	randomName := aiNames[s.Index%len(aiNames)]

	switch aiType {
	case AITypeBasic:
		return fmt.Sprintf("[Smart AI] %s", randomName)
	case AITypeRestOnly:
		return fmt.Sprintf("[Passive AI] %s", randomName)
	default:
		return fmt.Sprintf("[AI] %s", randomName)
	}
}

// CreateAIStrategy creates an AI strategy instance based on the AI type
func (s *Slot) CreateAIStrategy() game.AIStrategy {
	switch s.AIType {
	case AITypeBasic:
		return game.NewBasicAI(nil) // RNG will be set by engine
	case AITypeRestOnly:
		return game.NewRestOnlyAI()
	default:
		return nil
	}
}

// LobbyState represents the state of a lobby before game starts
type LobbyState struct {
	Slots         []*Slot `json:"slots"`
	MaxPlayers    int     `json:"maxPlayers"`
	HostPlayerID  int     `json:"hostPlayerID"`
	IsGameStarted bool    `json:"isGameStarted"`
}

// NewLobbyState creates a new lobby state
func NewLobbyState(maxPlayers int, hostPlayerID int) *LobbyState {
	slots := make([]*Slot, maxPlayers)
	for i := 0; i < maxPlayers; i++ {
		slots[i] = NewSlot(i, i == 0) // First slot is host
	}
	return &LobbyState{
		Slots:         slots,
		MaxPlayers:    maxPlayers,
		HostPlayerID:  hostPlayerID,
		IsGameStarted: false,
	}
}

// FindSlotByPlayerID finds a slot by player ID
func (ls *LobbyState) FindSlotByPlayerID(playerID int) *Slot {
	for _, slot := range ls.Slots {
		if slot.PlayerID == playerID {
			return slot
		}
	}
	return nil
}

// FindEmptySlot finds the first empty or AI slot
func (ls *LobbyState) FindEmptySlot() *Slot {
	for _, slot := range ls.Slots {
		if slot.CanJoin() {
			return slot
		}
	}
	return nil
}

// GetOccupiedSlotCount returns the number of occupied slots
func (ls *LobbyState) GetOccupiedSlotCount() int {
	count := 0
	for _, slot := range ls.Slots {
		if slot.IsOccupied() {
			count++
		}
	}
	return count
}

// GetPlayerSlotCount returns the number of player slots
func (ls *LobbyState) GetPlayerSlotCount() int {
	count := 0
	for _, slot := range ls.Slots {
		if slot.Type == SlotPlayer {
			count++
		}
	}
	return count
}

// CanStart checks if the lobby can start the game
func (ls *LobbyState) CanStart() bool {
	// Need at least 2 occupied slots (player or AI)
	return ls.GetOccupiedSlotCount() >= 2 && !ls.IsGameStarted
}

// AssignPlayerIDs assigns player IDs to all occupied slots in order
func (ls *LobbyState) AssignPlayerIDs() {
	playerID := 1
	for _, slot := range ls.Slots {
		if slot.IsOccupied() {
			if slot.Type == SlotPlayer {
				// Keep existing player ID for players
				if slot.PlayerID == 0 {
					slot.PlayerID = playerID
					playerID++
				}
			} else if slot.Type == SlotAI {
				// Assign new ID for AI
				slot.PlayerID = playerID
				playerID++
			}
		}
	}
}
