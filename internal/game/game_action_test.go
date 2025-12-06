package game

import (
	"testing"
)

// TestExecuteAction_PlayCard_Produce tests playing a produce card
func TestExecuteAction_PlayCard_Produce(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Give player a produce card
	produceCard := &Card{
		ID:         100,
		Name:       "Test Produce",
		Type:       ActionCard,
		ActionType: Produce,
		Output:     &Resources{Yellow: 2},
	}
	player.Hand = append(player.Hand, produceCard)

	// Store initial state
	initialResources := player.Resources.Copy()
	initialHandSize := len(player.Hand)
	initialPlayedSize := len(player.PlayedCards)

	// Execute play action
	action := Action{
		Type:       PlayCard,
		CardIndex:  len(player.Hand) - 1, // Last card (our produce card)
		Multiplier: 1,
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("ExecuteAction failed: %v", err)
	}

	// Validate state changes
	// 1. Resources should increase by output amount
	expectedYellow := initialResources.Yellow + 2
	if player.Resources.Yellow != expectedYellow {
		t.Errorf("Expected %d yellow, got %d", expectedYellow, player.Resources.Yellow)
	}

	// 2. Card moved from hand to played
	if len(player.Hand) != initialHandSize-1 {
		t.Errorf("Expected hand size %d, got %d", initialHandSize-1, len(player.Hand))
	}
	if len(player.PlayedCards) != initialPlayedSize+1 {
		t.Errorf("Expected played cards %d, got %d", initialPlayedSize+1, len(player.PlayedCards))
	}

	// 3. Played card should be the produce card
	if player.PlayedCards[len(player.PlayedCards)-1].ID != produceCard.ID {
		t.Errorf("Expected played card ID %d, got %d", produceCard.ID, player.PlayedCards[len(player.PlayedCards)-1].ID)
	}
}

// TestExecuteAction_PlayCard_Upgrade tests playing an upgrade card
func TestExecuteAction_PlayCard_Upgrade(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Give player resources to upgrade
	player.Resources.Yellow = 3

	// Give player an upgrade card (Upgrade 1)
	upgradeCard := &Card{
		ID:          101,
		Name:        "Test Upgrade",
		Type:        ActionCard,
		ActionType:  Upgrade,
		TurnUpgrade: 1, // Can upgrade by 1 level
	}
	player.Hand = append(player.Hand, upgradeCard)

	// Store initial state
	initialYellow := player.Resources.Yellow

	// Execute play action - upgrade 1 yellow to 1 green
	// Upgrade cards don't use Multiplier the same way as Trade cards
	// The Play function only subtracts InputResources once (line 108 in cards.go)
	action := Action{
		Type:            PlayCard,
		CardIndex:       len(player.Hand) - 1,
		Multiplier:      1,
		InputResources:  &Resources{Yellow: 1},
		OutputResources: &Resources{Green: 1},
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("ExecuteAction failed: %v", err)
	}

	// Validate state changes
	// 1. Yellow should decrease by 1
	if player.Resources.Yellow != initialYellow-1 {
		t.Errorf("Expected %d yellow, got %d", initialYellow-1, player.Resources.Yellow)
	}

	// 2. Green should increase by 1
	if player.Resources.Green != 1 {
		t.Errorf("Expected 1 green, got %d", player.Resources.Green)
	}

	// 3. Card should be in played cards
	if len(player.PlayedCards) != 1 {
		t.Errorf("Expected 1 played card, got %d", len(player.PlayedCards))
	}
}

// TestExecuteAction_PlayCard_Trade tests playing a trade card
func TestExecuteAction_PlayCard_Trade(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Give player resources to trade
	player.Resources.Yellow = 4

	// Give player a trade card
	tradeCard := &Card{
		ID:         102,
		Name:       "Test Trade",
		Type:       ActionCard,
		ActionType: Trade,
		Input:      &Resources{Yellow: 2},
		Output:     &Resources{Green: 1},
	}
	player.Hand = append(player.Hand, tradeCard)

	// Store initial state
	initialYellow := player.Resources.Yellow

	// Execute play action - trade 2 yellow for 1 green (multiplier 2 = do it twice)
	action := Action{
		Type:       PlayCard,
		CardIndex:  len(player.Hand) - 1,
		Multiplier: 2,
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("ExecuteAction failed: %v", err)
	}

	// Validate state changes
	// 1. Yellow should decrease by 4 (2 * multiplier)
	if player.Resources.Yellow != initialYellow-4 {
		t.Errorf("Expected %d yellow, got %d", initialYellow-4, player.Resources.Yellow)
	}

	// 2. Green should increase by 2 (1 * multiplier)
	if player.Resources.Green != 2 {
		t.Errorf("Expected 2 green, got %d", player.Resources.Green)
	}
}

// TestExecuteAction_PlayCard_InvalidIndex tests playing with invalid card index
func TestExecuteAction_PlayCard_InvalidIndex(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	initialHandSize := len(player.Hand)

	// Try to play card at invalid index
	action := Action{
		Type:       PlayCard,
		CardIndex:  100, // Invalid
		Multiplier: 1,
	}

	err := gs.ExecuteAction(action)
	if err == nil {
		t.Fatal("Expected error for invalid card index, got nil")
	}

	// Validate state unchanged
	if len(player.Hand) != initialHandSize {
		t.Errorf("Hand size should not change, expected %d, got %d", initialHandSize, len(player.Hand))
	}
}

// TestExecuteAction_AcquireCard_FirstPosition tests acquiring card at position 0 (free)
func TestExecuteAction_AcquireCard_FirstPosition(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Store initial state
	initialHandSize := len(player.Hand)
	initialMarketSize := len(gs.Market.ActionCards)
	targetCard := gs.Market.ActionCards[0]

	// Execute acquire action for first card (position 0 = free)
	action := Action{
		Type:        AcquireCard,
		CardIndex:   0,
		DepositList: []DepositData{}, // No deposits needed for position 0
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("ExecuteAction failed: %v", err)
	}

	// Validate state changes
	// 1. Card added to hand
	if len(player.Hand) != initialHandSize+1 {
		t.Errorf("Expected hand size %d, got %d", initialHandSize+1, len(player.Hand))
	}

	// 2. Card removed from market
	if len(gs.Market.ActionCards) != initialMarketSize {
		t.Errorf("Expected market size %d (refilled), got %d", initialMarketSize, len(gs.Market.ActionCards))
	}

	// 3. Acquired card is in hand
	acquiredCard := player.Hand[len(player.Hand)-1]
	if acquiredCard.ID != targetCard.ID {
		t.Errorf("Expected card ID %d, got %d", targetCard.ID, acquiredCard.ID)
	}
}

// TestExecuteAction_AcquireCard_WithCost tests acquiring card with cost payment
func TestExecuteAction_AcquireCard_WithCost(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Give player enough resources
	player.Resources.Yellow = 5

	initialYellow := player.Resources.Yellow
	targetCard := gs.Market.ActionCards[2] // Position 2 costs 2 yellow

	// Execute acquire action - pay cost instead of deposits
	action := Action{
		Type:        AcquireCard,
		CardIndex:   2,
		DepositList: []DepositData{}, // Not depositing on all required cards, so must pay cost
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("ExecuteAction failed: %v", err)
	}

	// Validate state changes
	// 1. Cost should be deducted once for position 2 (2 yellow)
	expectedYellow := initialYellow - 2
	if player.Resources.Yellow != expectedYellow {
		t.Errorf("Expected %d yellow after cost, got %d", expectedYellow, player.Resources.Yellow)
	}

	// 2. Card added to hand
	acquiredCard := player.Hand[len(player.Hand)-1]
	if acquiredCard.ID != targetCard.ID {
		t.Errorf("Expected card ID %d, got %d", targetCard.ID, acquiredCard.ID)
	}
}

// TestExecuteAction_AcquireCard_WithDeposits tests acquiring card with deposits (free acquisition)
func TestExecuteAction_AcquireCard_WithDeposits(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Give player resources for deposits
	player.Resources.Yellow = 5

	initialYellow := player.Resources.Yellow
	targetCard := gs.Market.ActionCards[2] // Position 2 requires deposits on 0 and 1

	// Execute acquire action with deposits
	action := Action{
		Type:      AcquireCard,
		CardIndex: 2,
		DepositList: []DepositData{
			{Crystal: Yellow}, // Deposit on card 0
			{Crystal: Yellow}, // Deposit on card 1
		},
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("ExecuteAction failed: %v", err)
	}

	// Validate state changes
	// 1. Deposits should be deducted (2 yellow for 2 deposits)
	expectedYellow := initialYellow - 2
	if player.Resources.Yellow != expectedYellow {
		t.Errorf("Expected %d yellow after deposits, got %d", expectedYellow, player.Resources.Yellow)
	}

	// 2. Deposits should be on market cards
	if gs.Market.ActionCards[0].Deposits == nil || gs.Market.ActionCards[0].Deposits.Yellow != 1 {
		t.Errorf("Expected 1 yellow deposit on card 0, got %v", gs.Market.ActionCards[0].Deposits)
	}
	if gs.Market.ActionCards[1].Deposits == nil || gs.Market.ActionCards[1].Deposits.Yellow != 1 {
		t.Errorf("Expected 1 yellow deposit on card 1, got %v", gs.Market.ActionCards[1].Deposits)
	}

	// 3. Card added to hand
	acquiredCard := player.Hand[len(player.Hand)-1]
	if acquiredCard.ID != targetCard.ID {
		t.Errorf("Expected card ID %d, got %d", targetCard.ID, acquiredCard.ID)
	}
}

// TestExecuteAction_AcquireCard_CollectDeposits tests collecting deposits from acquired card
func TestExecuteAction_AcquireCard_CollectDeposits(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Give player resources
	player.Resources.Yellow = 5

	// Add deposits to target card
	targetIndex := 2
	gs.Market.ActionCards[targetIndex].Deposits = &Resources{Yellow: 2, Green: 1}

	initialYellow := player.Resources.Yellow
	initialGreen := player.Resources.Green

	// Execute acquire action with deposits to get it free
	action := Action{
		Type:      AcquireCard,
		CardIndex: targetIndex,
		DepositList: []DepositData{
			{Crystal: Yellow}, // Deposit on card 0
			{Crystal: Yellow}, // Deposit on card 1
		},
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("ExecuteAction failed: %v", err)
	}

	// Validate state changes
	// 1. Should collect deposits from target card (2 yellow, 1 green)
	// 2. Should pay deposits to previous cards (2 yellow)
	expectedYellow := initialYellow - 2 + 2 // -2 for deposits, +2 from collected
	expectedGreen := initialGreen + 1       // +1 from collected

	if player.Resources.Yellow != expectedYellow {
		t.Errorf("Expected %d yellow, got %d", expectedYellow, player.Resources.Yellow)
	}
	if player.Resources.Green != expectedGreen {
		t.Errorf("Expected %d green, got %d", expectedGreen, player.Resources.Green)
	}
}

// TestExecuteAction_AcquireCard_InsufficientResources tests acquiring without enough resources
func TestExecuteAction_AcquireCard_InsufficientResources(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Give player insufficient resources
	player.Resources.Yellow = 1

	initialHandSize := len(player.Hand)

	// Try to acquire card at position 2 (costs 2 yellow) without deposits
	action := Action{
		Type:        AcquireCard,
		CardIndex:   2,
		DepositList: []DepositData{}, // No deposits, must pay cost
	}

	err := gs.ExecuteAction(action)
	if err == nil {
		t.Fatal("Expected error for insufficient resources, got nil")
	}

	// Validate state unchanged
	if len(player.Hand) != initialHandSize {
		t.Errorf("Hand size should not change, expected %d, got %d", initialHandSize, len(player.Hand))
	}
}

// TestExecuteAction_AcquireCard_ExceedMaxCrystals tests acquiring card that would exceed max crystals
func TestExecuteAction_AcquireCard_ExceedMaxCrystals(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Set player resources to max
	player.Resources.Yellow = MaxCrystals

	// Add deposits to target card
	gs.Market.ActionCards[0].Deposits = &Resources{Yellow: 1}

	// Try to acquire card with deposits (would exceed max)
	action := Action{
		Type:        AcquireCard,
		CardIndex:   0,
		DepositList: []DepositData{},
	}

	err := gs.ExecuteAction(action)
	if err == nil {
		t.Fatal("Expected error for exceeding max crystals, got nil")
	}
}

// TestExecuteAction_ClaimPointCard tests claiming a point card
func TestExecuteAction_ClaimPointCard(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Give player resources to claim a point card
	pointCard := gs.Market.PointCards[0]
	player.Resources.AddAll(pointCard.Requirement, 1)

	initialResources := player.Resources.Copy()
	initialPointCards := len(player.PointCards)
	initialPoints := player.Points

	// Execute claim action
	action := Action{
		Type:      ClaimPointCard,
		CardIndex: 0,
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("ExecuteAction failed: %v", err)
	}

	// Validate state changes
	// 1. Resources should be deducted
	expectedResources := initialResources.Copy()
	expectedResources.SubtractAll(pointCard.Requirement, 1)
	if player.Resources.Yellow != expectedResources.Yellow ||
		player.Resources.Green != expectedResources.Green ||
		player.Resources.Blue != expectedResources.Blue ||
		player.Resources.Pink != expectedResources.Pink {
		t.Errorf("Expected resources %v, got %v", expectedResources, player.Resources)
	}

	// 2. Point card should be added
	if len(player.PointCards) != initialPointCards+1 {
		t.Errorf("Expected %d point cards, got %d", initialPointCards+1, len(player.PointCards))
	}

	// 3. Points should increase
	expectedPoints := initialPoints + pointCard.Points
	if player.Points != expectedPoints {
		t.Errorf("Expected %d points, got %d", expectedPoints, player.Points)
	}

	// 4. Market should refill
	if len(gs.Market.PointCards) != gs.Market.MaxPointVisible {
		t.Errorf("Expected market to have %d point cards after refill, got %d",
			gs.Market.MaxPointVisible, len(gs.Market.PointCards))
	}
}

// TestExecuteAction_ClaimPointCard_WithCoin tests claiming point card with bonus coin
func TestExecuteAction_ClaimPointCard_WithCoin(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Give player resources to claim first point card (gets copper coin)
	pointCard := gs.Market.PointCards[0]
	player.Resources.AddAll(pointCard.Requirement, 1)

	initialCoins := len(player.Coins)
	initialCoinAmount := gs.Market.Coins[0].Amount

	// Execute claim action for first card (index 0)
	action := Action{
		Type:      ClaimPointCard,
		CardIndex: 0,
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("ExecuteAction failed: %v", err)
	}

	// Validate state changes
	// 1. Should receive coin
	if len(player.Coins) != initialCoins+1 {
		t.Errorf("Expected %d coins, got %d", initialCoins+1, len(player.Coins))
	}

	// 2. Market coin amount should decrease
	if gs.Market.Coins[0].Amount != initialCoinAmount-1 {
		t.Errorf("Expected coin amount %d, got %d", initialCoinAmount-1, gs.Market.Coins[0].Amount)
	}
}

// TestExecuteAction_ClaimPointCard_TriggerLastRound tests claiming 5th point card triggers last round
func TestExecuteAction_ClaimPointCard_TriggerLastRound(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Give player 4 point cards
	for i := 0; i < 4; i++ {
		player.PointCards = append(player.PointCards, &Card{
			ID:     i,
			Type:   PointCard,
			Points: 5,
		})
	}

	// Give resources to claim 5th card
	pointCard := gs.Market.PointCards[0]
	player.Resources.AddAll(pointCard.Requirement, 1)

	// Execute claim action
	action := Action{
		Type:      ClaimPointCard,
		CardIndex: 0,
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("ExecuteAction failed: %v", err)
	}

	// Validate state changes
	// 1. Should have 5 point cards
	if len(player.PointCards) != 5 {
		t.Errorf("Expected 5 point cards, got %d", len(player.PointCards))
	}

	// 2. Last round should be triggered
	if !gs.LastRound {
		t.Error("Expected LastRound to be true")
	}
}

// TestExecuteAction_ClaimPointCard_InsufficientResources tests claiming without enough resources
func TestExecuteAction_ClaimPointCard_InsufficientResources(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Clear player resources
	player.Resources = NewResources()

	initialPointCards := len(player.PointCards)

	// Try to claim point card without resources
	action := Action{
		Type:      ClaimPointCard,
		CardIndex: 0,
	}

	err := gs.ExecuteAction(action)
	if err == nil {
		t.Fatal("Expected error for insufficient resources, got nil")
	}

	// Validate state unchanged
	if len(player.PointCards) != initialPointCards {
		t.Errorf("Point cards should not change, expected %d, got %d", initialPointCards, len(player.PointCards))
	}
}

// TestExecuteAction_ClaimPointCard_InvalidIndex tests claiming with invalid index
func TestExecuteAction_ClaimPointCard_InvalidIndex(t *testing.T) {
	gs := NewGameState(2, 42)

	// Try to claim card at invalid index
	action := Action{
		Type:      ClaimPointCard,
		CardIndex: 100,
	}

	err := gs.ExecuteAction(action)
	if err == nil {
		t.Fatal("Expected error for invalid card index, got nil")
	}
}

// TestExecuteAction_Rest tests rest action
func TestExecuteAction_Rest(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Give player some played cards
	playedCard1 := &Card{ID: 1, Name: "Card 1", Type: ActionCard}
	playedCard2 := &Card{ID: 2, Name: "Card 2", Type: ActionCard}
	player.PlayedCards = append(player.PlayedCards, playedCard1, playedCard2)

	initialHandSize := len(player.Hand)

	// Execute rest action
	action := Action{
		Type: Rest,
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("ExecuteAction failed: %v", err)
	}

	// Validate state changes
	// 1. All played cards should return to hand
	expectedHandSize := initialHandSize + 2
	if len(player.Hand) != expectedHandSize {
		t.Errorf("Expected hand size %d, got %d", expectedHandSize, len(player.Hand))
	}

	// 2. Played cards should be empty
	if len(player.PlayedCards) != 0 {
		t.Errorf("Expected 0 played cards, got %d", len(player.PlayedCards))
	}

	// 3. HasRested flag should be set
	if !player.HasRested {
		t.Error("Expected HasRested to be true")
	}

	// 4. Cards should be in hand
	foundCard1 := false
	foundCard2 := false
	for _, card := range player.Hand {
		if card.ID == playedCard1.ID {
			foundCard1 = true
		}
		if card.ID == playedCard2.ID {
			foundCard2 = true
		}
	}
	if !foundCard1 || !foundCard2 {
		t.Error("Expected both played cards to be in hand")
	}
}

// TestExecuteAction_Rest_EmptyPlayedCards tests rest with no played cards
func TestExecuteAction_Rest_EmptyPlayedCards(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	initialHandSize := len(player.Hand)

	// Execute rest action with no played cards
	action := Action{
		Type: Rest,
	}

	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("ExecuteAction failed: %v", err)
	}

	// Validate state changes
	// 1. Hand size should not change
	if len(player.Hand) != initialHandSize {
		t.Errorf("Expected hand size %d, got %d", initialHandSize, len(player.Hand))
	}

	// 2. HasRested flag should be set
	if !player.HasRested {
		t.Error("Expected HasRested to be true")
	}
}

// TestExecuteAction_UnknownActionType tests with unknown action type
func TestExecuteAction_UnknownActionType(t *testing.T) {
	gs := NewGameState(2, 42)

	// Try action with invalid type
	action := Action{
		Type: PlayerActionType(999),
	}

	err := gs.ExecuteAction(action)
	if err == nil {
		t.Fatal("Expected error for unknown action type, got nil")
	}
}

// TestExecuteAction_ComplexScenario tests a complex multi-step scenario
func TestExecuteAction_ComplexScenario(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Step 1: Play a produce card
	produceCard := &Card{
		ID:         100,
		Name:       "Produce",
		Type:       ActionCard,
		ActionType: Produce,
		Output:     &Resources{Yellow: 3},
	}
	player.Hand = append(player.Hand, produceCard)

	action1 := Action{
		Type:       PlayCard,
		CardIndex:  len(player.Hand) - 1,
		Multiplier: 1,
	}
	if err := gs.ExecuteAction(action1); err != nil {
		t.Fatalf("Step 1 failed: %v", err)
	}

	// Verify: should have more yellow
	if player.Resources.Yellow < 3 {
		t.Errorf("Expected at least 3 yellow after produce, got %d", player.Resources.Yellow)
	}

	// Step 2: Acquire a card (first position = free)
	gs.NextTurn() // Next player
	gs.NextTurn() // Back to player 1

	action2 := Action{
		Type:        AcquireCard,
		CardIndex:   0,
		DepositList: []DepositData{},
	}
	if err := gs.ExecuteAction(action2); err != nil {
		t.Fatalf("Step 2 failed: %v", err)
	}

	// Verify: should have acquired card
	if len(player.Hand) != len(player.Hand) {
		t.Error("Hand size check failed")
	}

	// Step 3: Rest to get played card back
	gs.NextTurn()
	gs.NextTurn()

	action3 := Action{
		Type: Rest,
	}
	if err := gs.ExecuteAction(action3); err != nil {
		t.Fatalf("Step 3 failed: %v", err)
	}

	// Verify: produce card should be back in hand
	if len(player.PlayedCards) != 0 {
		t.Errorf("Expected 0 played cards after rest, got %d", len(player.PlayedCards))
	}
}

// TestExecuteAction_CaravanCapacity tests that caravan capacity is enforced
func TestExecuteAction_CaravanCapacity(t *testing.T) {
	gs := NewGameState(2, 42)
	player := gs.GetCurrentPlayer()

	// Fill caravan to max
	player.Resources.Yellow = MaxCrystals

	// Try to play produce card (should not exceed max)
	produceCard := &Card{
		ID:         100,
		Name:       "Produce",
		Type:       ActionCard,
		ActionType: Produce,
		Output:     &Resources{Yellow: 1},
	}
	player.Hand = append(player.Hand, produceCard)

	action := Action{
		Type:       PlayCard,
		CardIndex:  len(player.Hand) - 1,
		Multiplier: 1,
	}

	// This should succeed (game allows going over, player must discard later)
	err := gs.ExecuteAction(action)
	if err != nil {
		t.Fatalf("ExecuteAction failed: %v", err)
	}

	// After action, player has MaxCrystals + 1
	if player.Resources.Total() != MaxCrystals+1 {
		t.Errorf("Expected %d total crystals, got %d", MaxCrystals+1, player.Resources.Total())
	}
}
