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
	http.HandleFunc("/api/list", gameServer.HandleListSessions)
	
	// Always serve images from static directory (both React and vanilla JS need this)
	staticDir := filepath.Join(".", "web", "static")
	imagesDir := filepath.Join(staticDir, "images")
	if _, err := os.Stat(imagesDir); err == nil {
		http.Handle("/images/", http.StripPrefix("/images/", http.FileServer(http.Dir(imagesDir))))
		log.Printf("Serving images from ./web/static/images")
	}
	
	// Serve static files - try React build first, fallback to vanilla JS
	reactDir := filepath.Join(".", "web", "react")
	reactIndexPath := filepath.Join(reactDir, "index.html")
	
	// Check if React build exists and has content (index.html exists), otherwise serve vanilla JS
	if _, err := os.Stat(reactIndexPath); err == nil {
		// Serve React build
		http.Handle("/", http.FileServer(http.Dir("./web/react")))
		log.Printf("Serving React frontend from ./web/react")
	} else {
		// Fallback to vanilla JS
		if _, err := os.Stat(staticDir); os.IsNotExist(err) {
			os.MkdirAll(staticDir, 0755)
		}
		http.Handle("/", http.FileServer(http.Dir("./web/static")))
		log.Printf("Serving vanilla JS frontend from ./web/static")
	}

	addr := fmt.Sprintf(":%d", *port)
	fmt.Printf("Century: Golem Edition - Web Server\n")
	fmt.Printf("Server starting on http://localhost%s\n", addr)
	fmt.Printf("Open http://localhost%s in your browser to play\n", addr)
	
	log.Fatal(http.ListenAndServe(addr, nil))
}

