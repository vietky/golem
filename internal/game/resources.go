package game

import (
	"fmt"
	"strings"
)

// CrystalType represents the type of crystal
type CrystalType int

const (
	Yellow CrystalType = iota
	Green
	Blue
	Pink
)

// CrystalTypeNames maps crystal types to their string names
var CrystalTypeNames = map[CrystalType]string{
	Yellow: "Yellow",
	Green:  "Green",
	Blue:   "Blue",
	Pink:   "Pink",
}

// MaxCrystals is the maximum number of crystals a player can hold
const MaxCrystals = 10

// Resources represents a collection of crystals
type Resources struct {
	Yellow int
	Green  int
	Blue   int
	Pink   int
}

// NewResources creates a new empty Resources struct
func NewResources() *Resources {
	return &Resources{}
}

// Get returns the count of a specific crystal type
func (r *Resources) Get(crystal CrystalType) int {
	switch crystal {
	case Yellow:
		return r.Yellow
	case Green:
		return r.Green
	case Blue:
		return r.Blue
	case Pink:
		return r.Pink
	default:
		return 0
	}
}

// Set sets the count of a specific crystal type
func (r *Resources) Set(crystal CrystalType, count int) {
	switch crystal {
	case Yellow:
		r.Yellow = count
	case Green:
		r.Green = count
	case Blue:
		r.Blue = count
	case Pink:
		r.Pink = count
	}
}

// Add adds crystals to the resources
func (r *Resources) Add(crystal CrystalType, count int) {
	switch crystal {
	case Yellow:
		r.Yellow += count
	case Green:
		r.Green += count
	case Blue:
		r.Blue += count
	case Pink:
		r.Pink += count
	}
}

// Subtract subtracts crystals from the resources (returns false if insufficient)
func (r *Resources) Subtract(crystal CrystalType, count int) bool {
	if r.Get(crystal) < count {
		return false
	}
	switch crystal {
	case Yellow:
		r.Yellow -= count
	case Green:
		r.Green -= count
	case Blue:
		r.Blue -= count
	case Pink:
		r.Pink -= count
	}
	return true
}

// Has checks if the resources have at least the required amount
func (r *Resources) Has(crystal CrystalType, count int) bool {
	return r.Get(crystal) >= count
}

// HasAll checks if the resources have all the required crystals
func (r *Resources) HasAll(required *Resources, multiplier int) bool {
	if multiplier <= 0 {
		multiplier = 1
	}
	return r.Yellow >= required.Yellow &&
		r.Green >= required.Green &&
		r.Blue >= required.Blue &&
		r.Pink >= required.Pink
}

// SubtractAll subtracts all required resources (returns false if insufficient)
func (r *Resources) SubtractAll(required *Resources, multiplier int) bool {
	if multiplier <= 0 {
		multiplier = 1
	}
	if !r.HasAll(required, multiplier) {
		return false
	}
	r.Yellow -= required.Yellow * multiplier
	r.Green -= required.Green * multiplier
	r.Blue -= required.Blue * multiplier
	r.Pink -= required.Pink * multiplier
	return true
}

// AddAll adds all resources from another Resources struct
func (r *Resources) AddAll(other *Resources, multiplier int) {
	if multiplier <= 0 {
		multiplier = 1
	}
	r.Yellow += other.Yellow * multiplier
	r.Green += other.Green * multiplier
	r.Blue += other.Blue * multiplier
	r.Pink += other.Pink * multiplier
}

// Copy creates a copy of the resources
func (r *Resources) Copy() *Resources {
	return &Resources{
		Yellow: r.Yellow,
		Green:  r.Green,
		Blue:   r.Blue,
		Pink:   r.Pink,
	}
}

// Total returns the total number of crystals
func (r *Resources) Total() int {
	return r.Yellow + r.Green + r.Blue + r.Pink
}

// TotalPoints returns the total number of points
func (r *Resources) GetFinalPoints() int {
	return r.Green + r.Blue + r.Pink
}

// String returns a string representation of the resources
func (r *Resources) String() string {
	parts := []string{}
	if r.Yellow > 0 {
		parts = append(parts, fmt.Sprintf("%d Yellow", r.Yellow))
	}
	if r.Green > 0 {
		parts = append(parts, fmt.Sprintf("%d Green", r.Green))
	}
	if r.Blue > 0 {
		parts = append(parts, fmt.Sprintf("%d Blue", r.Blue))
	}
	if r.Pink > 0 {
		parts = append(parts, fmt.Sprintf("%d Pink", r.Pink))
	}
	if len(parts) == 0 {
		return "None"
	}
	return strings.Join(parts, ", ")
}

func (r *Resources) GetLevels() int {
	return r.Yellow*1 + r.Green*2 + r.Blue*3 + r.Pink*4
}

func (r *Resources) CanUpgraded(other *Resources, maxTurnUpgrade int) bool {
	if r.Total() != other.Total() {
		return false
	}
	beforeLevels := r.GetLevels()
	afterLevels := other.GetLevels()
	if afterLevels-beforeLevels > maxTurnUpgrade || afterLevels-beforeLevels < 0 {
		return false
	}

	before := []int{r.Yellow, r.Green, r.Blue, r.Pink}
	after := []int{other.Yellow, other.Green, other.Blue, other.Pink}
	aidx := 0
	for bidx, stones := range before {
		for stones > 0 {
			for aidx < len(after) && after[aidx] == 0 {
				aidx++
			}
			if aidx >= len(after) || aidx < bidx {
				return false
			}
			stones--
			after[aidx]--
		}
	}
	for aidx < len(after) && after[aidx] == 0 {
		aidx++
	}
	if aidx < len(after) {
		return false
	}

	return true
}
