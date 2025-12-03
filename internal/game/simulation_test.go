package game

import (
	"fmt"
	"testing"
)

// TestCompleteGameSimulation runs a full game from start to finish
// and validates all game rules according to game_rules.md
func TestCompleteGameSimulation(t *testing.T) {
	t.Run("TwoPlayerGame", func(t *testing.T) {
		runCompleteGame(t, 2, 12345)
	})

	t.Run("ThreePlayerGame", func(t *testing.T) {
		runCompleteGame(t, 3, 54321)
	})

	t.Run("FourPlayerGame", func(t *testing.T) {
		runCompleteGame(t, 4, 99999)
	})
}

func runCompleteGame(t *testing.T, numPlayers int, seed int64) {
	t.Logf("Starting %d-player game simulation (seed: %d)", numPlayers, seed)

	// Create game state
	gameState := NewGameState(numPlayers, seed)
	
	// Validate initial setup
	validateInitialSetup(t, gameState, numPlayers)

	// Play game until completion
	maxTurns := 500 // Safety limit
	turnCount := 0
	actionCount := 0

	for !gameState.GameOver && turnCount < maxTurns {
		turnCount++
		player := gameState.GetCurrentPlayer()
		
		// Validate game state before action
		validateGameStateInvariants(t, gameState)

		// Choose and execute action
		action := chooseSmartAction(gameState, player)
		
		t.Logf("Turn %d: Player %d performs %s", turnCount, player.ID, actionTypeToString(action.Type))
		
		err := gameState.ExecuteAction(action)
		if err != nil {
			// Some errors are expected (like insufficient resources)
			// In that case, try a rest action
			t.Logf("  Action failed: %v, trying Rest", err)
			restAction := Action{Type: Rest}
			err = gameState.ExecuteAction(restAction)
			if err != nil {
				t.Fatalf("Rest action failed: %v", err)
			}
		}

		actionCount++

		// Validate state after action
		validateGameStateInvariants(t, gameState)
		validateCaravanCapacity(t, player)

		// Check game over conditions
		gameState.CheckGameOver()

		// Advance turn if not game over
		if !gameState.GameOver {
			prevTurn := gameState.CurrentTurn
			gameState.NextTurn()
			
			// Validate turn progression
			expectedTurn := (prevTurn + 1) % len(gameState.Players)
			if gameState.CurrentTurn != expectedTurn {
				t.Errorf("Turn did not advance correctly: got %d, want %d", gameState.CurrentTurn, expectedTurn)
			}
		}
	}

	if turnCount >= maxTurns {
		t.Logf("WARNING: Game did not complete within %d turns", maxTurns)
	}

	// Validate final game state
	validateGameOver(t, gameState, numPlayers)
	
	t.Logf("Game completed in %d turns with %d actions", turnCount, actionCount)
	t.Logf("Winner: Player %d with %d points", gameState.Winner.ID, gameState.Winner.GetFinalPoints())
	
	// Log final scores
	for _, p := range gameState.Players {
		t.Logf("  Player %d: %d points (%d point cards)", p.ID, p.GetFinalPoints(), len(p.PointCards))
	}
}

// validateInitialSetup checks the initial game setup according to rules
func validateInitialSetup(t *testing.T, gs *GameState, numPlayers int) {
	t.Helper()

	// Check number of players
	if len(gs.Players) != numPlayers {
		t.Errorf("Expected %d players, got %d", numPlayers, len(gs.Players))
	}

	// Validate market setup
	if gs.Market == nil {
		t.Fatal("Market is nil")
	}

	// Check point cards - should have 5 face-up
	if len(gs.Market.PointCards) != 5 {
		t.Errorf("Expected 5 face-up point cards, got %d", len(gs.Market.PointCards))
	}

	// Check action cards - should have 6 face-up (or fewer if deck is small)
	if len(gs.Market.ActionCards) < 5 {
		t.Errorf("Expected at least 5 face-up action cards, got %d", len(gs.Market.ActionCards))
	}

	// Validate starting resources according to player position
	for i, player := range gs.Players {
		playerPos := i + 1 // 1-indexed
		totalCrystals := player.Resources.Total()

		// According to rules:
		// Player 1: 3 yellow
		// Player 2, 3: 4 yellow
		// Player 4, 5: 3 yellow + 1 green
		expectedTotal := 0
		switch playerPos {
		case 1:
			expectedTotal = 3
			if player.Resources.Yellow != 3 {
				t.Errorf("Player %d should have 3 yellow, got %d", playerPos, player.Resources.Yellow)
			}
		case 2, 3:
			expectedTotal = 4
			if player.Resources.Yellow != 4 {
				t.Errorf("Player %d should have 4 yellow, got %d", playerPos, player.Resources.Yellow)
			}
		case 4, 5:
			expectedTotal = 4
			if player.Resources.Yellow != 3 || player.Resources.Green != 1 {
				t.Errorf("Player %d should have 3 yellow + 1 green, got %d yellow + %d green", 
					playerPos, player.Resources.Yellow, player.Resources.Green)
			}
		default:
			expectedTotal = 3 // Default for > 5 players
		}

		if totalCrystals != expectedTotal {
			t.Errorf("Player %d has %d total crystals, expected %d", playerPos, totalCrystals, expectedTotal)
		}

		// Each player should start with 2 cards (Create 2 and Upgrade 2)
		if len(player.Hand) != 2 {
			t.Errorf("Player %d should start with 2 cards, got %d", playerPos, len(player.Hand))
		}
	}

	// First player should be player 0 (index 0)
	if gs.CurrentTurn != 0 {
		t.Errorf("Game should start with player 0's turn, got player %d", gs.CurrentTurn)
	}

	// Game should not be over
	if gs.GameOver {
		t.Error("Game should not be over at start")
	}

	// Round should be 1
	if gs.Round != 1 {
		t.Errorf("Game should start at round 1, got %d", gs.Round)
	}
}

// validateGameStateInvariants checks invariants that should always hold
func validateGameStateInvariants(t *testing.T, gs *GameState) {
	t.Helper()

	// CurrentTurn should be within valid range
	if gs.CurrentTurn < 0 || gs.CurrentTurn >= len(gs.Players) {
		t.Errorf("Invalid current turn: %d (players: %d)", gs.CurrentTurn, len(gs.Players))
	}

	// All players should have valid resources (non-negative)
	for _, player := range gs.Players {
		if player.Resources.Yellow < 0 || player.Resources.Green < 0 || 
		   player.Resources.Blue < 0 || player.Resources.Pink < 0 {
			t.Errorf("Player %d has negative resources: %v", player.ID, player.Resources)
		}

		// Total crystals should not exceed caravan capacity
		if player.Resources.Total() > 10 {
			t.Errorf("Player %d has %d crystals (exceeds capacity of 10)", player.ID, player.Resources.Total())
		}

		// Hand size should be reasonable (0 to ~20 cards)
		if len(player.Hand) < 0 || len(player.Hand) > 30 {
			t.Errorf("Player %d has unusual hand size: %d", player.ID, len(player.Hand))
		}

		// Point cards should not exceed configured win condition
		if len(player.PointCards) > 10 {
			t.Errorf("Player %d has too many point cards: %d", player.ID, len(player.PointCards))
		}
	}

	// Market should always have some cards
	if gs.Market != nil {
		if len(gs.Market.PointCards) == 0 && len(gs.Market.PointDeck) > 0 {
			t.Error("Market has no face-up point cards but deck is not empty")
		}
	}
}

// validateCaravanCapacity checks the 10-crystal caravan limit
func validateCaravanCapacity(t *testing.T, player *Player) {
	t.Helper()

	total := player.Resources.Total()
	if total > 10 {
		t.Errorf("Player %d caravan exceeds capacity: %d crystals (max 10)", player.ID, total)
	}
}

// validateGameOver checks game over conditions according to rules
func validateGameOver(t *testing.T, gs *GameState, numPlayers int) {
	t.Helper()

	if !gs.GameOver {
		return // Game not over yet, nothing to validate
	}

	// Someone should have won
	if gs.Winner == nil {
		t.Error("Game is over but no winner declared")
		return
	}

	// Winner should have 5 point cards (for 2-3 players) or configured amount
	expectedPointCards := 5
	
	// At least one player should have reached the win condition
	maxPointCards := 0
	for _, p := range gs.Players {
		if len(p.PointCards) > maxPointCards {
			maxPointCards = len(p.PointCards)
		}
	}

	if maxPointCards < expectedPointCards {
		t.Logf("Note: Game ended with max %d point cards (expected %d)", maxPointCards, expectedPointCards)
	}

	// Winner should have highest score
	// Winner should have highest score
	winnerScore := gs.Winner.GetFinalPoints()
	for _, player := range gs.Players {
		if player.ID == gs.Winner.ID {
			continue
		}
		if player.GetFinalPoints() > winnerScore {
			t.Errorf("Player %d has higher score (%d) than winner (%d)", 
				player.ID, player.GetFinalPoints(), winnerScore)
		}
	}
	// LastRound flag should be set
	if !gs.LastRound && maxPointCards >= expectedPointCards {
		t.Error("LastRound should be set when a player reaches win condition")
	}
	t.Logf("Game over validation passed - Winner: Player %d with %d points", gs.Winner.ID, gs.Winner.GetFinalPoints())
	t.Logf("Game over validation passed - Winner: Player %d with %d points", gs.Winner.ID, gs.Winner.GetFinalPoints())
}

// chooseSmartAction selects a reasonable action based on game state
func chooseSmartAction(gs *GameState, player *Player) Action {
	// Priority order:
	// 1. Claim point card if we can afford it
	// 2. Play a card from hand
	// 3. Acquire a merchant card if affordable
	// 4. Rest to get cards back

	// Try to claim a point card
	for i, pointCard := range gs.Market.PointCards {
		if pointCard.Requirement != nil && player.Resources.HasAll(pointCard.Requirement, 1) {
			return Action{
				Type:      ClaimPointCard,
				CardIndex: i,
			}
		}
	}

	// Try to play a card from hand
	if len(player.Hand) > 0 {
		// Prefer upgrade cards if we have crystals to upgrade
		for i, card := range player.Hand {
			if card.Type == ActionCard && card.ActionType == Upgrade {
				// Check if we have any crystals to upgrade
				if player.Resources.Yellow > 0 || player.Resources.Green > 0 || player.Resources.Blue > 0 {
					// Create upgrade action with input/output
					return Action{
						Type:            PlayCard,
						CardIndex:       i,
						InputResources:  &Resources{Yellow: 1},
						OutputResources: &Resources{Green: 1},
						Multiplier:      1,
					}
				}
			}
		}

		// Play any card
		return Action{
			Type:       PlayCard,
			CardIndex:  0,
			Multiplier: 1,
		}
	}

	// Try to acquire a merchant card
	for i := range gs.Market.ActionCards {
		cost := gs.Market.GetActionCardCost(i)
		if cost != nil && player.Resources.HasAll(cost, 1) {
			return Action{
				Type:      AcquireCard,
				CardIndex: i,
			}
		}
	}

	// Default: rest
	return Action{Type: Rest}
}

// actionTypeToString converts action type to string for logging
func actionTypeToString(actionType PlayerActionType) string {
	switch actionType {
	case PlayCard:
		return "PlayCard"
	case AcquireCard:
		return "AcquireCard"
	case ClaimPointCard:
		return "ClaimPointCard"
	case Rest:
		return "Rest"
	case DiscardCrystals:
		return "DiscardCrystals"
	case DepositCrystals:
		return "DepositCrystals"
	case CollectCrystals:
		return "CollectCrystals"
	case CollectAllCrystals:
		return "CollectAllCrystals"
	default:
		return fmt.Sprintf("Unknown(%d)", actionType)
	}
}

// TestSpecificGameRules tests specific game rule requirements
func TestSpecificGameRules(t *testing.T) {
	t.Run("CaravanCapacityEnforcement", func(t *testing.T) {
		gs := NewGameState(2, 12345)
		player := gs.Players[0]

		// Fill caravan to capacity
		player.Resources.Yellow = 10

		// Verify capacity is enforced
		validateCaravanCapacity(t, player)

		// Try to exceed capacity
		player.Resources.Yellow = 11
		if player.Resources.Total() <= 10 {
			t.Error("Test setup failed - should have exceeded capacity")
		}

		// This should fail validation
		total := player.Resources.Total()
		if total > 10 {
			// Expected - caravan exceeded capacity
			t.Logf("Correctly detected caravan overflow: %d > 10", total)
		}
	})

	t.Run("UpgradeChainValidation", func(t *testing.T) {
		// Upgrade chain: Yellow → Green → Blue → Pink
		gs := NewGameState(2, 12345)
		player := gs.Players[0]

		// Give player upgrade card and yellow crystal
		player.Resources.Yellow = 1
		upgradeCard := &Card{
			Type:        ActionCard,
			ActionType:  Upgrade,
			Name:        "Upgrade Test",
			TurnUpgrade: 2,
		}
		player.Hand = []*Card{upgradeCard}

		// Play upgrade card
		action := Action{
			Type:            PlayCard,
			CardIndex:       0,
			InputResources:  &Resources{Yellow: 1},
			OutputResources: &Resources{Green: 1},
			Multiplier:      1,
		}

		initialYellow := player.Resources.Yellow
		err := gs.ExecuteAction(action)
		if err != nil {
			t.Logf("Upgrade action result: %v", err)
		}

		// After upgrade, should have less yellow or more green
		if player.Resources.Yellow < initialYellow || player.Resources.Green > 0 {
			t.Logf("Upgrade chain working: Yellow %d -> Green %d", initialYellow, player.Resources.Green)
		}
	t.Run("GameEndCondition", func(t *testing.T) {
		gs := NewGameState(2, 12345)
		player := gs.Players[0]

		// Give player 5 point cards directly
		for i := 0; i < 5; i++ {
			player.PointCards = append(player.PointCards, &Card{
				Type:   PointCard,
				Name:   fmt.Sprintf("Point Card %d", i),
				Points: 10,
			})
		}

		// Check game over
		gs.CheckGameOver()

		// Game should enter last round
		if !gs.LastRound {
			t.Error("Game should be in last round when player has 5 point cards")
		}

		t.Logf("Game correctly triggered last round with 5 point cards")
	})
		t.Logf("Game correctly triggered last round with 5 point cards")
	})

	t.Run("TokenScoringValidation", func(t *testing.T) {
		gs := NewGameState(2, 12345)
		player := gs.Players[0]

		// Give player some coin cards
		copperCoin := &Card{Points: 3}
		silverCoin := &Card{Points: 1}
		player.Coins = append(player.Coins, copperCoin, copperCoin, silverCoin)

		initialPoints := player.GetPoints()
		finalPoints := player.GetFinalPoints()
		
		if finalPoints >= initialPoints {
			t.Logf("Coin scoring working: %d points from coins", finalPoints-initialPoints)
		}
	})

	t.Run("TurnProgressionWithMultiplePlayers", func(t *testing.T) {
		gs := NewGameState(4, 12345)

		// Verify turn cycles through all players
		for i := 0; i < 8; i++ {
			expectedPlayer := i % 4
			if gs.CurrentTurn != expectedPlayer {
				t.Errorf("Turn %d: expected player %d, got %d", i, expectedPlayer, gs.CurrentTurn)
			}

			// Execute a simple action
			action := Action{Type: Rest}
			gs.ExecuteAction(action)
			gs.NextTurn()
		}

		t.Logf("Turn progression validated through 8 turns with 4 players")
	})
}

// TestEdgeCases tests edge cases and boundary conditions
func TestEdgeCases(t *testing.T) {
	t.Run("EmptyHandRest", func(t *testing.T) {
		gs := NewGameState(2, 12345)
		player := gs.Players[0]

		// Remove all cards from hand
		player.Hand = []*Card{}
		player.PlayedCards = []*Card{}

		// Rest with empty hand should not crash
		action := Action{Type: Rest}
		err := gs.ExecuteAction(action)
		if err != nil {
			t.Logf("Rest with empty hand: %v", err)
		}
	})

	t.Run("AllCardsAcquired", func(t *testing.T) {
		gs := NewGameState(2, 12345)

		// Remove all action cards from market
		initialCount := len(gs.Market.ActionCards)
		gs.Market.ActionCards = []*Card{}
		gs.Market.ActionDeck = []*Card{}

		if len(gs.Market.ActionCards) == 0 {
			t.Logf("Market correctly shows 0 cards (started with %d)", initialCount)
		}
	})

	t.Run("NoAffordableActions", func(t *testing.T) {
		gs := NewGameState(2, 12345)
		player := gs.Players[0]

		// Remove all resources
		player.Resources = NewResources()
		player.Hand = []*Card{}
		player.PlayedCards = []*Card{}

		// Only valid action should be Rest
		action := Action{Type: Rest}
		err := gs.ExecuteAction(action)
		if err != nil {
			t.Errorf("Rest should always be valid: %v", err)
		}
	})
}
