import { useEffect, useState } from 'react'
import { api } from '../services/api'

const EMPTY = {
  days: [],
  advisorActivity: [],
  missingDocs: [],
  docQuality: { present: 0, missing: 0, lowQuality: 0, inconsistent: 0, total: 0 },
}

let cache = EMPTY
const listeners = new Set()
const POLL_MS = 15_000

const fetchSummary = async () => {
  try {
    cache = await api.get('/reports/summary?days=90')
    for (const fn of listeners) fn(cache)
  } catch (err) {
    console.error('Reports fetch failed:', err.message)
  }
}

let timer = null
const ensurePolling = () => {
  if (timer) return
  fetchSummary()
  timer = setInterval(fetchSummary, POLL_MS)
}

/* React hook — reports refresh every 15s so newly-added clients show up in charts. */
export const useReports = () => {
  const [data, setData] = useState(cache)
  useEffect(() => {
    ensurePolling()
    setData(cache)
    listeners.add(setData)
    return () => { listeners.delete(setData) }
  }, [])
  return data
}

export const refreshReports = fetchSummary

/* Synchronous accessor for non-React code (CSV export, etc.) */
export const getCachedReports = () => cache
