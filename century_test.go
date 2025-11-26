package golem

import "testing"

func TestCentury(t *testing.T) {
	tests := []struct {
		name     string
		year     int
		expected string
	}{
		{"first century", 1, "1st"},
		{"last year of first century", 100, "1st"},
		{"first year of second century", 101, "2nd"},
		{"last year of second century", 200, "2nd"},
		{"third century", 300, "3rd"},
		{"fourth century", 400, "4th"},
		{"year 1705", 1705, "18th"},
		{"year 1900", 1900, "19th"},
		{"year 1901", 1901, "20th"},
		{"year 2000", 2000, "20th"},
		{"year 2001", 2001, "21st"},
		{"year 2022", 2022, "21st"},
		{"year 1601", 1601, "17th"},
		{"year 1100", 1100, "11th"},
		{"year 1200", 1200, "12th"},
		{"year 1300", 1300, "13th"},
		{"year 1000", 1000, "10th"},
		{"year 1001", 1001, "11th"},
		{"year 1101", 1101, "12th"},
		{"year 1201", 1201, "13th"},
		{"year 2100", 2100, "21st"},
		{"year 2200", 2200, "22nd"},
		{"year 2300", 2300, "23rd"},
		{"year 2101", 2101, "22nd"},
		{"year 2201", 2201, "23rd"},
		{"year 2301", 2301, "24th"},
		{"year 11100", 11100, "111th"},
		{"year 11200", 11200, "112th"},
		{"year 11300", 11300, "113th"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := Century(tc.year)
			if result != tc.expected {
				t.Errorf("Century(%d) = %q, want %q", tc.year, result, tc.expected)
			}
		})
	}
}
