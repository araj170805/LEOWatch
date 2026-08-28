// Single source of truth for the auth token (backend-issued JWT).
const KEY = 'og_token';

export function getToken() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(value) {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable (private mode) — session lives in memory only */
  }
}
