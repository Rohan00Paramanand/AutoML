/**
 * api.js
 * ------
 * Central API utility for all backend fetch calls.
 *
 * In development the Vite dev server proxies /api → http://127.0.0.1:8000,
 * so API_BASE is '' and relative paths like '/api/health' work fine.
 *
 * In production (Render), VITE_API_URL is set to the backend service URL
 * (e.g. "https://automl-backend.onrender.com"), making calls absolute.
 */

// __API_BASE__ is injected at build time by vite.config.js
const API_BASE = typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : '';

/**
 * Prepend the correct base URL to a relative API path.
 * @param {string} path - e.g. '/api/health'
 */
export function apiUrl(path) {
  return `${API_BASE}${path}`;
}

/**
 * Thin fetch wrapper that automatically prepends API_BASE.
 * Accepts the same arguments as window.fetch.
 */
export function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), options);
}
