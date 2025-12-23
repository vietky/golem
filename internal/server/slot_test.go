package server

import (
	"testing"

	"golem_century/internal/game"
)

func TestSlotOperations(t *testing.T) {
	t.Run("NewSlot creates empty slot", func(t *testing.T) {
		slot := NewSlot(0, false)
		if slot.Type != SlotEmpty {
			t.Errorf("expected empty slot, got %s", slot.Type)
		}
		if slot.IsOccupied() {
			t.Error("empty slot should not be occupied")
		}
		if !slot.CanJoin() {
			t.Error("empty slot should allow joining")
		}
	})

	t.Run("SetPlayer converts slot to player", func(t *testing.T) {
		slot := NewSlot(0, false)
		slot.SetPlayer(1, "TestPlayer", "1")

		if slot.Type != SlotPlayer {
			t.Errorf("expected player slot, got %s", slot.Type)
		}
		if slot.PlayerID != 1 {
			t.Errorf("expected playerID 1, got %d", slot.PlayerID)
		}
		if slot.PlayerName != "TestPlayer" {
			t.Errorf("expected player name TestPlayer, got %s", slot.PlayerName)
		}
		if !slot.IsOccupied() {
			t.Error("player slot should be occupied")
		}
	})

	t.Run("SetAI converts slot to AI", func(t *testing.T) {
		slot := NewSlot(1, false)
		err := slot.SetAI(AITypeBasic)

		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if slot.Type != SlotAI {
			t.Errorf("expected AI slot, got %s", slot.Type)
		}
		if slot.AIType != AITypeBasic {
			t.Errorf("expected basic AI, got %s", slot.AIType)
		}
		if !slot.IsOccupied() {
			t.Error("AI slot should be occupied")
		}
	})

	t.Run("SetAI rejects none AI type", func(t *testing.T) {
		slot := NewSlot(0, false)
		err := slot.SetAI(AITypeNone)

		if err == nil {
			t.Error("expected error for none AI type")
		}
	})

	t.Run("ClearSlot clears non-host slot", func(t *testing.T) {
		slot := NewSlot(1, false)
		slot.SetPlayer(2, "Player2", "2")
		slot.ClearSlot()

		if slot.Type != SlotEmpty {
			t.Errorf("expected empty slot after clear, got %s", slot.Type)
		}
		if slot.PlayerID != 0 {
			t.Errorf("expected playerID 0 after clear, got %d", slot.PlayerID)
		}
	})

	t.Run("ClearSlot does not clear host slot", func(t *testing.T) {
		slot := NewSlot(0, true) // Host slot
		slot.SetPlayer(1, "Host", "1")
		slot.ClearSlot()

		if slot.Type != SlotPlayer {
			t.Error("host slot should not be cleared")
		}
	})

	t.Run("CreateAIStrategy returns correct strategy", func(t *testing.T) {
		slot := NewSlot(0, false)
		slot.SetAI(AITypeBasic)

		strategy := slot.CreateAIStrategy()
		if strategy == nil {
			t.Fatal("expected AI strategy, got nil")
		}

		basicAI, ok := strategy.(*game.BasicAI)
		if !ok {
			t.Errorf("expected BasicAI, got %T", strategy)
		}
		if basicAI.GetName() != "BasicAI" {
			t.Errorf("expected BasicAI name, got %s", basicAI.GetName())
		}
	})

	t.Run("AI slot can be replaced by player", func(t *testing.T) {
		slot := NewSlot(0, false)
		slot.SetAI(AITypeBasic)

		if !slot.CanJoin() {
			t.Error("AI slot should allow joining (replacement)")
		}

		slot.SetPlayer(1, "RealPlayer", "1")
		if slot.Type != SlotPlayer {
			t.Errorf("expected player slot after replacement, got %s", slot.Type)
		}
		if slot.AIType != AITypeNone {
			t.Errorf("AIType should be none after replacement, got %s", slot.AIType)
		}
	})
}

func TestLobbyState(t *testing.T) {
	t.Run("NewLobbyState creates correct number of slots", func(t *testing.T) {
		lobby := NewLobbyState(4, 1)

		if len(lobby.Slots) != 4 {
			t.Errorf("expected 4 slots, got %d", len(lobby.Slots))
		}
		if lobby.MaxPlayers != 4 {
			t.Errorf("expected max players 4, got %d", lobby.MaxPlayers)
		}
		if !lobby.Slots[0].IsHost {
			t.Error("first slot should be host")
		}
	})

	t.Run("FindEmptySlot finds first empty slot", func(t *testing.T) {
		lobby := NewLobbyState(3, 0)
		lobby.Slots[0].SetPlayer(1, "Player1", "1")

		emptySlot := lobby.FindEmptySlot()
		if emptySlot == nil {
			t.Fatal("expected to find empty slot")
		}
		if emptySlot.Index != 1 {
			t.Errorf("expected slot index 1, got %d", emptySlot.Index)
		}
	})

	t.Run("FindEmptySlot finds AI slot for replacement", func(t *testing.T) {
		lobby := NewLobbyState(3, 0)
		lobby.Slots[0].SetPlayer(1, "Player1", "1")
		lobby.Slots[1].SetAI(AITypeBasic)

		emptySlot := lobby.FindEmptySlot()
		if emptySlot == nil {
			t.Fatal("expected to find AI slot for replacement")
		}
		if emptySlot.Index != 1 {
			t.Errorf("expected slot index 1 (AI), got %d", emptySlot.Index)
		}
	})

	t.Run("GetOccupiedSlotCount counts correctly", func(t *testing.T) {
		lobby := NewLobbyState(4, 0)
		lobby.Slots[0].SetPlayer(1, "Player1", "1")
		lobby.Slots[1].SetAI(AITypeBasic)
		lobby.Slots[2].SetPlayer(2, "Player2", "2")

		count := lobby.GetOccupiedSlotCount()
		if count != 3 {
			t.Errorf("expected 3 occupied slots, got %d", count)
		}
	})

	t.Run("GetPlayerSlotCount counts only players", func(t *testing.T) {
		lobby := NewLobbyState(4, 0)
		lobby.Slots[0].SetPlayer(1, "Player1", "1")
		lobby.Slots[1].SetAI(AITypeBasic)
		lobby.Slots[2].SetPlayer(2, "Player2", "2")

		count := lobby.GetPlayerSlotCount()
		if count != 2 {
			t.Errorf("expected 2 player slots, got %d", count)
		}
	})

	t.Run("CanStart requires at least 2 occupied slots", func(t *testing.T) {
		lobby := NewLobbyState(4, 0)

		if lobby.CanStart() {
			t.Error("should not be able to start with 0 players")
		}

		lobby.Slots[0].SetPlayer(1, "Player1", "1")
		if lobby.CanStart() {
			t.Error("should not be able to start with 1 player")
		}

		lobby.Slots[1].SetPlayer(2, "Player2", "2")
		if !lobby.CanStart() {
			t.Error("should be able to start with 2 players")
		}

		// Test with player + AI
		lobby2 := NewLobbyState(3, 0)
		lobby2.Slots[0].SetPlayer(1, "Player1", "1")
		lobby2.Slots[1].SetAI(AITypeBasic)
		if !lobby2.CanStart() {
			t.Error("should be able to start with 1 player + 1 AI")
		}
	})

	t.Run("AssignPlayerIDs assigns sequential IDs", func(t *testing.T) {
		lobby := NewLobbyState(4, 0)
		lobby.Slots[0].SetPlayer(0, "Player1", "1")
		lobby.Slots[1].SetAI(AITypeBasic)
		lobby.Slots[3].SetPlayer(0, "Player2", "2")

		lobby.AssignPlayerIDs()

		// Check that occupied slots have sequential IDs
		occupiedSlots := []*Slot{}
		for _, slot := range lobby.Slots {
			if slot.IsOccupied() {
				occupiedSlots = append(occupiedSlots, slot)
			}
		}

		for i, slot := range occupiedSlots {
			expectedID := i + 1
			if slot.PlayerID != expectedID {
				t.Errorf("slot %d: expected playerID %d, got %d", i, expectedID, slot.PlayerID)
			}
		}
	})

	t.Run("FindSlotByPlayerID finds correct slot", func(t *testing.T) {
		lobby := NewLobbyState(3, 0)
		lobby.Slots[0].SetPlayer(1, "Player1", "1")
		lobby.Slots[2].SetPlayer(3, "Player3", "3")

		slot := lobby.FindSlotByPlayerID(3)
		if slot == nil {
			t.Fatal("expected to find slot for player 3")
		}
		if slot.Index != 2 {
			t.Errorf("expected slot index 2, got %d", slot.Index)
		}

		nilSlot := lobby.FindSlotByPlayerID(999)
		if nilSlot != nil {
			t.Error("expected nil for non-existent player")
		}
	})
}
