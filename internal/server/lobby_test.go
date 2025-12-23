package server

import (
	"encoding/json"
	"testing"

	"golem_century/internal/game"
	"golem_century/internal/logger"
)

func TestGameSessionLobby(t *testing.T) {
	log := logger.NewNopLogger()

	t.Run("JoinLobbySlot adds player to slot", func(t *testing.T) {
		session := NewGameSession("test", 4, 12345, 60, nil, log)

		err := session.JoinLobbySlot(0, "Player1", "1", nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		slot := session.LobbyState.Slots[0]
		if slot.Type != SlotPlayer {
			t.Errorf("expected player slot, got %s", slot.Type)
		}
		if slot.PlayerName != "Player1" {
			t.Errorf("expected player name Player1, got %s", slot.PlayerName)
		}
		if !slot.IsHost {
			t.Error("first player should be host")
		}
	})

	t.Run("JoinLobbySlot fails for occupied player slot", func(t *testing.T) {
		session := NewGameSession("test", 3, 12345, 60, nil, log)

		session.JoinLobbySlot(0, "Player1", "1", nil)
		err := session.JoinLobbySlot(0, "Player2", "2", nil)

		if err == nil {
			t.Error("expected error when joining occupied player slot")
		}
	})

	t.Run("JoinLobbySlot replaces AI slot", func(t *testing.T) {
		session := NewGameSession("test", 3, 12345, 60, nil, log)

		// Set up host
		session.JoinLobbySlot(0, "Host", "1", nil)
		session.LobbyState.HostPlayerID = 1

		// Add AI to slot 1
		session.SetSlotAI(1, AITypeBasic, 1)

		// Replace AI with player
		err := session.JoinLobbySlot(1, "Player2", "2", nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		slot := session.LobbyState.Slots[1]
		if slot.Type != SlotPlayer {
			t.Errorf("expected player slot after replacement, got %s", slot.Type)
		}
		if slot.PlayerName != "Player2" {
			t.Errorf("expected player name Player2, got %s", slot.PlayerName)
		}
	})

	t.Run("SetSlotAI sets AI in empty slot", func(t *testing.T) {
		session := NewGameSession("test", 3, 12345, 60, nil, log)
		session.JoinLobbySlot(0, "Host", "1", nil)
		session.LobbyState.HostPlayerID = 1

		err := session.SetSlotAI(1, AITypeBasic, 1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		slot := session.LobbyState.Slots[1]
		if slot.Type != SlotAI {
			t.Errorf("expected AI slot, got %s", slot.Type)
		}
		if slot.AIType != AITypeBasic {
			t.Errorf("expected basic AI, got %s", slot.AIType)
		}
	})

	t.Run("SetSlotAI fails for non-host", func(t *testing.T) {
		session := NewGameSession("test", 3, 12345, 60, nil, log)
		session.JoinLobbySlot(0, "Host", "1", nil)
		session.JoinLobbySlot(1, "Player2", "2", nil)
		session.LobbyState.HostPlayerID = 1

		err := session.SetSlotAI(2, AITypeBasic, 2) // Player 2 trying to set AI
		if err == nil {
			t.Error("expected error for non-host setting AI")
		}
	})

	t.Run("SetSlotAI fails for host slot", func(t *testing.T) {
		session := NewGameSession("test", 3, 12345, 60, nil, log)
		session.JoinLobbySlot(0, "Host", "1", nil)
		session.LobbyState.HostPlayerID = 1

		err := session.SetSlotAI(0, AITypeBasic, 1)
		if err == nil {
			t.Error("expected error for setting host slot to AI")
		}
	})

	t.Run("ClearSlot clears AI slot", func(t *testing.T) {
		session := NewGameSession("test", 3, 12345, 60, nil, log)
		session.JoinLobbySlot(0, "Host", "1", nil)
		session.LobbyState.HostPlayerID = 1
		session.SetSlotAI(1, AITypeBasic, 1)

		err := session.ClearSlot(1, 1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		slot := session.LobbyState.Slots[1]
		if slot.Type != SlotEmpty {
			t.Errorf("expected empty slot after clear, got %s", slot.Type)
		}
	})

	t.Run("ClearSlot fails for non-host", func(t *testing.T) {
		session := NewGameSession("test", 3, 12345, 60, nil, log)
		session.JoinLobbySlot(0, "Host", "1", nil)
		session.JoinLobbySlot(1, "Player2", "2", nil)
		session.LobbyState.HostPlayerID = 1
		session.SetSlotAI(2, AITypeBasic, 1)

		err := session.ClearSlot(2, 2) // Player 2 trying to clear
		if err == nil {
			t.Error("expected error for non-host clearing slot")
		}
	})

	t.Run("StartGame transitions lobby to game", func(t *testing.T) {
		session := NewGameSession("test", 4, 12345, 60, nil, log)
		session.JoinLobbySlot(0, "Player1", "1", nil)
		session.JoinLobbySlot(1, "Player2", "2", nil)
		session.LobbyState.HostPlayerID = 1

		err := session.StartGame()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if !session.IsGameStarted {
			t.Error("game should be started")
		}
		if !session.LobbyState.IsGameStarted {
			t.Error("lobby state should show game started")
		}

		// Check that game state was created with correct number of players
		if len(session.GameState.Players) != 2 {
			t.Errorf("expected 2 players in game, got %d", len(session.GameState.Players))
		}
	})

	t.Run("StartGame with mixed players and AI", func(t *testing.T) {
		session := NewGameSession("test", 4, 12345, 60, nil, log)
		session.JoinLobbySlot(0, "Player1", "1", nil)
		session.LobbyState.HostPlayerID = 1
		session.SetSlotAI(1, AITypeBasic, 1)
		session.SetSlotAI(2, AITypeRestOnly, 1)

		err := session.StartGame()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Check that game has correct number of players
		if len(session.GameState.Players) != 3 {
			t.Errorf("expected 3 players (1 human + 2 AI), got %d", len(session.GameState.Players))
		}

		// Count AI and human players (order is shuffled, so just verify counts)
		aiCount := 0
		humanCount := 0
		for _, player := range session.GameState.Players {
			if player.IsAI {
				aiCount++
			} else {
				humanCount++
			}
		}

		if aiCount != 2 {
			t.Errorf("expected 2 AI players, got %d", aiCount)
		}
		if humanCount != 1 {
			t.Errorf("expected 1 human player, got %d", humanCount)
		}

		// Verify AI strategies are stored for AI players
		aiStrategyCount := len(session.AIStrategies)
		if aiStrategyCount != 2 {
			t.Errorf("expected 2 AI strategies stored, got %d", aiStrategyCount)
		}
	})

	t.Run("StartGame fails with insufficient players", func(t *testing.T) {
		session := NewGameSession("test", 4, 12345, 60, nil, log)
		session.JoinLobbySlot(0, "Player1", "1", nil)
		session.LobbyState.HostPlayerID = 1

		err := session.StartGame()
		if err == nil {
			t.Error("expected error for starting game with only 1 player")
		}
	})

	t.Run("StartGame fails if already started", func(t *testing.T) {
		session := NewGameSession("test", 4, 12345, 60, nil, log)
		session.JoinLobbySlot(0, "Player1", "1", nil)
		session.JoinLobbySlot(1, "Player2", "2", nil)
		session.LobbyState.HostPlayerID = 1

		session.StartGame()
		err := session.StartGame()

		if err == nil {
			t.Error("expected error for starting already started game")
		}
	})

	t.Run("SerializeLobbyState returns correct data", func(t *testing.T) {
		session := NewGameSession("test", 3, 12345, 60, nil, log)
		session.JoinLobbySlot(0, "Player1", "1", nil)
		session.LobbyState.HostPlayerID = 1
		session.SetSlotAI(1, AITypeBasic, 1)

		data := session.SerializeLobbyState()

		if data["type"] != "lobbyState" {
			t.Errorf("expected type lobbyState, got %v", data["type"])
		}
		if data["maxPlayers"] != 3 {
			t.Errorf("expected maxPlayers 3, got %v", data["maxPlayers"])
		}
		if data["hostPlayerID"] != 1 {
			t.Errorf("expected hostPlayerID 1, got %v", data["hostPlayerID"])
		}

		canStart, ok := data["canStart"].(bool)
		if !ok || !canStart {
			t.Error("expected canStart to be true with 1 player + 1 AI")
		}
	})
}

func TestAIStrategyCreation(t *testing.T) {
	t.Run("BasicAI strategy is created correctly", func(t *testing.T) {
		slot := NewSlot(0, false)
		slot.SetAI(AITypeBasic)

		strategy := slot.CreateAIStrategy()
		if _, ok := strategy.(*game.BasicAI); !ok {
			t.Errorf("expected BasicAI, got %T", strategy)
		}
	})

	t.Run("RestOnlyAI strategy is created correctly", func(t *testing.T) {
		slot := NewSlot(0, false)
		slot.SetAI(AITypeRestOnly)

		strategy := slot.CreateAIStrategy()
		if _, ok := strategy.(*game.RestOnlyAI); !ok {
			t.Errorf("expected RestOnlyAI, got %T", strategy)
		}
	})

	t.Run("AI strategy returns correct name", func(t *testing.T) {
		basicSlot := NewSlot(0, false)
		basicSlot.SetAI(AITypeBasic)
		basicStrategy := basicSlot.CreateAIStrategy()

		if basicStrategy.GetName() != "BasicAI" {
			t.Errorf("expected BasicAI name, got %s", basicStrategy.GetName())
		}

		restSlot := NewSlot(1, false)
		restSlot.SetAI(AITypeRestOnly)
		restStrategy := restSlot.CreateAIStrategy()

		if restStrategy.GetName() != "RestOnlyAI" {
			t.Errorf("expected RestOnlyAI name, got %s", restStrategy.GetName())
		}
	})
}

func TestLobbyBroadcast(t *testing.T) {
	t.Run("BroadcastLobbyState sends data", func(t *testing.T) {
		log := logger.NewNopLogger()
		session := NewGameSession("test", 2, 12345, 60, nil, log)

		// This is a smoke test - we can't easily test actual broadcasting
		// without more complex mocking, but we can ensure it doesn't panic
		session.BroadcastLobbyState()
	})

	t.Run("SerializeLobbyState is valid JSON", func(t *testing.T) {
		log := logger.NewNopLogger()
		session := NewGameSession("test", 2, 12345, 60, nil, log)
		session.JoinLobbySlot(0, "Player1", "1", nil)

		data := session.SerializeLobbyState()
		_, err := json.Marshal(data)

		if err != nil {
			t.Errorf("failed to marshal lobby state: %v", err)
		}
	})
}
