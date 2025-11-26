package game

import (
	"fmt"
	"math/rand"
)

// Market represents the card market
type Market struct {
	ActionCards []*Card // Available action cards (face up)
	PointCards  []*Card // Available point cards (face up)
	ActionDeck  []*Card // Deck of action cards
	PointDeck   []*Card // Deck of point cards
	MaxVisible  int     // Maximum visible cards in market
}

// NewMarket creates a new market with shuffled decks
func NewMarket(actionCards, pointCards []*Card, maxVisible int, rng *rand.Rand) *Market {
	// Shuffle decks
	shuffledActions := make([]*Card, len(actionCards))
	copy(shuffledActions, actionCards)
	shuffledPoints := make([]*Card, len(pointCards))
	copy(shuffledPoints, pointCards)

	// Shuffle using Fisher-Yates
	for i := len(shuffledActions) - 1; i > 0; i-- {
		j := rng.Intn(i + 1)
		shuffledActions[i], shuffledActions[j] = shuffledActions[j], shuffledActions[i]
	}
	for i := len(shuffledPoints) - 1; i > 0; i-- {
		j := rng.Intn(i + 1)
		shuffledPoints[i], shuffledPoints[j] = shuffledPoints[j], shuffledPoints[i]
	}

	market := &Market{
		ActionCards: make([]*Card, 0),
		PointCards:  make([]*Card, 0),
		ActionDeck:  shuffledActions,
		PointDeck:   shuffledPoints,
		MaxVisible:  maxVisible,
	}

	// Draw initial cards
	market.RefillActionCards()
	market.RefillPointCards()

	return market
}

// RefillActionCards refills the action card market up to MaxVisible
func (m *Market) RefillActionCards() {
	for len(m.ActionCards) < m.MaxVisible && len(m.ActionDeck) > 0 {
		m.ActionCards = append(m.ActionCards, m.ActionDeck[0])
		m.ActionDeck = m.ActionDeck[1:]
	}
}

// RefillPointCards refills the point card market up to MaxVisible
func (m *Market) RefillPointCards() {
	for len(m.PointCards) < m.MaxVisible && len(m.PointDeck) > 0 {
		m.PointCards = append(m.PointCards, m.PointDeck[0])
		m.PointDeck = m.PointDeck[1:]
	}
}

// GetActionCardCost returns the cost to acquire an action card at a given position
// Cost increases with position (0 = cheapest, higher = more expensive)
func (m *Market) GetActionCardCost(position int) *Resources {
	if position < 0 || position >= len(m.ActionCards) {
		return nil
	}
	// Cost formula: position determines base cost
	// Position 0: 0 yellow
	// Position 1: 1 yellow
	// Position 2: 2 yellow
	// Position 3: 1 green
	// Position 4: 2 green
	cost := NewResources()
	switch position {
	case 0:
		// Free
	case 1:
		cost.Yellow = 1
	case 2:
		cost.Yellow = 2
	case 3:
		cost.Green = 1
	case 4:
		cost.Green = 2
	default:
		cost.Green = position - 1
	}
	return cost
}

// AcquireActionCard removes and returns an action card from the market
func (m *Market) AcquireActionCard(position int) *Card {
	if position < 0 || position >= len(m.ActionCards) {
		return nil
	}
	card := m.ActionCards[position]
	m.ActionCards = append(m.ActionCards[:position], m.ActionCards[position+1:]...)
	m.RefillActionCards()
	return card
}

// AcquirePointCard removes and returns a point card from the market
func (m *Market) AcquirePointCard(position int) *Card {
	if position < 0 || position >= len(m.PointCards) {
		return nil
	}
	card := m.PointCards[position]
	m.PointCards = append(m.PointCards[:position], m.PointCards[position+1:]...)
	m.RefillPointCards()
	return card
}

// String returns a string representation of the market
func (m *Market) String() string {
	actionStr := "Action Cards:\n"
	for i, card := range m.ActionCards {
		cost := m.GetActionCardCost(i)
		actionStr += fmt.Sprintf("  [%d] %s (Cost: %s)\n", i, card.String(), cost.String())
	}
	pointStr := "Point Cards:\n"
	for i, card := range m.PointCards {
		pointStr += fmt.Sprintf("  [%d] %s\n", i, card.String())
	}
	return actionStr + pointStr
}

