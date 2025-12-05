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
		// Give each player starting resources based on player position
		// Player 1: 3 yellow
		// Player 2: 4 yellow
		// Player 3: 4 yellow
		// Player 4: 3 yellow + 1 green
		// Player 5: 3 yellow + 1 green
		playerIndex := i + 1 // 1-based player index
		switch playerIndex {
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

		cost := gs.Market.GetActionCardCost(action.CardIndex)

		// Get the target card BEFORE removing it (to collect its deposits)
		targetCard := gs.Market.ActionCards[action.CardIndex]

		// Collect deposits ONLY from the target card itself
		// Deposits on previous cards (0 to N-1) are LEFT BEHIND for other players
		collectedFromTarget := NewResources()
		if targetCard.Deposits != nil {
			collectedFromTarget.AddAll(targetCard.Deposits, 1)
			fmt.Printf("[DEBUG] Collected deposits from target card index %d: %d crystals\n",
				action.CardIndex, collectedFromTarget.Total())
		}

		if len(action.DepositList) != action.CardIndex {
			// Missing required deposits, must pay the normal card cost
			fmt.Printf("[DEBUG] Missing required deposits on previous cards, must pay cost %s\n", cost.String())
			if !player.Resources.HasAll(cost, 1) {
				return fmt.Errorf("cannot afford card: need %s but have %s", cost.String(), player.Resources.String())
			}
			if !player.Resources.SubtractAll(cost, 1) {
				return fmt.Errorf("failed to pay card cost")
			}
		}

		if !player.Resources.HasAll(cost, 1) {
			return fmt.Errorf("cannot afford card: need %s but have %s", cost.String(), player.Resources.String())
		}

		if !player.Resources.SubtractAll(cost, 1) {
			return fmt.Errorf("failed to pay card cost")
		}

		if collectedFromTarget.Total()+player.Resources.Total() > MaxCrystals {
			return fmt.Errorf("cannot acquire card: would exceed max crystals")
		}

		// Now remove the card from market
		card := gs.Market.AcquireActionCard(action.CardIndex)
		if card == nil {
			return fmt.Errorf("cannot acquire card")
		}

		// Process deposits on previous cards (0 to N-1)
		for i, deposit := range action.DepositList {
			gs.Market.ActionCards[i].Deposits.Add(deposit.Crystal, 1)
			fmt.Printf("[DEBUG] Deposited 1 cyrstal on card index %d\n", i)
		}

		// Add collected crystals from target card to player
		if collectedFromTarget.Total() > 0 {
			player.Resources.AddAll(collectedFromTarget, 1)
			fmt.Printf("[DEBUG] Added %d crystals from target card deposits to player\n", collectedFromTarget.Total())
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
