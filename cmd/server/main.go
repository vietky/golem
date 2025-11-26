package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"golem_century/internal/server"
)

func main() {
	port := flag.Int("port", 8080, "Port to run the server on")
	flag.Parse()

	gameServer := server.NewGameServer()

	// Setup routes
	http.HandleFunc("/ws", gameServer.HandleWebSocket)
	http.HandleFunc("/api/create", gameServer.HandleCreateSession)
	http.HandleFunc("/api/join", gameServer.HandleJoinSession)
	
	// Serve static files
	staticDir := filepath.Join(".", "web", "static")
	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		// Create directory if it doesn't exist
		os.MkdirAll(staticDir, 0755)
	}
	http.Handle("/", http.FileServer(http.Dir("./web/static")))

	addr := fmt.Sprintf(":%d", *port)
	fmt.Printf("Century: Golem Edition - Web Server\n")
	fmt.Printf("Server starting on http://localhost%s\n", addr)
	fmt.Printf("Open http://localhost%s in your browser to play\n", addr)
	
	log.Fatal(http.ListenAndServe(addr, nil))
}

