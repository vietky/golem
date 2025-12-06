package main

import (
	"flag"
	"time"

	"golem_century/internal/game"
	"golem_century/internal/logger"
)

func main() {
	// Command line flags
	numPlayers := flag.Int("players", 3, "Number of players (2-4)")
	seed := flag.Int64("seed", time.Now().UnixNano(), "Random seed for reproducibility")
	flag.Parse()

	// Initialize logger
	lg, _ := logger.NewLogger(true)
	defer lg.Sync()

	// Validate number of players
	if *numPlayers < 2 || *numPlayers > 4 {
		lg.Sugar().Warnf("Invalid number of players: %d. Must be between 2 and 4.", *numPlayers)
		*numPlayers = 3
		lg.Sugar().Warnf("Using default: %d players", *numPlayers)
	}

	lg.Info("Century: Golem Edition - CLI Simulation")
	lg.Sugar().Infof("Players: %d, Seed: %d", *numPlayers, *seed)

	// Create and run game engine
	engine := game.NewEngine(*numPlayers, *seed)
	engine.Run()
}
