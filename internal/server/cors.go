package server

import (
	"net/http"
)

// WrapWithCORS returns an http.Handler that adds permissive CORS headers
// and handles OPTIONS preflight requests. It echoes the Origin header
// when present to allow credentials and websockets from browsers.
func WrapWithCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Upgrade, Connection")
		// Allow credentials to support authenticated requests from browsers
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Short-circuit OPTIONS preflight
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
