package game

import (
	"testing"
)

// TestMintCardOutput tests mint card output parsing
func TestMintCardOutput(t *testing.T) {
	card := CreateCardFromName("mint_0003", 1)

	if card.Output == nil {
		t.Fatal("Expected output to be non-nil")
	}

	// mint_0003 should produce 3 yellow crystals
	// Format is [pink][blue][green][yellow]
	// So 0003 = 0 pink, 0 blue, 0 green, 3 yellow
	if card.Output.Yellow != 3 {
		t.Errorf("Expected mint_0003 to produce 3 yellow, got %d", card.Output.Yellow)
	}

	totalOutput := card.Output.Total()
	if totalOutput != 3 {
		t.Errorf("Expected total output of 3, got %d", totalOutput)
	}
}
