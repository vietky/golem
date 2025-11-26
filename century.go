// Package golem implements the Century: Golem Edition exercise.
package golem

import "fmt"

// Century returns the century for a given year as an ordinal string.
// For example: year 1705 returns "18th", year 1900 returns "19th",
// year 2000 returns "20th", year 2001 returns "21st".
func Century(year int) string {
	century := (year + 99) / 100
	return fmt.Sprintf("%d%s", century, ordinalSuffix(century))
}

// ordinalSuffix returns the ordinal suffix for a number.
// Examples: 1 -> "st", 2 -> "nd", 3 -> "rd", 4 -> "th", 11 -> "th", 21 -> "st"
func ordinalSuffix(n int) string {
	if n%100 >= 11 && n%100 <= 13 {
		return "th"
	}
	switch n % 10 {
	case 1:
		return "st"
	case 2:
		return "nd"
	case 3:
		return "rd"
	default:
		return "th"
	}
}
