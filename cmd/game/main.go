package main

import (
	"flag"
	"fmt"
	"time"

	"golem_century/internal/game"
)

func main() {
	// Command line flags
	numPlayers := flag.Int("players", 3, "Number of players (2-4)")
	seed := flag.Int64("seed", time.Now().UnixNano(), "Random seed for reproducibility")
	flag.Parse()

	// Validate number of players
	if *numPlayers < 2 || *numPlayers > 4 {
		fmt.Printf("Invalid number of players: %d. Must be between 2 and 4.\n", *numPlayers)
		*numPlayers = 3
		fmt.Printf("Using default: %d players\n", *numPlayers)
	}

	fmt.Printf("Century: Golem Edition - CLI Simulation\n")
	fmt.Printf("Players: %d, Seed: %d\n\n", *numPlayers, *seed)

	// Create and run game engine
	engine := game.NewEngine(*numPlayers, *seed)
	engine.Run()
}

