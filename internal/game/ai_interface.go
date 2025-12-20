package game

// AIStrategy defines the interface for AI decision-making
// This allows for multiple AI implementations to be easily swapped or extended
type AIStrategy interface {
	// ChooseAction selects an action for the AI player given the current game state
	ChooseAction(player *Player, market *Market, gameState *GameState) Action

	// GetName returns the name of this AI strategy (e.g., "BasicAI", "AdvancedAI")
	GetName() string
}
