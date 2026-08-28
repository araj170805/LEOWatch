import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch, apiPost } from '../lib/api.js';
import { getToken, setToken } from '../lib/token.js';

const AuthContext = createContext(null);

/**
 * Centralized authentication against the backend's own JWT auth
 * (POST /auth/register, POST /auth/login, GET /auth/me). One session,
 * stored as a bearer token in localStorage, used app-wide. No external
 * identity provider — the app is fully self-contained.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTok] = useState(getToken());
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  // When a guest triggers a protected action this holds a short label
  // ("save this analysis") and <GuestGateModal> renders the sign-in prompt.
  const [guestGate, setGuestGate] = useState(null);

  // Restore session on load: validate the stored token via /auth/me.
  useEffect(() => {
    const stored = getToken();
    if (!stored) {
      setInitializing(false);
      return;
    }
    apiFetch('/auth/me')
      .then((me) => setUser(me))
      .catch(() => {
        setToken(null);
        setTok(null);
        setUser(null);
      })
      .finally(() => setInitializing(false));
  }, []);

  function applySession(data) {
    setToken(data.token);
    setTok(data.token);
    setUser(data.user);
  }

  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost('/auth/login', { email, password });
      applySession(data);
      return true;
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async ({ name, email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost('/auth/register', { name, email, password });
      applySession(data);
      return true;
    } catch (err) {
      setError(err.message || 'Could not create account.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTok(null);
    setUser(null);
  }, []);

  // Returns true if the user may proceed; otherwise opens the guest gate
  // modal and returns false. Usage: if (!requireAuth('save this report')) return;
  const requireAuth = useCallback(
    (actionLabel = 'use this feature') => {
      if (token) return true;
      setGuestGate(actionLabel);
      return false;
    },
    [token]
  );

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    isGuest: !token,
    login,
    signup,
    logout,
    loading,
    initializing,
    error,
    clearError: () => setError(null),
    guestGate,
    requireAuth,
    closeGuestGate: () => setGuestGate(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
