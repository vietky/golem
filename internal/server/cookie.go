package server

import (
	"net/http"
)

const ClientIDCookieName string = "clientId"

func setClientIDToCookie(w http.ResponseWriter, _ *http.Request, v string) {
	cookie := http.Cookie{
		Name:     ClientIDCookieName,
		Value:    v,
		Path:     "/",
		MaxAge:   3600 * 24 * 30, // 30 days
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	}
	http.SetCookie(w, &cookie)
}

func getClientIDFromCookie(_ http.ResponseWriter, r *http.Request) string {
	cookie, err := r.Cookie(ClientIDCookieName)
	if err != nil {
		return ""
	}
	return cookie.Value
}
