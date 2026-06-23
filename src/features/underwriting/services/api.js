/* Thin fetch wrapper for the underwriting API.
 *
 * In development: Vite proxies /api → http://localhost:4000.
 * In production: set VITE_API_BASE to your deployed backend URL
 *                (e.g. https://your-backend.onrender.com). */

const BASE = import.meta.env.VITE_API_BASE
  ? `${import.meta.env.VITE_API_BASE.replace(/\/$/, '')}/api`
  : '/api'

const request = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  const text = await res.text()

  /* Detect HTML responses (ngrok error pages, 502 / 404 from a missing API server). */
  if (text.trimStart().startsWith('<')) {
    throw new Error(
      `${method} ${path} returned HTML instead of JSON (${res.status}). ` +
      `The API server is probably not running on port 4000.`
    )
  }

  let json = null
  if (text) {
    try { json = JSON.parse(text) }
    catch { throw new Error(`${method} ${path}: invalid JSON response`) }
  }

  if (!res.ok) {
    const message = json?.error || `${method} ${path} failed (${res.status})`
    throw new Error(message)
  }
  return json
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
}
