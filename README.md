# golem

Century: Golem Edition exercise implementation in Go.

## Description

Given a year, return which century it is in, as an ordinal string (e.g., "1st", "2nd", "3rd", "4th", "21st").

The first century spans from year 1 to 100 inclusive, the second century from 101 to 200 inclusive, and so on.

## Usage

```go
package main

import (
    "fmt"
    "golem"
)

func main() {
    fmt.Println(golem.Century(1705))  // Output: "18th"
    fmt.Println(golem.Century(1900))  // Output: "19th"
    fmt.Println(golem.Century(2000))  // Output: "20th"
    fmt.Println(golem.Century(2001))  // Output: "21st"
}
```

## Running Tests

```bash
go test -v ./...
```