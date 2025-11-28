package game

import "fmt"

// Player represents a game player
type Player struct {
	ID          int
	Name        string
	Resources   *Resources
	Hand        []*Card // Action cards in hand
	PlayedCards []*Card // Cards played this turn (will be returned on rest)
	PointCards  []*Card // Claimed point cards
	Coins       []*Card // Claimed coins
	Points      int
	IsAI        bool
	HasRested   bool // Whether player has rested this round
}

// NewPlayer creates a new player
func NewPlayer(id int, name string, isAI bool) *Player {
	return &Player{
		ID:          id,
		Name:        name,
		Resources:   NewResources(),
		Hand:        make([]*Card, 0),
		PlayedCards: make([]*Card, 0),
		PointCards:  make([]*Card, 0),
		Coins:       make([]*Card, 0),
		Points:      0,
		IsAI:        isAI,
		HasRested:   false,
	}
}

// GetPoints returns the player's points
func (p *Player) GetFinalPoints() int {
	finalPoints := 0
	for _, pointCard := range p.PointCards {
		finalPoints += pointCard.Points
	}
	for _, coin := range p.Coins {
		finalPoints += coin.Points
	}
	finalPoints += p.Resources.GetFinalPoints()

	return finalPoints
}

// AddCard adds a card to the player's hand
func (p *Player) AddCard(card *Card) {
	p.Hand = append(p.Hand, card)
}

// PlayCard plays a card from hand
func (p *Player) PlayCard(action Action) bool {
	if action.CardIndex < 0 || action.CardIndex >= len(p.Hand) {
		return false
	}
	card := p.Hand[action.CardIndex]
	if !card.Play(p, action) {
		return false
	}
	// Move card from hand to played cards
	p.PlayedCards = append(p.PlayedCards, card)
	p.Hand = append(p.Hand[:action.CardIndex], p.Hand[action.CardIndex+1:]...)
	return true
}

// Rest returns all played cards to hand
func (p *Player) Rest() {
	p.Hand = append(p.Hand, p.PlayedCards...)
	p.PlayedCards = make([]*Card, 0)
	p.HasRested = true
}

// AcquireCard acquires a card from the market
func (p *Player) AcquireCard(card *Card, cost *Resources) bool {
	if !p.Resources.HasAll(cost, 1) {
		return false
	}
	if !p.Resources.SubtractAll(cost, 1) {
		return false
	}
	p.AddCard(card)
	return true
}

// ClaimPointCard claims a point card
func (p *Player) ClaimPointCard(card *Card) bool {
	if !card.CanClaim(p) {
		return false
	}
	if !card.Claim(p) {
		return false
	}
	p.PointCards = append(p.PointCards, card)
	return true
}

// CanClaimAny checks if player can claim any of the given point cards
func (p *Player) CanClaimAny(pointCards []*Card) *Card {
	for _, card := range pointCards {
		if card.CanClaim(p) {
			return card
		}
	}
	return nil
}

// CheckLastRound checks if player has won (5 point cards)
func (p *Player) CheckLastRound() bool {
	return len(p.PointCards) >= 5
}

// GetHandString returns a string representation of the hand
func (p *Player) GetHandString() string {
	if len(p.Hand) == 0 {
		return "Empty"
	}
	parts := []string{}
	for i, card := range p.Hand {
		parts = append(parts, fmt.Sprintf("%d:%s", i, card.Name))
	}
	return fmt.Sprintf("[%s]", fmt.Sprintf("%v", parts))
}

// String returns a string representation of the player
func (p *Player) String() string {
	return fmt.Sprintf("Player %d (%s): Resources=%s, Points=%d, Hand=%d cards, PointCards=%d",
		p.ID, p.Name, p.Resources.String(), p.Points, len(p.Hand), len(p.PointCards))
}
