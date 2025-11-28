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

// Action represents a player action
type Action struct {
	Type            PlayerActionType
	CardIndex       int // Index in hand/market depending on action type
	InputResources  *Resources // Input resources for upgrade
	OutputResources *Resources // Output resources for upgrade
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
		if !player.PlayCard(action.CardIndex, action.InputResources, action.OutputResources) {
			return fmt.Errorf("cannot play card")
		}

	case AcquireCard:
		if action.CardIndex < 0 || action.CardIndex >= len(gs.Market.ActionCards) {
			return fmt.Errorf("invalid market card index")
		}
		cost := gs.Market.GetActionCardCost(action.CardIndex)
		card := gs.Market.AcquireActionCard(action.CardIndex)
		if card == nil {
			return fmt.Errorf("cannot acquire card")
		}
		if !player.AcquireCard(card, cost) {
			// Put card back if acquisition failed
			gs.Market.ActionCards = append(gs.Market.ActionCards, card)
			return fmt.Errorf("cannot afford card")
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
			player.Points += gs.Market.Coins[action.CardIndex].Points
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
