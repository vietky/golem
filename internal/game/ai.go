package game

import "math/rand"

// BasicAI represents the basic AI decision-making logic
// Implements the AIStrategy interface
type BasicAI struct {
	rng *rand.Rand
}

// NewBasicAI creates a new basic AI player
func NewBasicAI(rng *rand.Rand) *BasicAI {
	return &BasicAI{rng: rng}
}

// GetName returns the name of this AI strategy
func (ai *BasicAI) GetName() string {
	return "BasicAI"
}

// AIPlayer is an alias for BasicAI for backwards compatibility
type AIPlayer = BasicAI

// NewAIPlayer creates a new AI player (backwards compatibility)
func NewAIPlayer(rng *rand.Rand) *AIPlayer {
	return NewBasicAI(rng)
}

// ChooseAction selects an action for the AI player
func (ai *BasicAI) ChooseAction(player *Player, market *Market, gameState *GameState) Action {
	// Priority 0: Handle pending discard (must discard before doing anything else)
	if player.PendingDiscard > 0 {
		return ai.chooseDiscardAction(player)
	}

	// Priority 1: Claim a point card if possible (win condition)
	if claimable := player.CanClaimAny(market.PointCards); claimable != nil {
		return Action{
			Type:      ClaimPointCard,
			CardIndex: ai.findPointCardIndex(market.PointCards, claimable),
		}
	}

	// Priority 2: Play a card if possible (prefer production/upgrade)
	playableAction := ai.findPlayableAction(player)
	if playableAction != nil {
		return *playableAction
	}

	// Priority 3: Acquire a cheap action card if we have resources
	if affordableCard := ai.findAffordableCard(player, market); affordableCard >= 0 {
		return Action{
			Type:      AcquireCard,
			CardIndex: affordableCard,
		}
	}

	// Priority 4: Rest if we have played cards
	if len(player.PlayedCards) > 0 {
		return Action{Type: Rest}
	}

	// Default: Rest (shouldn't happen often)
	return Action{Type: Rest}
}

// chooseDiscardAction intelligently chooses which crystals to discard
// Strategy: discard lowest-value crystals first (Yellow < Green < Blue < Pink)
func (ai *BasicAI) chooseDiscardAction(player *Player) Action {
	discardResources := NewResources()
	remaining := player.PendingDiscard

	// Discard in order of crystal value (lowest first): Yellow → Green → Blue → Pink
	crystalOrder := []struct {
		crystal CrystalType
	}{
		{Yellow},
		{Green},
		{Blue},
		{Pink},
	}

	for _, ct := range crystalOrder {
		available := player.Resources.Get(ct.crystal)
		toDiscard := min(available, remaining)
		discardResources.Add(ct.crystal, toDiscard)
		remaining -= toDiscard
		if remaining <= 0 {
			break
		}
	}

	return Action{
		Type:             Discard,
		DiscardResources: discardResources,
	}
}

// findPlayableAction finds a playable action (with all necessary parameters)
func (ai *BasicAI) findPlayableAction(player *Player) *Action {
	// First pass: look for production cards
	for i, card := range player.Hand {
		if card.Type == ActionCard && card.ActionType == Produce {
			action := Action{Type: PlayCard, CardIndex: i, Multiplier: 1}
			if card.CanPlay(player, action) {
				return &action
			}
		}
	}
	// Second pass: look for upgrade cards
	for i, card := range player.Hand {
		if card.Type == ActionCard && card.ActionType == Upgrade {
			// Try to find a valid upgrade action
			action := ai.findUpgradeAction(player, card, i)
			if action != nil {
				return action
			}
		}
	}
	// Third pass: look for trade cards
	for i, card := range player.Hand {
		if card.Type == ActionCard && card.ActionType == Trade {
			// Calculate multiplier based on available resources
			multiplier := 1
			if card.Input != nil && card.Input.Total() > 0 {
				multiplier = player.Resources.GetMaxMultiplier(card.Input)
			}
			action := Action{Type: PlayCard, CardIndex: i, Multiplier: multiplier}
			if multiplier > 0 && card.CanPlay(player, action) {
				return &action
			}
		}
	}
	return nil
}

// findUpgradeAction finds a valid upgrade action for an upgrade card
func (ai *BasicAI) findUpgradeAction(player *Player, card *Card, cardIndex int) *Action {
	if card.ActionType != Upgrade || card.TurnUpgrade == 0 {
		return nil
	}

	// Try to upgrade the most valuable crystal we have
	// Priority: yellow -> green -> blue (to get to pink)
	upgradePaths := []struct {
		input  CrystalType
		output CrystalType
		turns  int
	}{
		{Yellow, Green, 1},
		{Green, Blue, 1},
		{Blue, Pink, 1},
		{Yellow, Blue, 2},
		{Green, Pink, 2},
		{Yellow, Pink, 3},
	}

	for _, path := range upgradePaths {
		if path.turns != card.TurnUpgrade {
			continue
		}

		var inputCount int
		switch path.input {
		case Yellow:
			inputCount = player.Resources.Yellow
		case Green:
			inputCount = player.Resources.Green
		case Blue:
			inputCount = player.Resources.Blue
		}

		if inputCount > 0 {
			input := &Resources{}
			output := &Resources{}

			switch path.input {
			case Yellow:
				input.Yellow = 1
			case Green:
				input.Green = 1
			case Blue:
				input.Blue = 1
			}

			switch path.output {
			case Green:
				output.Green = 1
			case Blue:
				output.Blue = 1
			case Pink:
				output.Pink = 1
			}

			action := Action{
				Type:            PlayCard,
				CardIndex:       cardIndex,
				InputResources:  input,
				OutputResources: output,
			}

			if card.CanPlay(player, action) {
				return &action
			}
		}
	}

	return nil
}

// findAffordableCard finds the cheapest affordable card in the market
func (ai *BasicAI) findAffordableCard(player *Player, market *Market) int {
	// Check from cheapest to most expensive
	for i := 0; i < len(market.ActionCards); i++ {
		cost := market.GetActionCardCost(i)
		if cost != nil && player.Resources.HasAll(cost, 1) {
			return i
		}
	}
	return -1
}

// findPointCardIndex finds the index of a point card in the market
func (ai *BasicAI) findPointCardIndex(pointCards []*Card, target *Card) int {
	for i, card := range pointCards {
		if card.ID == target.ID {
			return i
		}
	}
	return 0
}

// RestOnlyAI is a passive AI that only takes Rest actions
// Used in multiplayer mode for placeholder players that shouldn't play actively
type RestOnlyAI struct {
}

// NewRestOnlyAI creates a new rest-only AI player
func NewRestOnlyAI() *RestOnlyAI {
	return &RestOnlyAI{}
}

// GetName returns the name of this AI strategy
func (ai *RestOnlyAI) GetName() string {
	return "RestOnlyAI"
}

// ChooseAction always returns a Rest action
// This AI is a placeholder for multiplayer games and doesn't actively play
func (ai *RestOnlyAI) ChooseAction(player *Player, market *Market, gameState *GameState) Action {
	// If player has pending discard, must handle it first
	if player.PendingDiscard > 0 {
		discardResources := NewResources()
		remaining := player.PendingDiscard

		// Discard in order: Yellow → Green → Blue → Pink
		for _, crystalType := range []CrystalType{Yellow, Green, Blue, Pink} {
			available := player.Resources.Get(crystalType)
			toDiscard := min(available, remaining)
			discardResources.Add(crystalType, toDiscard)
			remaining -= toDiscard
			if remaining <= 0 {
				break
			}
		}

		return Action{
			Type:             Discard,
			DiscardResources: discardResources,
		}
	}

	// Otherwise, always rest
	return Action{Type: Rest}
}
