package game

import (
	"fmt"
	"math/rand"
)

// PlayerActionType represents the type of action a player can take
type PlayerActionType int

const (
	PlayCard PlayerActionType = iota
	AcquireCard
	ClaimPointCard
	Rest
)

type DepositData struct {
	Crystal CrystalType
}

// Action represents a player action
type Action struct {
	Type             PlayerActionType
	CardIndex        int           // Index in hand/market depending on action type
	Multiplier       int           // Multiplier for the trade action
	InputResources   *Resources    // Input resources for upgrade
	OutputResources  *Resources    // Output resources for upgrade
	DiscardResources *Resources    // Discards for exceeding MaxCrystals
	DepositList      []DepositData // Deposits for AcquireCard action
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
		players[i].Hand = append(players[i].Hand, CreateInitialActionCards(i)...)
	}

	// Randomize player order using Fisher-Yates shuffle
	for i := len(players) - 1; i > 0; i-- {
		j := rng.Intn(i + 1)
		players[i], players[j] = players[j], players[i]
	}

	// Give each player starting resources based on turn order (after shuffle)
	// Turn 1: 3 yellow
	// Turn 2: 4 yellow
	// Turn 3: 4 yellow
	// Turn 4: 3 yellow + 1 green
	// Turn 5: 3 yellow + 1 green
	for i := 0; i < numPlayers; i++ {
		turnOrder := i + 1 // 1-based turn order
		switch turnOrder {
		case 1:
			players[i].Resources.Yellow = 3
		case 2, 3:
			players[i].Resources.Yellow = 4
		case 4, 5:
			players[i].Resources.Yellow = 3
			players[i].Resources.Green = 1
		default:
			// For games with more than 5 players, default to 3 yellow
			players[i].Resources.Yellow = 3
		}
	}

	// Create market
	actionCards := CreateDefaultActionCards()
	pointCards := CreateDefaultPointCards()
	coins := CreateCoinCards()
	market := NewMarket(actionCards, pointCards, coins, 6, 5, rng)

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

		// Rule: To acquire card at index N, you can either:
		// 1. Pay the card cost (crystals shown on the card)
		// 2. Deposit 1 crystal on EACH of the N previous cards (0 to N-1) to get it FREE
		// Card index 0 (position 1) is always FREE (no previous cards to deposit on)

		cost := gs.Market.GetActionCardCost(action.CardIndex)

		// Get the target card BEFORE removing it (to collect its deposits)
		targetCard := gs.Market.ActionCards[action.CardIndex]

		// Collect deposits from the target card
		collectedFromTarget := NewResources()
		if targetCard.Deposits != nil {
			collectedFromTarget.AddAll(targetCard.Deposits, 1)
		}

		// Check if player deposited on all previous cards (FREE acquisition)
		hasAllDeposits := len(action.DepositList) == action.CardIndex

		if hasAllDeposits {
			// FREE: deposited on all previous cards

			// Verify player has crystals to deposit
			for _, deposit := range action.DepositList {
				if !player.Resources.Has(deposit.Crystal, 1) {
					return fmt.Errorf("insufficient resources for deposit")
				}
			}
		} else {
			// Must pay the cost
			if !player.Resources.HasAll(cost, 1) {
				return fmt.Errorf("cannot afford card: need %s but have %s", cost.String(), player.Resources.String())
			}
		}

		// Check max crystals limit BEFORE acquiring
		if collectedFromTarget.Total()+player.Resources.Total() > MaxCrystals {
			return fmt.Errorf("cannot acquire card: would exceed max crystals")
		}

		// Remove the card from market FIRST
		card := gs.Market.AcquireActionCard(action.CardIndex)
		if card == nil {
			return fmt.Errorf("cannot acquire card")
		}

		// Now process payment/deposits
		if hasAllDeposits {
			// Process deposits on previous cards (0 to N-1)
			for i, deposit := range action.DepositList {
				if !player.Resources.Subtract(deposit.Crystal, 1) {
					return fmt.Errorf("failed to deposit crystal")
				}
				gs.Market.ActionCards[i].Deposits.Add(deposit.Crystal, 1)
			}
		} else {
			// Pay the cost
			if !player.Resources.SubtractAll(cost, 1) {
				return fmt.Errorf("failed to pay card cost")
			}
		}

		// Add collected crystals from target card to player
		if collectedFromTarget.Total() > 0 {
			player.Resources.AddAll(collectedFromTarget, 1)
		}

		player.Hand = append(player.Hand, card)
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

// PrintFinalResults prints the final game results
