import { useEffect, useState } from 'react'
import { api } from '../services/api.js'

const POLL_MS = 5000

let cache = []
let loaded = false
const listeners = new Set()

const fetchClients = async () => {
  try {
    cache = await api.get('/clients')
    loaded = true
    for (const fn of listeners) fn(cache)
  } catch (err) {
    console.error('Failed to load clients:', err.message)
  }
}

/* Singleton poller */
let timer = null
const ensurePolling = () => {
  if (timer) return
  fetchClients()
  timer = setInterval(fetchClients, POLL_MS)
}

/**
 * Live snapshot of the clients list, polled every 5s.
 */
export const useClients = () => {
  const [clients, setClients] = useState(cache)

  useEffect(() => {
    ensurePolling()
    setClients(cache)
    listeners.add(setClients)
    return () => { listeners.delete(setClients) }
  }, [])

  return clients
}

/* Manually trigger a refresh (e.g. after Add Client) */
export const refreshClients = fetchClients
