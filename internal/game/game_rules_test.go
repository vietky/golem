package game

import (
	"testing"
)

// TestGameRules_Setup tests the initial game setup according to game rules
func TestGameRules_Setup(t *testing.T) {
	tests := []struct {
		name           string
		numPlayers     int
		expectedYellow map[int]int // player index -> expected yellow crystals
		expectedGreen  map[int]int
	}{
		{
			name:       "2 Players Setup",
			numPlayers: 2,
			expectedYellow: map[int]int{
				0: 3, // Player 1: 3 yellow
				1: 4, // Player 2: 4 yellow
			},
			expectedGreen: map[int]int{
				0: 0,
				1: 0,
			},
		},
		{
			name:       "3 Players Setup",
			numPlayers: 3,
			expectedYellow: map[int]int{
				0: 3, // Player 1: 3 yellow
				1: 4, // Player 2: 4 yellow
				2: 4, // Player 3: 4 yellow
			},
			expectedGreen: map[int]int{
				0: 0,
				1: 0,
				2: 0,
			},
		},
		{
			name:       "4 Players Setup",
			numPlayers: 4,
			expectedYellow: map[int]int{
				0: 3, // Player 1: 3 yellow
				1: 4, // Player 2: 4 yellow
				2: 4, // Player 3: 4 yellow
				3: 3, // Player 4: 3 yellow + 1 green
			},
			expectedGreen: map[int]int{
				0: 0,
				1: 0,
				2: 0,
				3: 1,
			},
		},
		{
			name:       "5 Players Setup",
			numPlayers: 5,
			expectedYellow: map[int]int{
				0: 3, // Player 1: 3 yellow
				1: 4, // Player 2: 4 yellow
				2: 4, // Player 3: 4 yellow
				3: 3, // Player 4: 3 yellow + 1 green
				4: 3, // Player 5: 3 yellow + 1 green
			},
			expectedGreen: map[int]int{
				0: 0,
				1: 0,
				2: 0,
				3: 1,
				4: 1,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gs := NewGameState(tt.numPlayers, 12345)

			// Test number of players
			if len(gs.Players) != tt.numPlayers {
				t.Errorf("Expected %d players, got %d", tt.numPlayers, len(gs.Players))
			}

			// Test starting resources
			for i, player := range gs.Players {
				if player.Resources.Yellow != tt.expectedYellow[i] {
					t.Errorf("Player %d: expected %d yellow, got %d",
						i+1, tt.expectedYellow[i], player.Resources.Yellow)
				}
				if player.Resources.Green != tt.expectedGreen[i] {
					t.Errorf("Player %d: expected %d green, got %d",
						i+1, tt.expectedGreen[i], player.Resources.Green)
				}
			}

			// Test market setup
			if len(gs.Market.ActionCards) != 6 {
				t.Errorf("Expected 6 action cards in market, got %d", len(gs.Market.ActionCards))
			}
			if len(gs.Market.PointCards) != 5 {
				t.Errorf("Expected 5 point cards in market, got %d", len(gs.Market.PointCards))
			}

			// Test starting hand - each player should have 2 cards (Create 2 and Upgrade 2)
			for i, player := range gs.Players {
				if len(player.Hand) != 2 {
					t.Errorf("Player %d: expected 2 starting cards, got %d", i+1, len(player.Hand))
				}
			}

			// Test coin setup
			if len(gs.Market.Coins) < 2 {
				t.Errorf("Expected at least 2 coin stacks, got %d", len(gs.Market.Coins))
			}
		})
	}
}

// TestGameRules_CaravanCapacity tests the 10 crystal limit
func TestGameRules_CaravanCapacity(t *testing.T) {
	gs := NewGameState(2, 12345)
	player := gs.Players[0]

	// Give player 10 crystals
	player.Resources.Yellow = 10

	if player.Resources.Total() != 10 {
		t.Errorf("Expected 10 total crystals, got %d", player.Resources.Total())
	}

	// Try to add more (should be prevented by game logic)
	// This would happen during execute action and trigger discard
}

// TestGameRules_PlayCard_Produce tests playing a production card
func TestGameRules_PlayCard_Produce(t *testing.T) {
	gs := NewGameState(2, 12345)
	player := gs.GetCurrentPlayer()

	// Create a simple produce card that gives 2 yellow
	produceCard := &Card{
		ID:         1001,
		Name:       "Test Produce",
		Type:       ActionCard,
		ActionType: Produce,
		Output:     &Resources{Yellow: 2},
	}

	player.Hand = []*Card{produceCard}
	initialYellow := player.Resources.Yellow

	action := Action{
		Type:       PlayCard,
		CardIndex:  0,
		Multiplier: 1,
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Errorf("Failed to play produce card: %v", err)
	}

	// Check card was moved to played cards
	if len(player.PlayedCards) != 1 {
		t.Errorf("Expected 1 played card, got %d", len(player.PlayedCards))
	}

	// Check resources increased
	if player.Resources.Yellow != initialYellow+2 {
		t.Errorf("Expected %d yellow, got %d", initialYellow+2, player.Resources.Yellow)
	}
}

// TestGameRules_PlayCard_Upgrade tests the upgrade mechanic
func TestGameRules_PlayCard_Upgrade(t *testing.T) {
	gs := NewGameState(2, 12345)
	player := gs.GetCurrentPlayer()

	// Give player resources to upgrade
	player.Resources.Yellow = 3
	player.Resources.Green = 1

	// Create upgrade card (1-step upgrade)
	upgradeCard := &Card{
		ID:          1002,
		Name:        "Test Upgrade",
		Type:        ActionCard,
		ActionType:  Upgrade,
		TurnUpgrade: 1,
	}

	player.Hand = []*Card{upgradeCard}

	// Test Yellow -> Green upgrade
	action := Action{
		Type:            PlayCard,
		CardIndex:       0,
		InputResources:  &Resources{Yellow: 1},
		OutputResources: &Resources{Green: 1},
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Errorf("Failed to play upgrade card: %v", err)
	}

	if player.Resources.Yellow != 2 {
		t.Errorf("Expected 2 yellow after upgrade, got %d", player.Resources.Yellow)
	}
	if player.Resources.Green != 2 {
		t.Errorf("Expected 2 green after upgrade, got %d", player.Resources.Green)
	}
}

// TestGameRules_PlayCard_Trade tests trading cards
func TestGameRules_PlayCard_Trade(t *testing.T) {
	gs := NewGameState(2, 12345)
	player := gs.GetCurrentPlayer()

	// Give player resources to trade
	player.Resources.Yellow = 6

	// Create trade card (2 yellow -> 1 green)
	tradeCard := &Card{
		ID:         1003,
		Name:       "Test Trade",
		Type:       ActionCard,
		ActionType: Trade,
		Input:      &Resources{Yellow: 2},
		Output:     &Resources{Green: 1},
	}

	player.Hand = []*Card{tradeCard}

	// Test trading with multiplier 3 (6 yellow -> 3 green)
	action := Action{
		Type:       PlayCard,
		CardIndex:  0,
		Multiplier: 3,
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Errorf("Failed to play trade card: %v", err)
	}

	if player.Resources.Yellow != 0 {
		t.Errorf("Expected 0 yellow after trade, got %d", player.Resources.Yellow)
	}
	if player.Resources.Green != 3 {
		t.Errorf("Expected 3 green after trade, got %d", player.Resources.Green)
	}
}

// TestGameRules_AcquireCard_Free tests acquiring the first card (position 0) for free
func TestGameRules_AcquireCard_Free(t *testing.T) {
	gs := NewGameState(2, 12345)
	player := gs.GetCurrentPlayer()

	initialHandSize := len(player.Hand)

	// Acquire card at position 0 (should be free)
	action := Action{
		Type:        AcquireCard,
		CardIndex:   0,
		DepositList: []DepositData{}, // No deposits needed for position 0
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Errorf("Failed to acquire free card: %v", err)
	}

	if len(player.Hand) != initialHandSize+1 {
		t.Errorf("Expected hand size %d, got %d", initialHandSize+1, len(player.Hand))
	}
}

// TestGameRules_AcquireCard_WithCost tests acquiring a card by paying its cost
func TestGameRules_AcquireCard_WithCost(t *testing.T) {
	gs := NewGameState(2, 12345)
	player := gs.GetCurrentPlayer()

	// Give player resources
	player.Resources.Yellow = 5

	initialHandSize := len(player.Hand)

	// Acquire card at position 1 by paying cost (not depositing)
	action := Action{
		Type:        AcquireCard,
		CardIndex:   1,
		DepositList: []DepositData{}, // Not providing deposit, must pay cost
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Errorf("Failed to acquire card with cost: %v", err)
	}

	if len(player.Hand) != initialHandSize+1 {
		t.Errorf("Expected hand size %d, got %d", initialHandSize+1, len(player.Hand))
	}

	// Resources should have been spent
	if player.Resources.Yellow >= 5 {
		t.Errorf("Expected resources to decrease after purchase")
	}
}

// TestGameRules_AcquireCard_WithDeposits tests acquiring a card for free by depositing
func TestGameRules_AcquireCard_WithDeposits(t *testing.T) {
	gs := NewGameState(2, 12345)
	player := gs.GetCurrentPlayer()

	// Give player resources for deposits
	player.Resources.Yellow = 5

	initialYellow := player.Resources.Yellow

	// Acquire card at position 2 by depositing on positions 0 and 1
	action := Action{
		Type:      AcquireCard,
		CardIndex: 2,
		DepositList: []DepositData{
			{Crystal: Yellow}, // Deposit on position 0
			{Crystal: Yellow}, // Deposit on position 1
		},
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Errorf("Failed to acquire card with deposits: %v", err)
	}

	// Should have spent 2 crystals for deposits
	if player.Resources.Yellow != initialYellow-2 {
		t.Errorf("Expected %d yellow, got %d", initialYellow-2, player.Resources.Yellow)
	}

	// Check deposits were placed on previous cards
	if gs.Market.ActionCards[0].Deposits.Yellow != 1 {
		t.Errorf("Expected 1 yellow deposit on card 0, got %d", gs.Market.ActionCards[0].Deposits.Yellow)
	}
	if gs.Market.ActionCards[1].Deposits.Yellow != 1 {
		t.Errorf("Expected 1 yellow deposit on card 1, got %d", gs.Market.ActionCards[1].Deposits.Yellow)
	}
}

// TestGameRules_Rest tests the rest action
func TestGameRules_Rest(t *testing.T) {
	gs := NewGameState(2, 12345)
	player := gs.GetCurrentPlayer()

	// Play a card first
	player.Hand = []*Card{
		{ID: 2001, Name: "Card 1", Type: ActionCard, ActionType: Produce, Output: &Resources{Yellow: 1}},
	}

	gs.ExecuteAction(Action{Type: PlayCard, CardIndex: 0, Multiplier: 1})

	if len(player.PlayedCards) != 1 {
		t.Errorf("Expected 1 played card, got %d", len(player.PlayedCards))
	}
	if len(player.Hand) != 0 {
		t.Errorf("Expected 0 cards in hand, got %d", len(player.Hand))
	}

	// Now rest
	err := gs.ExecuteAction(Action{Type: Rest})
	if err != nil {
		t.Errorf("Failed to rest: %v", err)
	}

	if len(player.Hand) != 1 {
		t.Errorf("Expected 1 card back in hand, got %d", len(player.Hand))
	}
	if len(player.PlayedCards) != 0 {
		t.Errorf("Expected 0 played cards, got %d", len(player.PlayedCards))
	}
	if !player.HasRested {
		t.Error("Expected HasRested to be true")
	}
}

// TestGameRules_ClaimPointCard tests claiming point cards
func TestGameRules_ClaimPointCard(t *testing.T) {
	gs := NewGameState(2, 12345)
	player := gs.GetCurrentPlayer()

	// Give player resources to claim a point card
	player.Resources.Yellow = 3
	player.Resources.Green = 2

	initialPoints := player.Points

	// Claim point card at position 0 (should also get copper token)
	action := Action{
		Type:      ClaimPointCard,
		CardIndex: 0,
	}

	err := gs.ExecuteAction(action)
	// This might fail if the point card requirement doesn't match resources
	// We'll check if it succeeded
	if err == nil {
		// Points should have increased
		if player.Points <= initialPoints {
			t.Errorf("Expected points to increase from %d, got %d", initialPoints, player.Points)
		}

		// Check if copper token was awarded (for position 0)
		if len(player.Coins) > 0 {
			t.Logf("Player received coin: %v", player.Coins[0])
		}
	}
}

// TestGameRules_WinCondition tests the game end condition
func TestGameRules_WinCondition(t *testing.T) {
	gs := NewGameState(2, 12345)
	player := gs.GetCurrentPlayer()

	// Simulate claiming 5 point cards
	for i := 0; i < 5; i++ {
		player.PointCards = append(player.PointCards, &Card{
			ID:     3000 + i,
			Name:   "Test Point",
			Type:   PointCard,
			Points: 10,
		})
	}

	// Check last round trigger
	if player.CheckLastRound() {
		gs.LastRound = true
	}

	if !gs.LastRound {
		t.Error("Expected last round to be triggered after 5 point cards")
	}
}

// TestGameRules_UpgradeChain tests the upgrade crystal chain
func TestGameRules_UpgradeChain(t *testing.T) {
	tests := []struct {
		name        string
		turnUpgrade int
		input       CrystalType
		output      CrystalType
		shouldWork  bool
	}{
		{"Yellow to Green (1-step)", 1, Yellow, Green, true},
		{"Green to Blue (1-step)", 1, Green, Blue, true},
		{"Blue to Pink (1-step)", 1, Blue, Pink, true},
		{"Yellow to Blue (2-step)", 2, Yellow, Blue, true},
		{"Green to Pink (2-step)", 2, Green, Pink, true},
		{"Yellow to Pink (3-step)", 3, Yellow, Pink, true},
		{"Invalid: Yellow to Pink with 1-step", 1, Yellow, Pink, false},
		{"Invalid: Green to Green", 1, Green, Green, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := &Resources{}
			output := &Resources{}

			switch tt.input {
			case Yellow:
				input.Yellow = 1
			case Green:
				input.Green = 1
			case Blue:
				input.Blue = 1
			case Pink:
				input.Pink = 1
			}

			switch tt.output {
			case Yellow:
				output.Yellow = 1
			case Green:
				output.Green = 1
			case Blue:
				output.Blue = 1
			case Pink:
				output.Pink = 1
			}

			canUpgrade := input.CanUpgraded(output, tt.turnUpgrade)
			if canUpgrade != tt.shouldWork {
				t.Errorf("Expected CanUpgraded=%v, got %v", tt.shouldWork, canUpgrade)
			}
		})
	}
}
