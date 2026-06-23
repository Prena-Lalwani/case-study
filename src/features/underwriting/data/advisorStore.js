/* API-backed advisor store with CRUD + subscription.
 * In-memory cache + polling keeps the UI live for low-frequency mutations. */

import { api } from '../services/api.js'

let cache = []
let loaded = false
const listeners = new Set()

const emit = () => { for (const fn of listeners) fn(cache) }

const load = async () => {
  cache = await api.get('/advisors')
  loaded = true
  emit()
  return cache
}

/* Initial fetch on first import; resolves quickly thanks to Vite dev server */
const initial = load().catch(err => {
  console.error('Failed to load advisors:', err)
  return []
})

/* ── Public API ───────────────────────────────────────────────────────── */

export const getAllAdvisors = () => cache

/* Async variant for callers that need fresh data right now (e.g. AI processor) */
export const fetchAdvisors = async () => {
  if (!loaded) await initial
  return cache
}

export const subscribeAdvisors = (fn) => {
  listeners.add(fn)
  if (loaded) fn(cache)
  return () => listeners.delete(fn)
}

export const createAdvisor = async (advisor) => {
  await api.post('/advisors', advisor)
  await load()
}

export const updateAdvisor = async (id, patch) => {
  await api.patch(`/advisors/${id}`, patch)
  await load()
}

export const deleteAdvisor = async (id) => {
  await api.delete(`/advisors/${id}`)
  await load()
}

export const resetAdvisors = async () => {
  /* No-op against API — handled by re-running the seed script server-side. */
  await load()
}
