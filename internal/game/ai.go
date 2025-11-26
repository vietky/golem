package game

import "math/rand"

// AIPlayer represents AI decision-making logic
type AIPlayer struct {
	rng *rand.Rand
}

// NewAIPlayer creates a new AI player
func NewAIPlayer(rng *rand.Rand) *AIPlayer {
	return &AIPlayer{rng: rng}
}

// ChooseAction selects an action for the AI player
func (ai *AIPlayer) ChooseAction(player *Player, market *Market, gameState *GameState) Action {
	// Priority 1: Claim a point card if possible (win condition)
	if claimable := player.CanClaimAny(market.PointCards); claimable != nil {
		return Action{
			Type:     ClaimPointCard,
			CardIndex: ai.findPointCardIndex(market.PointCards, claimable),
		}
	}

	// Priority 2: Play a card if possible (prefer production/upgrade)
	if playableCard := ai.findPlayableCard(player); playableCard >= 0 {
		return Action{
			Type:     PlayCard,
			CardIndex: playableCard,
		}
	}

	// Priority 3: Acquire a cheap action card if we have resources
	if affordableCard := ai.findAffordableCard(player, market); affordableCard >= 0 {
		return Action{
			Type:     AcquireCard,
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

// findPlayableCard finds a playable card in hand (prefers production, then upgrade, then trade)
func (ai *AIPlayer) findPlayableCard(player *Player) int {
	// First pass: look for production cards
	for i, card := range player.Hand {
		if card.Type == ActionCard && card.ActionType == Produce {
			if card.CanPlay(player) {
				return i
			}
		}
	}
	// Second pass: look for upgrade cards
	for i, card := range player.Hand {
		if card.Type == ActionCard && card.ActionType == Upgrade {
			if card.CanPlay(player) {
				return i
			}
		}
	}
	// Third pass: look for trade cards
	for i, card := range player.Hand {
		if card.Type == ActionCard && card.ActionType == Trade {
			if card.CanPlay(player) {
				return i
			}
		}
	}
	return -1
}

// findAffordableCard finds the cheapest affordable card in the market
func (ai *AIPlayer) findAffordableCard(player *Player, market *Market) int {
	// Check from cheapest to most expensive
	for i := 0; i < len(market.ActionCards); i++ {
		cost := market.GetActionCardCost(i)
		if cost != nil && player.Resources.HasAll(cost) {
			return i
		}
	}
	return -1
}

// findPointCardIndex finds the index of a point card in the market
func (ai *AIPlayer) findPointCardIndex(pointCards []*Card, target *Card) int {
	for i, card := range pointCards {
		if card.ID == target.ID {
			return i
		}
	}
	return 0
}

