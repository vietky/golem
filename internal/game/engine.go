package game

import (
	"fmt"
	"strings"

	"golem_century/internal/logger"
	"go.uber.org/zap"
)

// Engine manages the game flow and turn execution
type Engine struct {
	GameState *GameState
	AI        *AIPlayer
}

// NewEngine creates a new game engine
func NewEngine(numPlayers int, seed int64) *Engine {
	gameState := NewGameState(numPlayers, seed)
	ai := NewAIPlayer(gameState.RNG)
	return &Engine{
		GameState: gameState,
		AI:        ai,
	}
}

// Run executes the full game simulation
func (e *Engine) Run() {
	fmt.Println("Starting Century: Golem Edition Simulation")
	fmt.Println("=" + strings.Repeat("=", 78))

	maxTurns := 1000 // Safety limit
	turnCount := 0

	for !e.GameState.GameOver && turnCount < maxTurns {
		turnCount++
		player := e.GameState.GetCurrentPlayer()

		// Print current state
		e.GameState.PrintState()

		// Get action from AI
		action := e.AI.ChooseAction(player, e.GameState.Market, e.GameState)

		// Execute action
		actionStr := e.getActionString(action, player)
		logger.GetLogger().Info("Action", zap.String("action", actionStr))

		if err := e.GameState.ExecuteAction(action); err != nil {
			logger.GetLogger().Error("Action failed", zap.Error(err))
			// If action fails, force rest
			player.Rest()
		}

		// Check for game over
		e.GameState.CheckGameOver()

		// Advance to next turn
		if !e.GameState.GameOver {
			e.GameState.NextTurn()
		}

		// Small delay for readability (optional)
		// time.Sleep(100 * time.Millisecond)
	}

	if turnCount >= maxTurns {
		fmt.Println("\nWARNING: Maximum turns reached!")
	}

	// Print final results
	e.GameState.PrintFinalResults()
}

// getActionString returns a string representation of an action
func (e *Engine) getActionString(action Action, player *Player) string {
	switch action.Type {
	case PlayCard:
		if action.CardIndex >= 0 && action.CardIndex < len(player.Hand) {
			return fmt.Sprintf("Play Card: %s", player.Hand[action.CardIndex].Name)
		}
		return "Play Card (invalid index)"
	case AcquireCard:
		if action.CardIndex >= 0 && action.CardIndex < len(e.GameState.Market.ActionCards) {
			card := e.GameState.Market.ActionCards[action.CardIndex]
			cost := e.GameState.Market.GetActionCardCost(action.CardIndex)
			return fmt.Sprintf("Acquire Card: %s (Cost: %s)", card.Name, cost.String())
		}
		return "Acquire Card (invalid index)"
	case ClaimPointCard:
		if action.CardIndex >= 0 && action.CardIndex < len(e.GameState.Market.PointCards) {
			card := e.GameState.Market.PointCards[action.CardIndex]
			return fmt.Sprintf("Claim Point Card: %s (%d points)", card.Name, card.Points)
		}
		return "Claim Point Card (invalid index)"
	case Rest:
		return "Rest (return all played cards to hand)"
	default:
		return "Unknown Action"
	}
}

// GetGameState returns the current game state
func (e *Engine) GetGameState() *GameState {
	return e.GameState
}

