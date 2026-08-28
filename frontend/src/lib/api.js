import { getToken } from './token.js';

// Resolution order:
//  1. VITE_API_URL (set this in Vercel / .env to override)
//  2. dev  -> "/api"  (Vite proxies to http://127.0.0.1:8000)
//  3. prod -> deployed Render backend
const DEPLOYED_API = 'https://sih-internal-xtas.onrender.com';
const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? '/api' : DEPLOYED_API);

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseError(res) {
  try {
    const body = await res.json();
    if (body && body.detail) {
      throw new Error(typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail));
    }
    throw new Error(`Request failed (${res.status})`);
  } catch (err) {
    if (err instanceof SyntaxError) throw new Error(`Request failed (${res.status})`);
    throw err;
  }
}

// Render's free tier sleeps after inactivity; the first request can take
// 30-60s to cold-start, so allow a generous timeout.
const DEFAULT_TIMEOUT_MS = 45000;

async function withTimeout(url, init, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out. The service may be slow or unreachable.');
    if (err instanceof TypeError) throw new Error('Cannot reach the backend. Is the API server running?');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiGet(path) {
  return apiFetch(path);
}

export async function apiFetch(path, opts = {}) {
  const res = await withTimeout(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) },
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function apiPost(path, body) {
  const res = await withTimeout(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}
