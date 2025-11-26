package game

import (
	"fmt"
	"strings"
)

// CardType represents the type of card
type CardType int

const (
	ActionCard CardType = iota
	PointCard
)

// ActionType represents the type of action a card can perform
type ActionType int

const (
	Produce ActionType = iota
	Upgrade
	Trade
)

// Card represents a game card
type Card struct {
	ID          int
	Name        string
	Type        CardType
	ActionType  ActionType // For ActionCard
	Cost        *Resources // Cost to acquire (for ActionCard)
	Requirement *Resources // Required crystals (for PointCard)
	Points      int        // Victory points (for PointCard)
	// For ActionCard: what it produces/upgrades/trades
	Input  *Resources // Input crystals (for Upgrade/Trade)
	Output *Resources // Output crystals
}

// ActionCard represents a merchant/action card interface
type ActionCardInterface interface {
	CanPlay(player *Player) bool
	Play(player *Player) bool
	GetCost() *Resources
}

// PointCardInterface represents a point card interface
type PointCardInterface interface {
	CanClaim(player *Player) bool
	Claim(player *Player) bool
	GetPoints() int
	GetRequirement() *Resources
}

// CanPlay checks if a player can play this action card
func (c *Card) CanPlay(player *Player) bool {
	if c.Type != ActionCard {
		return false
	}
	// Check if player has required input resources
	if c.Input != nil && !player.Resources.HasAll(c.Input) {
		return false
	}
	return true
}

// Play executes the card's action
func (c *Card) Play(player *Player) bool {
	if !c.CanPlay(player) {
		return false
	}

	switch c.ActionType {
	case Produce:
		// Simply add output resources
		if c.Output != nil {
			player.Resources.AddAll(c.Output)
		}
	case Upgrade:
		// Subtract input, add output
		if c.Input != nil && !player.Resources.SubtractAll(c.Input) {
			return false
		}
		if c.Output != nil {
			player.Resources.AddAll(c.Output)
		}
	case Trade:
		// Subtract input, add output
		if c.Input != nil && !player.Resources.SubtractAll(c.Input) {
			return false
		}
		if c.Output != nil {
			player.Resources.AddAll(c.Output)
		}
	}

	return true
}

// CanClaim checks if a player can claim this point card
func (c *Card) CanClaim(player *Player) bool {
	if c.Type != PointCard {
		return false
	}
	if c.Requirement == nil {
		return false
	}
	return player.Resources.HasAll(c.Requirement)
}

// Claim claims the point card and subtracts required resources
func (c *Card) Claim(player *Player) bool {
	if !c.CanClaim(player) {
		return false
	}
	if !player.Resources.SubtractAll(c.Requirement) {
		return false
	}
	player.Points += c.Points
	return true
}

// GetCost returns the cost to acquire this card
func (c *Card) GetCost() *Resources {
	if c.Cost == nil {
		return NewResources()
	}
	return c.Cost
}

// GetRequirement returns the requirement for a point card
func (c *Card) GetRequirement() *Resources {
	if c.Requirement == nil {
		return NewResources()
	}
	return c.Requirement
}

// GetPoints returns the victory points
func (c *Card) GetPoints() int {
	return c.Points
}

// String returns a string representation of the card
func (c *Card) String() string {
	var parts []string
	parts = append(parts, fmt.Sprintf("[%s]", c.Name))

	if c.Type == ActionCard {
		switch c.ActionType {
		case Produce:
			parts = append(parts, "Produce:")
		case Upgrade:
			parts = append(parts, "Upgrade:")
		case Trade:
			parts = append(parts, "Trade:")
		}
		if c.Input != nil && c.Input.Total() > 0 {
			parts = append(parts, fmt.Sprintf("%s ->", c.Input.String()))
		}
		if c.Output != nil {
			parts = append(parts, c.Output.String())
		}
	} else if c.Type == PointCard {
		parts = append(parts, fmt.Sprintf("Points: %d", c.Points))
		if c.Requirement != nil {
			parts = append(parts, fmt.Sprintf("Requires: %s", c.Requirement.String()))
		}
	}

	return strings.Join(parts, " ")
}

// CreateDefaultActionCards creates a set of default action cards for the game
func CreateDefaultActionCards() []*Card {
	cards := []*Card{
		// Produce cards
		{
			ID:         1,
			Name:       "Yellow Mine",
			Type:       ActionCard,
			ActionType: Produce,
			Output:     &Resources{Yellow: 2},
			Cost:       &Resources{Yellow: 1},
		},
		{
			ID:         2,
			Name:       "Green Mine",
			Type:       ActionCard,
			ActionType: Produce,
			Output:     &Resources{Green: 2},
			Cost:       &Resources{Yellow: 2},
		},
		{
			ID:         3,
			Name:       "Blue Mine",
			Type:       ActionCard,
			ActionType: Produce,
			Output:     &Resources{Blue: 2},
			Cost:       &Resources{Green: 2},
		},
		{
			ID:         4,
			Name:       "Pink Mine",
			Type:       ActionCard,
			ActionType: Produce,
			Output:     &Resources{Pink: 2},
			Cost:       &Resources{Blue: 2},
		},
		// Upgrade cards
		{
			ID:         5,
			Name:       "Yellow to Green",
			Type:       ActionCard,
			ActionType: Upgrade,
			Input:      &Resources{Yellow: 2},
			Output:     &Resources{Green: 1},
			Cost:       &Resources{Yellow: 3},
		},
		{
			ID:         6,
			Name:       "Green to Blue",
			Type:       ActionCard,
			ActionType: Upgrade,
			Input:      &Resources{Green: 2},
			Output:     &Resources{Blue: 1},
			Cost:       &Resources{Green: 3},
		},
		{
			ID:         7,
			Name:       "Blue to Pink",
			Type:       ActionCard,
			ActionType: Upgrade,
			Input:      &Resources{Blue: 2},
			Output:     &Resources{Pink: 1},
			Cost:       &Resources{Blue: 3},
		},
		// Trade cards
		{
			ID:         8,
			Name:       "Trade Green for Blue",
			Type:       ActionCard,
			ActionType: Trade,
			Input:      &Resources{Green: 3},
			Output:     &Resources{Blue: 1},
			Cost:       &Resources{Yellow: 4},
		},
		{
			ID:         9,
			Name:       "Trade Blue for Pink",
			Type:       ActionCard,
			ActionType: Trade,
			Input:      &Resources{Blue: 3},
			Output:     &Resources{Pink: 1},
			Cost:       &Resources{Green: 4},
		},
		{
			ID:         10,
			Name:       "Rich Yellow Mine",
			Type:       ActionCard,
			ActionType: Produce,
			Output:     &Resources{Yellow: 3},
			Cost:       &Resources{Green: 1},
		},
		{
			ID:         11,
			Name:       "Rich Green Mine",
			Type:       ActionCard,
			ActionType: Produce,
			Output:     &Resources{Green: 3},
			Cost:       &Resources{Blue: 1},
		},
		{
			ID:         12,
			Name:       "Efficient Upgrade",
			Type:       ActionCard,
			ActionType: Upgrade,
			Input:      &Resources{Yellow: 3},
			Output:     &Resources{Green: 2},
			Cost:       &Resources{Green: 2},
		},
	}

	return cards
}

// CreateDefaultPointCards creates a set of default point cards
func CreateDefaultPointCards() []*Card {
	cards := []*Card{
		{
			ID:         101,
			Name:       "Small Golem",
			Type:       PointCard,
			Requirement: &Resources{Yellow: 2, Green: 1},
			Points:     2,
		},
		{
			ID:         102,
			Name:       "Medium Golem",
			Type:       PointCard,
			Requirement: &Resources{Green: 2, Blue: 1},
			Points:     3,
		},
		{
			ID:         103,
			Name:       "Large Golem",
			Type:       PointCard,
			Requirement: &Resources{Blue: 2, Pink: 1},
			Points:     4,
		},
		{
			ID:         104,
			Name:       "Grand Golem",
			Type:       PointCard,
			Requirement: &Resources{Pink: 2},
			Points:     5,
		},
		{
			ID:         105,
			Name:       "Crystal Collector",
			Type:       PointCard,
			Requirement: &Resources{Yellow: 3},
			Points:     2,
		},
		{
			ID:         106,
			Name:       "Green Master",
			Type:       PointCard,
			Requirement: &Resources{Green: 3},
			Points:     3,
		},
		{
			ID:         107,
			Name:       "Blue Master",
			Type:       PointCard,
			Requirement: &Resources{Blue: 3},
			Points:     4,
		},
		{
			ID:         108,
			Name:       "Pink Master",
			Type:       PointCard,
			Requirement: &Resources{Pink: 2, Blue: 1},
			Points:     5,
		},
		{
			ID:         109,
			Name:       "Balanced Golem",
			Type:       PointCard,
			Requirement: &Resources{Yellow: 1, Green: 1, Blue: 1},
			Points:     3,
		},
		{
			ID:         110,
			Name:       "Perfect Golem",
			Type:       PointCard,
			Requirement: &Resources{Yellow: 1, Green: 1, Blue: 1, Pink: 1},
			Points:     6,
		},
		{
			ID:         111,
			Name:       "Simple Golem",
			Type:       PointCard,
			Requirement: &Resources{Yellow: 4},
			Points:     2,
		},
		{
			ID:         112,
			Name:       "Elite Golem",
			Type:       PointCard,
			Requirement: &Resources{Pink: 3},
			Points:     7,
		},
	}

	return cards
}

