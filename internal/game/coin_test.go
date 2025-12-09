package game

import (
	"testing"
)

// TestCreateCoinCards verifies coins are created in correct order
func TestCreateCoinCards(t *testing.T) {
	coins := CreateCoinCards()

	if len(coins) != 2 {
		t.Fatalf("Expected 2 coins, got %d", len(coins))
	}

	// Verify copper coin (3 points) is at index 0
	copperCoin := coins[0]
	if copperCoin.Points != 3 {
		t.Errorf("Expected copper coin (index 0) to have 3 points, got %d", copperCoin.Points)
	}
	if copperCoin.Name != "coin_3" {
		t.Errorf("Expected copper coin (index 0) to be named 'coin_3', got '%s'", copperCoin.Name)
	}

	// Verify silver coin (1 point) is at index 1
	silverCoin := coins[1]
	if silverCoin.Points != 1 {
		t.Errorf("Expected silver coin (index 1) to have 1 point, got %d", silverCoin.Points)
	}
	if silverCoin.Name != "coin_1" {
		t.Errorf("Expected silver coin (index 1) to be named 'coin_1', got '%s'", silverCoin.Name)
	}
}

// TestClaimPointCard_CopperCoin verifies copper coin awarded for position 0
func TestClaimPointCard_CopperCoin(t *testing.T) {
	gs := NewGameState(2, 42)

	// Give player resources to claim first point card
	player := gs.GetCurrentPlayer()
	pointCard := gs.Market.PointCards[0]
	player.Resources.AddAll(pointCard.Requirement, 1)

	// Claim point card at position 0 (should get copper coin with 3 points)
	action := Action{
		Type:      ClaimPointCard,
		CardIndex: 0,
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("Failed to claim point card: %v", err)
	}

	// Verify player received copper coin
	if len(player.Coins) != 1 {
		t.Fatalf("Expected player to have 1 coin, got %d", len(player.Coins))
	}

	coin := player.Coins[0]
	if coin.Points != 3 {
		t.Errorf("Expected coin to have 3 points (copper), got %d", coin.Points)
	}
	if coin.Name != "coin_3" {
		t.Errorf("Expected coin to be 'coin_3' (copper), got '%s'", coin.Name)
	}
}

// TestClaimPointCard_SilverCoin verifies silver coin awarded for position 1
func TestClaimPointCard_SilverCoin(t *testing.T) {
	gs := NewGameState(2, 42)

	// Give player resources to claim second point card
	player := gs.GetCurrentPlayer()
	pointCard := gs.Market.PointCards[1]
	player.Resources.AddAll(pointCard.Requirement, 1)

	// Claim point card at position 1 (should get silver coin with 1 point)
	action := Action{
		Type:      ClaimPointCard,
		CardIndex: 1,
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("Failed to claim point card: %v", err)
	}

	// Verify player received silver coin
	if len(player.Coins) != 1 {
		t.Fatalf("Expected player to have 1 coin, got %d", len(player.Coins))
	}

	coin := player.Coins[0]
	if coin.Points != 1 {
		t.Errorf("Expected coin to have 1 point (silver), got %d", coin.Points)
	}
	if coin.Name != "coin_1" {
		t.Errorf("Expected coin to be 'coin_1' (silver), got '%s'", coin.Name)
	}
}

// TestClaimPointCard_NoCoinForPosition2 verifies no coin awarded for position 2+
func TestClaimPointCard_NoCoinForPosition2(t *testing.T) {
	gs := NewGameState(2, 42)

	// Give player resources to claim third point card
	player := gs.GetCurrentPlayer()
	pointCard := gs.Market.PointCards[2]
	player.Resources.AddAll(pointCard.Requirement, 1)

	// Claim point card at position 2 (should NOT get any coin)
	action := Action{
		Type:      ClaimPointCard,
		CardIndex: 2,
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("Failed to claim point card: %v", err)
	}

	// Verify player did NOT receive any coin
	if len(player.Coins) != 0 {
		t.Errorf("Expected player to have 0 coins for position 2, got %d", len(player.Coins))
	}
}
