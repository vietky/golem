// Helper to build API URLs based on Vite env `VITE_API_HOST`.
export const API_BASE = import.meta.env.VITE_API_HOST ? import.meta.env.VITE_API_HOST.replace(/\/$/, '') : ''

export function apiUrl(path) {
  if (!path.startsWith('/')) path = '/' + path
  return API_BASE ? `${API_BASE}${path}` : path
}

export async function apiFetch(path, options) {
  const url = apiUrl(path)
  return fetch(url, options)
}

// Get cookie value by name
export function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Get client ID from cookie
export function getClientIDFromCookie() {
  return getCookie('clientId');
}
