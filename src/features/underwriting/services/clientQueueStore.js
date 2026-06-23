/* API-backed queue store.
 *
 * Polls /api/queue every 2.5s so background-AI status changes (processing → ready)
 * propagate to the UI. Manual mutations (enqueue) trigger an immediate refresh. */

import { api } from './api.js'

const EMPTY = {
  'personal-advisory': [],
  'business-advisory': [],
  'personal-loan':     [],
  'business-loan':     [],
}

let cache = { ...EMPTY }
let lastFetch = 0
const POLL_MS = 2500
const listeners = new Set()

const emit = () => { for (const fn of listeners) fn(cache) }

const refresh = async () => {
  try {
    const next = await api.get('/queue')
    cache = { ...EMPTY, ...next }
    lastFetch = Date.now()
    emit()
  } catch (err) {
    console.error('Queue refresh failed:', err.message)
  }
}

/* Background poller — singleton */
let pollTimer = null
const startPolling = () => {
  if (pollTimer) return
  pollTimer = setInterval(refresh, POLL_MS)
}
startPolling()
refresh()

/* ── Public API ───────────────────────────────────────────────────────── */

export const getAllQueues = () => cache

export const getQueue = (flowKey) => cache[flowKey] ?? []

export const subscribe = (fn) => {
  listeners.add(fn)
  fn(cache)
  return () => listeners.delete(fn)
}

/* Enqueue a new submission. Payload mirrors the modal's onSave shape. */
export const enqueue = async (flowKey, client) => {
  const created = await api.post('/queue', { ...client, flowKey })
  await refresh()
  return created
}

export const updateItem = async (flowKey, id, patch) => {
  await api.patch(`/queue/${id}`, patch)
  await refresh()
}

/* Used by the processing service to write back the AI result */
export const writeQueueResult = async (id, result) => {
  await api.post(`/queue/${id}/result`, result)
  await refresh()
}

export const removeItem = async (flowKey, id) => {
  await api.delete(`/queue/${id}`)
  await refresh()
}

export const clearAll = async () => {
  /* No bulk delete endpoint — would need to iterate. PoC: no-op. */
  await refresh()
}

/* Manually trigger a refresh (e.g. after a mutation elsewhere) */
export const refreshQueues = refresh
