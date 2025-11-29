package game

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// CardType represents the type of card
type CardType int

const (
	ActionCard CardType = iota
	PointCard
	CoinCard
	StoneCard
	BackgroundCard
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
	Amount      int        // Amount of coins (for CoinCard)
	TurnUpgrade int        // Turn upgrade (for UpgradeCard)
	// For ActionCard: what it produces/upgrades/trades
	Input  *Resources // Input crystals (for Upgrade/Trade)
	Output *Resources // Output crystals
	// Crystal deposits on card positions (position -> array of crystal types)
	// Position 1, 2, 3 can each hold multiple crystals (stacking)
	Deposits map[int][]CrystalType // Position -> Array of Crystal types
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
func (c *Card) CanPlay(player *Player, action Action) bool {
	if c.Type != ActionCard {
		return false
	}
	if c.ActionType == Upgrade {
		if c.TurnUpgrade == 0 {
			return false
		}

		if action.InputResources == nil || action.OutputResources == nil {
			return false
		}

		if !player.Resources.HasAll(action.InputResources, action.Multiplier) {
			return false
		}

		if !action.InputResources.CanUpgraded(action.OutputResources, c.TurnUpgrade) {
			return false
		}

	} else {
		// Check if player has required input resources
		if c.Input != nil && !player.Resources.HasAll(c.Input, action.Multiplier) {
			return false
		}
	}

	return true
}

// Play executes the card's action
func (c *Card) Play(player *Player, action Action) bool {
	if !c.CanPlay(player, action) {
		return false
	}

	switch c.ActionType {
	case Produce:
		// Simply add output resources
		if c.Output != nil {
			player.Resources.AddAll(c.Output, 1)
		}
	case Upgrade:
		// Subtract input, add output
		if action.InputResources != nil && !player.Resources.SubtractAll(action.InputResources, 1) {
			return false
		}
		if action.OutputResources != nil {
			player.Resources.AddAll(action.OutputResources, 1)
		}
	case Trade:
		// Subtract input, add output
		if c.Input != nil && !player.Resources.SubtractAll(c.Input, action.Multiplier) {
			return false
		}
		if c.Output != nil {
			player.Resources.AddAll(c.Output, action.Multiplier)
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
	return player.Resources.HasAll(c.Requirement, 1)
}

// Claim claims the point card and subtracts required resources
func (c *Card) Claim(player *Player) bool {
	if !c.CanClaim(player) {
		return false
	}
	// Point cards require resources
	if c.Requirement != nil && c.Requirement.Total() > 0 {
		if !player.Resources.SubtractAll(c.Requirement, 1) {
			return false
		}
	}
	player.Points += c.Points
	return true
}

// DepositCrystals deposits crystals on card positions
// Must deposit to all positions from 1 to (targetPosition - 1)
// Example: targetPosition 2 → deposit to position 1
// Example: targetPosition 3 → deposit to positions 1, 2
// Returns true if successful
func (c *Card) DepositCrystals(player *Player, deposits map[int]CrystalType, targetPosition int) bool {
	if c.Deposits == nil {
		c.Deposits = make(map[int][]CrystalType)
	}

	// Validate target position (1-5 for market cards, 1-3 for hand cards)
	if targetPosition < 1 || targetPosition > 5 {
		return false
	}

	// Required positions: from 1 to (targetPosition - 1)
	// If targetPosition is 1, no deposits needed
	if targetPosition == 1 {
		return true
	}

	// Must deposit to all required positions
	for pos := 1; pos < targetPosition; pos++ {
		crystalType, exists := deposits[pos]
		if !exists {
			return false // Missing deposit for required position
		}
		// Check if player has the crystal
		if !player.Resources.Has(crystalType, 1) {
			return false
		}
	}

	// Deduct crystals from player and add to card (stack deposits)
	for pos := 1; pos < targetPosition; pos++ {
		crystalType := deposits[pos]
		if !player.Resources.Subtract(crystalType, 1) {
			return false
		}
		// Stack: append to existing array or create new array
		if c.Deposits[pos] == nil {
			c.Deposits[pos] = make([]CrystalType, 0)
		}
		c.Deposits[pos] = append(c.Deposits[pos], crystalType)
	}

	return true
}

// CollectCrystals collects crystals from specified position
// Can collect from any position, but must leave at least one deposit behind
// If collecting from position N, all positions < N must remain
// Returns collected crystals and true if successful
func (c *Card) CollectCrystals(player *Player, positions []int) (*Resources, bool) {
	if c.Deposits == nil || len(c.Deposits) == 0 {
		return nil, false
	}

	// Must collect exactly one position
	if len(positions) != 1 {
		return nil, false
	}

	collectPosition := positions[0]

	// Check if position exists and has deposits
	depositArray, exists := c.Deposits[collectPosition]
	if !exists || len(depositArray) == 0 {
		return nil, false
	}

	// Count total deposits across all positions
	totalDeposits := 0
	for _, arr := range c.Deposits {
		totalDeposits += len(arr)
	}

	// Must leave at least one deposit behind
	if totalDeposits <= 1 {
		return nil, false // Cannot collect if it's the only deposit
	}

	// Collect one crystal from selected position (take first one)
	collected := NewResources()
	crystalType := depositArray[0]
	collected.Add(crystalType, 1)

	// Remove collected crystal from array
	if len(depositArray) > 1 {
		c.Deposits[collectPosition] = depositArray[1:]
	} else {
		// If this was the last crystal at this position, remove the position
		delete(c.Deposits, collectPosition)
	}

	// Add collected crystals to player
	player.Resources.AddAll(collected, 1)

	return collected, true
}

// CollectAllCrystals collects all crystals from card, leaving only one deposit behind
// Returns collected crystals and true if successful
func (c *Card) CollectAllCrystals(player *Player) (*Resources, bool) {
	if c.Deposits == nil || len(c.Deposits) == 0 {
		return nil, false
	}

	// Count total deposits
	totalDeposits := 0
	for _, arr := range c.Deposits {
		totalDeposits += len(arr)
	}

	// Must leave at least one deposit
	if totalDeposits <= 1 {
		return nil, false // Cannot collect if only one deposit exists
	}

	collected := NewResources()

	// Find the position with the minimum position number (keep this one)
	minPos := 999
	for pos := range c.Deposits {
		if pos < minPos {
			minPos = pos
		}
	}

	// Collect all deposits except keep one from the minimum position
	for pos, depositArray := range c.Deposits {
		if pos == minPos {
			// Keep one deposit at minimum position, collect the rest
			if len(depositArray) > 1 {
				for i := 1; i < len(depositArray); i++ {
					collected.Add(depositArray[i], 1)
				}
				c.Deposits[pos] = depositArray[:1] // Keep only first one
			}
		} else {
			// Collect all deposits from other positions
			for _, crystalType := range depositArray {
				collected.Add(crystalType, 1)
			}
			delete(c.Deposits, pos)
		}
	}

	// Add collected crystals to player
	player.Resources.AddAll(collected, 1)

	return collected, true
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

	switch c.Type {
	case ActionCard:
		switch c.ActionType {
		case Produce:
			parts = append(parts, "Mint:")
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
	case PointCard:
		parts = append(parts, fmt.Sprintf("Points: %d", c.Points))
		if c.Requirement != nil {
			parts = append(parts, fmt.Sprintf("Requires: %s", c.Requirement.String()))
		}
	case CoinCard:
		parts = append(parts, fmt.Sprintf("Coin: %d points", c.Points))
	case StoneCard:
		parts = append(parts, "Stone Image")
	case BackgroundCard:
		parts = append(parts, "Background")
	}

	return strings.Join(parts, " ")
}

// parseResourceString parses a 4-digit string representing [pink][blue][green][yellow]
// Example: "0002" = 2 Yellow, "0011" = 1 Green, 1 Yellow
func parseResourceString(s string) *Resources {
	if len(s) != 4 {
		return NewResources()
	}
	pink, _ := strconv.Atoi(string(s[0]))
	blue, _ := strconv.Atoi(string(s[1]))
	green, _ := strconv.Atoi(string(s[2]))
	yellow, _ := strconv.Atoi(string(s[3]))
	return &Resources{
		Pink:   pink,
		Blue:   blue,
		Green:  green,
		Yellow: yellow,
	}
}

// parseActionCardName parses an action card name in the format:
// - action_[pink][blue][green][yellow]_[pink][blue][green][yellow] (full format)
// - mint_0002 (get 2 Yellow)
// - mint_0011 (get 1 Green, 1 Yellow)
// - upgrade_2 (upgrade 2 crystals: 2 lower -> 1 higher)
// - upgrade_3 (upgrade 3 crystals: 3 lower -> 1 higher)
// - trade_0002_0100 (trade 2 Yellow for 1 Blue)
func parseActionCardName(name string) (ActionType, *Resources, *Resources, *Resources, int) {
	parts := strings.Split(name, "_")
	if len(parts) < 2 {
		return Produce, nil, nil, nil, 0
	}

	actionType := parts[0]

	switch actionType {
	case "action":
		// action_[input]_[output] format
		if len(parts) >= 3 {
			input := parseResourceString(parts[1])
			output := parseResourceString(parts[2])
			// Determine action type based on input/output
			if input.Total() == 0 {
				// No input = Produce/Mint
				cost := NewResources()
				cost.Yellow = output.Total() / 2
				if cost.Yellow == 0 {
					cost.Yellow = 1
				}
				return Produce, nil, output, cost, 0
			} else if input.Total() > output.Total() && output.Total() > 0 {
				// More input than output = Upgrade
				cost := NewResources()
				cost.Yellow = input.Total()
				return Upgrade, input, output, cost, 0
			} else {
				// Trade
				cost := NewResources()
				cost.Yellow = input.Total()
				return Trade, input, output, cost, 0
			}
		}
	case "mint":
		// mint_0002 format: output only
		if len(parts) >= 2 {
			output := parseResourceString(parts[1])
			// Cost is typically based on output, default to 1 yellow per output crystal
			cost := NewResources()
			cost.Yellow = output.Total() / 2
			if cost.Yellow == 0 {
				cost.Yellow = 1
			}
			return Produce, nil, output, cost, 0
		}
	case "upgrade":
		// upgrade_x format: upgrade maximum x turn upgrade for some total upgradeable crystals
		// example: upgrade_2 means upgrade maximum 2 grade for some total upgradeable crystals,
		// eg: 1 yellow -> 1 blue (2 turn upgrade) or 2 yellow -> 2 green (2 turn upgrade), or 1 blue -> 1 pink (1 turn upgrade)
		if len(parts) >= 2 {
			turnUpgrade, _ := strconv.Atoi(parts[1])
			if turnUpgrade < 2 || turnUpgrade > 3 {
				turnUpgrade = 2
			}
			input := NewResources()
			output := NewResources()
			cost := NewResources()
			return Upgrade, input, output, cost, turnUpgrade
		}
	case "trade":
		// trade_0002_0100 format: input and output
		if len(parts) >= 3 {
			input := parseResourceString(parts[1])
			output := parseResourceString(parts[2])
			// Cost based on input value
			cost := NewResources()
			cost.Yellow = input.Total()
			return Trade, input, output, cost, 0
		}
	}

	return Produce, nil, nil, nil, 0
}

// parseGolemCardName parses a golem card name in the format:
// - golem_4000 (4 Pink = 16 points)
// - golem_2300 (2 Pink, 3 Blue = 17 points)
// Points = pink * 4 + blue * 3 + green * 2 + yellow * 1
func parseGolemCardName(name string) (*Resources, int) {
	parts := strings.Split(name, "_")
	if len(parts) >= 2 {
		requirement := parseResourceString(parts[1])
		points := requirement.Pink*4 + requirement.Blue*3 + requirement.Green*2 + requirement.Yellow*1
		points += getBonusPoints(requirement)
		return requirement, points
	}
	return NewResources(), 0
}

func getBonusPoints(requirement *Resources) int {
	bonusPoints := 0
	// if have at least 3 different colors, +2 bonus points
	differentColors := 0
	if requirement.Pink > 0 {
		differentColors++
	}
	if requirement.Blue > 0 {
		differentColors++
	}
	if requirement.Green > 0 {
		differentColors++
	}
	if requirement.Yellow > 0 {
		differentColors++
	}
	if differentColors >= 3 {
		bonusPoints += 1
	}
	if differentColors >= 4 {
		bonusPoints += 1
	}
	if requirement.Pink+requirement.Blue+requirement.Green+requirement.Yellow == 6 {
		bonusPoints += 1
	}
	return int(math.Max(float64(bonusPoints), 2))
}

// CreateCardFromName creates a card from a name string using the new naming convention
func CreateCardFromName(name string, id int) *Card {
	// Check for coin cards
	if strings.HasPrefix(name, "coin_") {
		parts := strings.Split(name, "_")
		if len(parts) >= 2 {
			points, _ := strconv.Atoi(parts[1])
			return &Card{
				ID:       id,
				Name:     name,
				Type:     CoinCard,
				Points:   points,
				Deposits: make(map[int][]CrystalType),
			}
		}
	}

	// Check for stone cards
	if strings.HasPrefix(name, "stone_") {
		return &Card{
			ID:       id,
			Name:     name,
			Type:     StoneCard,
			Deposits: make(map[int][]CrystalType),
		}
	}

	// Check for background cards
	if strings.HasSuffix(name, "_bg") {
		return &Card{
			ID:       id,
			Name:     name,
			Type:     BackgroundCard,
			Deposits: make(map[int][]CrystalType),
		}
	}

	// Check for golem cards
	if strings.HasPrefix(name, "golem_") {
		requirement, points := parseGolemCardName(name)
		return &Card{
			ID:          id,
			Name:        name,
			Type:        PointCard,
			Requirement: requirement,
			Points:      points,
			Deposits:    make(map[int][]CrystalType),
		}
	}

	// Check for action cards (check action_ first, then others)
	if strings.HasPrefix(name, "action_") {
		actionType, input, output, cost, turnUpgrade := parseActionCardName(name)
		return &Card{
			ID:          id,
			Name:        name,
			Type:        ActionCard,
			ActionType:  actionType,
			Input:       input,
			Output:      output,
			Cost:        cost,
			TurnUpgrade: turnUpgrade,
			Deposits:    make(map[int][]CrystalType),
		}
	}
	if strings.HasPrefix(name, "mint_") || strings.HasPrefix(name, "upgrade_") || strings.HasPrefix(name, "trade_") {
		actionType, input, output, cost, turnUpgrade := parseActionCardName(name)
		return &Card{
			ID:          id,
			Name:        name,
			Type:        ActionCard,
			ActionType:  actionType,
			Input:       input,
			Output:      output,
			Cost:        cost,
			TurnUpgrade: turnUpgrade,
			Deposits:    make(map[int][]CrystalType),
		}
	}

	// Default: return empty card
	return &Card{
		ID:       id,
		Name:     name,
		Type:     ActionCard,
		Deposits: make(map[int][]CrystalType),
	}
}

// CreateDefaultActionCards creates action cards based ONLY on available images
// Only generates cards for which image files exist
func CreateDefaultActionCards() []*Card {
	// Only include card names that have corresponding image files
	cardNames := []string{
		// Mint cards (produce) - only cards with images
		// "mint_0002", // Get 2 Yellow
		"mint_0003", // Get 3 Yellow
		"mint_0004", // Get 4 Yellow
		"mint_0011", // Get 1 Green, 1 Yellow
		"mint_0012", // Get 1 Green, 2 Yellow
		"mint_0020", // Get 2 Green
		"mint_0100", // Get 1 Blue
		"mint_0101", // Get 1 Blue, 1 Yellow
		"mint_1000", // Get 1 Pink
		// Upgrade cards - images exist
		// "upgrade_2", // Upgrade 2 crystals
		"upgrade_3", // Upgrade 3 crystals
		// Trade cards - only cards with images
		"trade_0002_0020", // Trade 2 Yellow for 2 Green
		"trade_0002_0100", // Trade 2 Yellow for 1 Blue
		"trade_0003_0030", // Trade 3 Yellow for 3 Green
		"trade_0003_0110", // Trade 3 Yellow for 1 Green, 1 Blue
		"trade_0003_1000", // Trade 3 Yellow for 1 Pink
		"trade_0004_0200", // Trade 4 Yellow for 2 Blue
		"trade_0004_1100", // Trade 4 Yellow for 1 Blue, 1 Green
		"trade_0005_0300", // Trade 5 Yellow for 3 Blue
		"trade_0005_2000", // Trade 5 Yellow for 2 Pink
		"trade_0010_0003", // Trade 1 Green for 3 Yellow
		"trade_0011_1000", // Trade 1 Green, 1 Yellow for 1 Pink
		"trade_0020_0103", // Trade 2 Green for 1 Blue, 3 Yellow
		"trade_0020_0200", // Trade 2 Green for 2 Blue
		"trade_0020_1002", // Trade 2 Green for 1 Pink, 2 Yellow
		"trade_0030_0202", // Trade 3 Green for 2 Blue, 2 Yellow
		"trade_0030_0300", // Trade 3 Green for 3 Blue
		"trade_0030_1101", // Trade 3 Green for 1 Blue, 1 Green, 1 Yellow
		"trade_0030_2000", // Trade 3 Green for 2 Pink
		"trade_0100_0014", // Trade 1 Blue for 1 Green, 4 Yellow
		"trade_0100_0020", // Trade 1 Blue for 2 Green
		"trade_0100_0021", // Trade 1 Blue for 2 Green, 1 Yellow
		"trade_0200_0032", // Trade 2 Blue for 3 Green, 2 Yellow
		"trade_0200_1012", // Trade 2 Blue for 1 Pink, 1 Green, 2 Yellow
		"trade_0200_1020", // Trade 2 Blue for 1 Pink, 2 Green
		"trade_0200_2000", // Trade 2 Blue for 2 Pink
		"trade_0300_3000", // Trade 3 Blue for 3 Pink
		"trade_1000_0022", // Trade 1 Pink for 2 Green, 2 Yellow
		"trade_1000_0030", // Trade 1 Pink for 3 Green
		"trade_1000_0103", // Trade 1 Pink for 1 Blue, 3 Yellow
		"trade_1000_0111", // Trade 1 Pink for 1 Blue, 1 Green, 1 Yellow
		"trade_1000_0200", // Trade 1 Pink for 2 Blue
		"trade_1002_2000", // Trade 1 Pink, 2 Green for 2 Pink
		"trade_2000_0230", // Trade 2 Pink for 2 Green, 3 Blue
		"trade_2000_0311", // Trade 2 Pink for 3 Blue, 1 Green, 1 Yellow
	}

	cards := make([]*Card, 0, len(cardNames))
	for i, name := range cardNames {
		card := CreateCardFromName(name, i+1)
		cards = append(cards, card)
	}

	return cards
}

// CreateDefaultPointCards creates point cards based ONLY on available images
// Only generates golem cards for which image files exist
// Format: golem_[pink][blue][green][yellow]
// Points = pink * 4 + blue * 3 + green * 2 + yellow * 1
func CreateDefaultPointCards() []*Card {
	// Only include golem card names that have corresponding image files
	golemNames := []string{
		"golem_0022", // 2 Yellow, 2 Green = 6 points
		"golem_0023", // 2 Yellow, 3 Green = 8 points
		"golem_0032", // 3 Yellow, 2 Green = 7 points
		"golem_0040", // 4 Green = 8 points
		"golem_0050", // 5 Green = 10 points
		"golem_0202", // 2 Blue, 2 Green = 10 points
		"golem_0203", // 2 Blue, 3 Green = 12 points
		"golem_0220", // 2 Blue, 2 Green = 10 points
		"golem_0222", // 2 Blue, 2 Green, 2 Yellow = 12 points
		"golem_0230", // 2 Blue, 3 Green = 12 points
		"golem_0302", // 3 Blue, 2 Green = 13 points
		"golem_0320", // 3 Blue, 2 Green = 13 points
		"golem_0400", // 4 Blue = 12 points
		"golem_0500", // 5 Blue = 15 points
		"golem_1012", // 1 Pink, 1 Green, 2 Yellow = 9 points
		"golem_1111", // 1 of each = 10 points (1*4 + 1*3 + 1*2 + 1*1 = 10)
		"golem_1113", // 1 Pink, 1 Blue, 1 Green, 3 Yellow = 12 points
		"golem_1120", // 1 Pink, 1 Blue, 2 Green = 11 points
		"golem_1131", // 1 Pink, 1 Blue, 3 Green, 1 Yellow = 14 points
		"golem_1201", // 1 Pink, 2 Blue, 1 Yellow = 11 points
		"golem_1311", // 1 Pink, 3 Blue, 1 Green, 1 Yellow = 16 points
		"golem_2002", // 2 Pink, 2 Green = 14 points
		"golem_2003", // 2 Pink, 3 Green = 17 points
		"golem_2020", // 2 Pink, 2 Green = 14 points
		"golem_2022", // 2 Pink, 2 Green, 2 Yellow = 16 points
		"golem_2030", // 2 Pink, 3 Green = 17 points
		"golem_2200", // 2 Pink, 2 Blue = 14 points
		"golem_2202", // 2 Pink, 2 Blue, 2 Yellow = 16 points
		"golem_2220", // 2 Pink, 2 Blue, 2 Green = 16 points
		"golem_2300", // 2 Pink, 3 Blue = 17 points (2*4 + 3*3 = 8+9 = 17)
		"golem_3002", // 3 Pink, 2 Green = 16 points
		"golem_3020", // 3 Pink, 2 Green = 16 points
		"golem_3111", // 3 Pink, 1 Blue, 1 Green, 1 Yellow = 18 points
		"golem_3200", // 3 Pink, 2 Blue = 18 points
		"golem_4000", // 4 Pink = 16 points
		"golem_5000", // 5 Pink = 20 points
	}

	cards := make([]*Card, 0, len(golemNames))
	for i, name := range golemNames {
		card := CreateCardFromName(name, 100+i+1)
		cards = append(cards, card)
	}

	return cards
}

// CreateCoinCards creates coin cards
func CreateCoinCards() []*Card {
	return []*Card{
		CreateCardFromName("coin_1", 200), // Silver coin = 1 point
		CreateCardFromName("coin_3", 201), // Bronze coin = 3 points
	}
}

// CreateStoneCards creates stone image cards
func CreateStoneCards() []*Card {
	return []*Card{
		CreateCardFromName("stone_yellow", 300),
		CreateCardFromName("stone_green", 301),
		CreateCardFromName("stone_blue", 302),
		CreateCardFromName("stone_pink", 303),
	}
}

// CreateBackgroundCards creates background cards
func CreateBackgroundCards() []*Card {
	return []*Card{
		CreateCardFromName("golem_bg", 400),
		CreateCardFromName("merchant_bg", 401),
	}
}

func CreateInitialActionCards(playerIndex int) []*Card {
	// Each player starts with 2 cards
	return []*Card{
		CreateCardFromName("mint_0002", 501+playerIndex*2),
		CreateCardFromName("upgrade_2", 502+playerIndex*2),
	}
}
