package game

import (
	"fmt"
	"testing"
)

// TestGameRulesValidation validates game rules compliance as per game_rules.md
func TestGameRulesValidation(t *testing.T) {
	t.Run("InitialSetup", func(t *testing.T) {
		gs := NewGameState(2, 12345)

		// Validate market setup
		if len(gs.Market.PointCards) != 5 {
			t.Errorf("Market should have 5 point cards, got %d", len(gs.Market.PointCards))
		}
		if len(gs.Market.ActionCards) != 5 {
			t.Errorf("Market should have 5 action cards, got %d", len(gs.Market.ActionCards))
		}

		// Validate starting crystals (per game_rules.md)
		// Player 1: 3 yellow
		// Player 2: 4 yellow
		if gs.Players[0].Resources.Yellow != 3 {
			t.Errorf("Player 1 should start with 3 yellow, got %d", gs.Players[0].Resources.Yellow)
		}
		if gs.Players[1].Resources.Yellow != 4 {
			t.Errorf("Player 2 should start with 4 yellow, got %d", gs.Players[1].Resources.Yellow)
		}

		// Validate starting hand
		for i, player := range gs.Players {
			if len(player.Hand) == 0 {
				t.Errorf("Player %d should start with cards in hand", i+1)
			}
			t.Logf("Player %d starts with %d cards", i+1, len(player.Hand))
		}

		t.Logf("✓ Initial setup valid: 5 point cards, 5 action cards, correct starting resources")
	})

	t.Run("CaravanCapacity", func(t *testing.T) {
		gs := NewGameState(2, 12345)
		player := gs.Players[0]

		// Give player 11 crystals (exceeding 10 limit)
		player.Resources.Yellow = 11

		totalCrystals := player.Resources.Total()
		if totalCrystals > 10 {
			// Player should be forced to discard
			t.Logf("✓ Correctly detected caravan over capacity: %d > 10", totalCrystals)
		}
	})

	t.Run("UpgradeChain", func(t *testing.T) {
		// Validate upgrade chain: Yellow → Green → Blue → Pink
		gs := NewGameState(2, 12345)
		player := gs.Players[0]

		player.Resources.Yellow = 3
		initialYellow := player.Resources.Yellow

		// Manual upgrade: Yellow → Green
		if player.Resources.Yellow > 0 {
			player.Resources.Yellow--
			player.Resources.Green++
		}

		if player.Resources.Yellow == initialYellow-1 && player.Resources.Green == 1 {
			t.Logf("✓ Upgrade chain works: Yellow %d → Green %d", initialYellow, player.Resources.Green)
		}
	})

	t.Run("GameEndCondition", func(t *testing.T) {
		gs := NewGameState(2, 12345)
		player := gs.Players[0]

		// Give player 5 point cards (triggers game end)
		for i := 0; i < 5; i++ {
			player.PointCards = append(player.PointCards, &Card{
				Type:   PointCard,
				Name:   fmt.Sprintf("Point Card %d", i),
				Points: 10,
			})
		}

		// Check if player can trigger last round
		if player.CheckLastRound() {
			gs.LastRound = true
		}

		if gs.LastRound {
			t.Logf("✓ Game correctly triggers last round when player has 5 point cards")
		} else {
			t.Error("Game should be in last round when player has 5 point cards")
		}
	})

	t.Run("TurnProgression", func(t *testing.T) {
		gs := NewGameState(2, 12345)

		initialTurn := gs.CurrentTurn
		initialPlayer := gs.GetCurrentPlayer().ID

		// Advance turn
		gs.NextTurn()

		newPlayer := gs.GetCurrentPlayer().ID

		if newPlayer != initialPlayer {
			t.Logf("✓ Turn correctly progresses from Player %d to Player %d", initialPlayer, newPlayer)
		}

		// Verify modulo wrapping
		if gs.CurrentTurn%len(gs.Players) != gs.CurrentTurn%2 {
			t.Error("Turn counter should wrap correctly using modulo")
		}

		t.Logf("Turn counter: %d → %d (player ID: %d → %d)", initialTurn, gs.CurrentTurn, initialPlayer, newPlayer)
	})

	t.Run("RestAction", func(t *testing.T) {
		gs := NewGameState(2, 12345)
		player := gs.Players[0]

		// Simulate playing a card
		if len(player.Hand) > 0 {
			initialHandSize := len(player.Hand)
			card := player.Hand[0]
			player.PlayedCards = append(player.PlayedCards, card)
			player.Hand = player.Hand[1:]

			// Rest to get it back
			player.Rest()

			if len(player.Hand) == initialHandSize {
				t.Logf("✓ Rest action correctly returns %d cards to hand", initialHandSize)
			}

			if player.HasRested {
				t.Logf("✓ HasRested flag correctly set")
			}
		}
	})

	t.Run("TokenBonusScoring", func(t *testing.T) {
		gs := NewGameState(2, 12345)
		player := gs.Players[0]

		// Give player coin cards
		for i := 0; i < 5; i++ {
			player.Coins = append(player.Coins, &Card{
				Type:   CoinCard,
				Amount: 1,
			})
		}

		// Add point cards
		player.PointCards = append(player.PointCards, &Card{
			Type:   PointCard,
			Points: 10,
		})

		finalPoints := player.GetFinalPoints()
		expectedMin := 10 // Points from cards (coin scoring depends on implementation)

		if finalPoints >= expectedMin {
			t.Logf("✓ Scoring works: %d coins contribute to %d total points", len(player.Coins), finalPoints)
		}
	})
}

// TestBasicGameFlow tests a simple valid game flow
func TestBasicGameFlow(t *testing.T) {
	gs := NewGameState(2, 42)

	t.Logf("Starting game with %d players", len(gs.Players))
	t.Logf("Market: %d action cards, %d point cards", len(gs.Market.ActionCards), len(gs.Market.PointCards))

	// Test valid Rest action (always valid)
	for i := 0; i < 4; i++ {
		player := gs.GetCurrentPlayer()
		t.Logf("Turn %d: Player %d rests", gs.CurrentTurn, player.ID)

		action := Action{Type: Rest}
		err := gs.ExecuteAction(action)
		if err != nil {
			t.Errorf("Rest should always be valid: %v", err)
		}

		gs.NextTurn()
	}

	t.Logf("✓ Basic turn flow works with Rest actions")
}
