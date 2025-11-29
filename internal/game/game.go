package game

import (
	"fmt"
	"math/rand"
	"strings"
)

// PlayerActionType represents the type of action a player can take
type PlayerActionType int

const (
	PlayCard PlayerActionType = iota
	AcquireCard
	ClaimPointCard
	Rest
	DiscardCrystals
	DepositCrystals
	CollectCrystals
	CollectAllCrystals
)

// DepositDirection represents the direction for deposits (N- or N+)
type DepositDirection int

const (
	DepositPrevious DepositDirection = iota // N-: deposit into previous cards (0 to N-1)
	DepositNext                             // N+: deposit into next cards (N+1 to end)
)

// Action represents a player action
type Action struct {
	Type             PlayerActionType
	CardIndex        int                   // Index in hand/market depending on action type
	Multiplier       int                   // Multiplier for the trade action
	InputResources   *Resources            // Input resources for upgrade
	OutputResources  *Resources            // Output resources for upgrade
	Discard          *Resources            // Crystals to discard (for DiscardCrystals action)
	Deposits         map[int][]CrystalType // Position -> Array of Crystal types for deposit (for DepositCrystals, supports stacking)
	TargetPosition   int                   // Target position for deposit (1-5)
	DepositDirection DepositDirection      // Direction for deposits: N- (previous) or N+ (next)
	CollectPositions []int                 // Positions to collect from (for CollectCrystals)
}

// GameState represents the current state of the game
type GameState struct {
	Players     []*Player
	Market      *Market
	CurrentTurn int
	Round       int
	GameOver    bool
	Winner      *Player
	LastRound   bool // Whether the last round is being played
	RNG         *rand.Rand
}

// NewGameState creates a new game state
func NewGameState(numPlayers int, seed int64) *GameState {
	rng := rand.New(rand.NewSource(seed))

	// Create players (all human by default)
	players := make([]*Player, numPlayers)
	for i := 0; i < numPlayers; i++ {
		name := fmt.Sprintf("Player %d", i+1)
		players[i] = NewPlayer(i+1, name, false)
		// Give each player starting resources
		players[i].Resources.Yellow = 2
		players[i].Hand = append(players[i].Hand, CreateInitialActionCards(i)...)
	}

	// Create market
	actionCards := CreateDefaultActionCards()
	pointCards := CreateDefaultPointCards()
	coins := CreateCoinCards()
	market := NewMarket(actionCards, pointCards, coins, 5, 5, rng)

	return &GameState{
		Players:     players,
		Market:      market,
		CurrentTurn: 0,
		Round:       1,
		GameOver:    false,
		Winner:      nil,
		LastRound:   false,
		RNG:         rng,
	}
}

// GetCurrentPlayer returns the current player
func (gs *GameState) GetCurrentPlayer() *Player {
	return gs.Players[gs.CurrentTurn%len(gs.Players)]
}

// NextTurn advances to the next turn
func (gs *GameState) NextTurn() {
	gs.CurrentTurn++
	if gs.CurrentTurn%len(gs.Players) == 0 {
		gs.Round++
		// Reset rest flags
		for _, player := range gs.Players {
			player.HasRested = false
		}
	}
}

// ExecuteAction executes a player action
func (gs *GameState) ExecuteAction(action Action) error {
	player := gs.GetCurrentPlayer()

	switch action.Type {
	case PlayCard:
		if action.CardIndex < 0 || action.CardIndex >= len(player.Hand) {
			return fmt.Errorf("invalid card index")
		}
		if !player.PlayCard(action) {
			return fmt.Errorf("cannot play card")
		}

	case AcquireCard:
		if action.CardIndex < 0 || action.CardIndex >= len(gs.Market.ActionCards) {
			return fmt.Errorf("invalid market card index")
		}

		// Rule: To acquire card at index N, must have deposited on ALL previous cards (0 to N-1)
		// Card index 0 (position 1) is always FREE (no previous cards to deposit on)
		// Card index N (position N+1): must deposit on cards 0..N-1 to acquire FREE
		hasAllRequiredDeposits := true
		if action.CardIndex > 0 {
			// Check that ALL previous cards (0 to N-1) have deposits
			for i := 0; i < action.CardIndex; i++ {
				if i >= len(gs.Market.ActionCards) {
					break
				}
				prevCard := gs.Market.ActionCards[i]
				// Each previous card must have at least one deposit
				// Position for card index i is i+1
				requiredPosition := i + 1
				if prevCard.Deposits == nil {
					hasAllRequiredDeposits = false
					fmt.Printf("[DEBUG] Card index %d (position %d) has no deposits map\n", i, requiredPosition)
					break
				}
				// Check if this card has deposits at position i+1 (array must have at least one element)
				depositArray, exists := prevCard.Deposits[requiredPosition]
				if !exists || len(depositArray) == 0 {
					hasAllRequiredDeposits = false
					fmt.Printf("[DEBUG] Card index %d (position %d) missing required deposit at position %d\n", i, requiredPosition, requiredPosition)
					break
				}
			}
		}

		cost := gs.Market.GetActionCardCost(action.CardIndex)

		// Get the target card BEFORE removing it (to collect its deposits)
		targetCard := gs.Market.ActionCards[action.CardIndex]

		// Collect deposits ONLY from the target card itself
		// Deposits on previous cards (0 to N-1) are LEFT BEHIND for other players
		collectedFromTarget := NewResources()
		if targetCard.Deposits != nil && len(targetCard.Deposits) > 0 {
			for _, depositArray := range targetCard.Deposits {
				for _, crystalType := range depositArray {
					collectedFromTarget.Add(crystalType, 1)
				}
			}
			// Clear all deposits from target card
			targetCard.Deposits = make(map[int][]CrystalType)
			fmt.Printf("[DEBUG] Collected deposits from target card index %d: %d crystals\n",
				action.CardIndex, collectedFromTarget.Total())
		}

		// Now remove the card from market
		card := gs.Market.AcquireActionCard(action.CardIndex)
		if card == nil {
			return fmt.Errorf("cannot acquire card")
		}

		// Add collected crystals from target card to player
		if collectedFromTarget.Total() > 0 {
			player.Resources.AddAll(collectedFromTarget, 1)
			fmt.Printf("[DEBUG] Added %d crystals from target card deposits to player\n", collectedFromTarget.Total())
		}

		// If card index is 0 (position 1) OR player has deposited on ALL previous cards, acquire is FREE (no cost)
		// Otherwise, player must pay the normal cost
		if action.CardIndex == 0 || hasAllRequiredDeposits {
			if action.CardIndex == 0 {
				fmt.Printf("[DEBUG] Card index 0 (position 1) is always FREE\n")
			} else {
				fmt.Printf("[DEBUG] Player has deposited on all previous cards, acquiring card index %d for FREE\n", action.CardIndex)
			}
			// No cost, just add card
			player.AddCard(card)
		} else {
			// Missing required deposits, must pay the normal card cost
			fmt.Printf("[DEBUG] Missing required deposits on previous cards, must pay cost %s\n", cost.String())
			if !player.Resources.HasAll(cost, 1) {
				// Put card back if acquisition failed
				gs.Market.ActionCards = append(gs.Market.ActionCards, card)
				return fmt.Errorf("cannot afford card: need %s but have %s", cost.String(), player.Resources.String())
			}
			if !player.Resources.SubtractAll(cost, 1) {
				// Put card back if acquisition failed
				gs.Market.ActionCards = append(gs.Market.ActionCards, card)
				return fmt.Errorf("failed to pay card cost")
			}
			player.AddCard(card)
		}

		// Check if player exceeds MaxCrystals after collecting
		if player.Resources.Total() > MaxCrystals {
			player.PendingDiscard = player.Resources.Total() - MaxCrystals
		}

	case ClaimPointCard:
		if action.CardIndex < 0 || action.CardIndex >= len(gs.Market.PointCards) {
			return fmt.Errorf("invalid point card index")
		}
		card := gs.Market.PointCards[action.CardIndex]
		if !player.ClaimPointCard(card) {
			return fmt.Errorf("cannot claim point card")
		}
		// Remove card from market
		gs.Market.PointCards = append(gs.Market.PointCards[:action.CardIndex], gs.Market.PointCards[action.CardIndex+1:]...)
		gs.Market.RefillPointCards()

		// check bonus coin if player has claimed point card
		if action.CardIndex <= 1 && gs.Market.Coins[action.CardIndex].Amount > 0 {
			player.Coins = append(player.Coins, gs.Market.Coins[action.CardIndex])
			gs.Market.Coins[action.CardIndex].Amount--
		}

		// Check win condition
		if player.CheckLastRound() {
			gs.LastRound = true
		}

	case Rest:
		player.Rest()

	case DiscardCrystals:
		// Discard excess crystals to meet MaxCrystals limit
		if action.Discard == nil {
			return fmt.Errorf("no discard specified")
		}
		totalDiscard := action.Discard.Total()
		if totalDiscard != player.PendingDiscard {
			return fmt.Errorf("discard count mismatch")
		}
		if !player.Resources.HasAll(action.Discard, 1) {
			return fmt.Errorf("insufficient crystals to discard")
		}
		if !player.Resources.SubtractAll(action.Discard, 1) {
			return fmt.Errorf("failed to discard crystals")
		}
		player.PendingDiscard = 0

	case DepositCrystals:
		// Deposit crystals on cards BEFORE the target card
		// If target is card index N (position N+1), deposit into cards index 0..N-1 (positions 1..N)
		// IMPORTANT: We deduct crystals immediately when depositing
		// Deposits are left on cards for other players to collect later
		if action.CardIndex < 0 {
			return fmt.Errorf("invalid card index")
		}
		handLength := len(player.Hand)
		marketIndex := action.CardIndex - handLength

		if marketIndex < 0 || marketIndex >= len(gs.Market.ActionCards) {
			return fmt.Errorf("invalid market card index")
		}

		if action.Deposits == nil || len(action.Deposits) == 0 {
			return fmt.Errorf("no deposits specified")
		}
		if action.TargetPosition < 1 || action.TargetPosition > 5 {
			return fmt.Errorf("invalid target position")
		}

		// Deposit into cards index 0 to (marketIndex - 1)
		// Each card at index i receives deposit at position i+1
		// Deduct crystals from player immediately
		// Note: action.Deposits is map[int][]CrystalType, but for single deposits we expect array with one element
		for i := 0; i < marketIndex; i++ {
			if i >= len(gs.Market.ActionCards) {
				break
			}
			card := gs.Market.ActionCards[i]
			position := i + 1 // 1-based position
			depositArray, exists := action.Deposits[position]
			if !exists || len(depositArray) == 0 {
				return fmt.Errorf("missing deposit for position %d (card index %d)", position, i)
			}
			// For now, we expect single crystal per position (first element of array)
			// In future, we can support multiple crystals per position
			crystalType := depositArray[0]
			// Check if player has the crystal
			if !player.Resources.Has(crystalType, 1) {
				return fmt.Errorf("player does not have crystal for position %d", position)
			}
			// Deduct crystal from player
			if !player.Resources.Subtract(crystalType, 1) {
				return fmt.Errorf("failed to deduct crystal for position %d", position)
			}
			// Add deposit to card (stack deposits)
			if card.Deposits == nil {
				card.Deposits = make(map[int][]CrystalType)
			}
			if card.Deposits[position] == nil {
				card.Deposits[position] = make([]CrystalType, 0)
			}
			card.Deposits[position] = append(card.Deposits[position], crystalType)
			fmt.Printf("[DEBUG] Deposited %s to card index %d (position %d): %s (total at position: %d)\n",
				crystalType, i, position, card.Name, len(card.Deposits[position]))
		}
		fmt.Printf("[DEBUG] Deposit complete: deposited to %d cards (positions 1 to %d), crystals deducted\n", marketIndex, marketIndex)

	case CollectCrystals:
		// Collect crystals from a card (from hand or market)
		if action.CardIndex < 0 {
			return fmt.Errorf("invalid card index")
		}
		var card *Card
		handLength := len(player.Hand)
		if action.CardIndex < handLength {
			// Hand card
			card = player.Hand[action.CardIndex]
		} else {
			// Market card
			marketIndex := action.CardIndex - handLength
			if marketIndex >= 0 && marketIndex < len(gs.Market.ActionCards) {
				card = gs.Market.ActionCards[marketIndex]
			}
		}
		if card == nil {
			return fmt.Errorf("card not found")
		}
		if action.CollectPositions == nil || len(action.CollectPositions) == 0 {
			return fmt.Errorf("no positions specified")
		}
		collected, success := card.CollectCrystals(player, action.CollectPositions)
		if !success {
			return fmt.Errorf("failed to collect crystals")
		}
		// Check if player exceeds MaxCrystals after collecting
		if player.Resources.Total() > MaxCrystals {
			player.PendingDiscard = player.Resources.Total() - MaxCrystals
		}
		_ = collected // Collected crystals already added to player

	case CollectAllCrystals:
		// Auto collect all crystals from a card (leave one behind)
		if action.CardIndex < 0 {
			return fmt.Errorf("invalid card index")
		}
		var card *Card
		handLength := len(player.Hand)
		if action.CardIndex < handLength {
			// Hand card
			card = player.Hand[action.CardIndex]
		} else {
			// Market card
			marketIndex := action.CardIndex - handLength
			if marketIndex >= 0 && marketIndex < len(gs.Market.ActionCards) {
				card = gs.Market.ActionCards[marketIndex]
			}
		}
		if card == nil {
			return fmt.Errorf("card not found")
		}
		collected, success := card.CollectAllCrystals(player)
		if !success {
			return fmt.Errorf("failed to collect crystals")
		}
		// Check if player exceeds MaxCrystals after collecting
		if player.Resources.Total() > MaxCrystals {
			player.PendingDiscard = player.Resources.Total() - MaxCrystals
		}
		_ = collected // Collected crystals already added to player

	default:
		return fmt.Errorf("unknown action type")
	}

	return nil
}

// CheckGameOver checks if the game is over
func (gs *GameState) CheckGameOver() {
	if gs.LastRound {
		gs.GameOver = true
		for _, player := range gs.Players {
			if gs.Winner == nil || player.GetFinalPoints() > gs.Winner.GetFinalPoints() {
				gs.Winner = player
			}
		}
	}
}

// PrintState prints the current game state
func (gs *GameState) PrintState() {
	fmt.Println("\n" + "=" + strings.Repeat("=", 78))
	fmt.Printf("Round %d, Turn %d - %s\n", gs.Round, gs.CurrentTurn+1, gs.GetCurrentPlayer().Name)
	fmt.Println(strings.Repeat("=", 80))

	// Print current player state
	currentPlayer := gs.GetCurrentPlayer()
	fmt.Printf("\nCurrent Player: %s\n", currentPlayer.String())
	fmt.Printf("Hand: %s\n", currentPlayer.GetHandString())

	// Print all players
	fmt.Println("\nAll Players:")
	for _, player := range gs.Players {
		marker := " "
		if player.ID == currentPlayer.ID {
			marker = ">"
		}
		fmt.Printf("  %s %s\n", marker, player.String())
	}

	// Print market
	fmt.Println("\n" + gs.Market.String())
	fmt.Printf("Action Deck: %d cards remaining\n", len(gs.Market.ActionDeck))
	fmt.Printf("Point Deck: %d cards remaining\n", len(gs.Market.PointDeck))
}

// PrintFinalResults prints the final game results
func (gs *GameState) PrintFinalResults() {
	fmt.Println("\n" + strings.Repeat("=", 80))
	fmt.Println("GAME OVER - FINAL RESULTS")
	fmt.Println(strings.Repeat("=", 80))

	// Sort players by points (simple bubble sort)
	players := make([]*Player, len(gs.Players))
	copy(players, gs.Players)
	for i := 0; i < len(players)-1; i++ {
		for j := i + 1; j < len(players); j++ {
			if players[j].Points > players[i].Points {
				players[i], players[j] = players[j], players[i]
			}
		}
	}

	for i, player := range players {
		rank := i + 1
		winnerMark := ""
		if player.ID == gs.Winner.ID {
			winnerMark = " 🏆 WINNER"
		}
		fmt.Printf("\n%d. %s - %d Points (%d Point Cards)%s\n",
			rank, player.Name, player.Points, len(player.PointCards), winnerMark)
		fmt.Printf("   Resources: %s\n", player.Resources.String())
		fmt.Printf("   Hand: %d cards\n", len(player.Hand))
	}
	fmt.Println()
}
