import { useEffect, useState } from 'react'
import { api } from '../services/api.js'

const POLL_MS = 3000

let cache = []
let loaded = false
const listeners = new Set()

const fetchApps = async () => {
  try {
    cache = await api.get('/loan-applications')
    loaded = true
    for (const fn of listeners) fn(cache)
  } catch (err) {
    console.error('Failed to load loan applications:', err.message)
  }
}

let timer = null
const ensurePolling = () => {
  if (timer) return
  fetchApps()
  timer = setInterval(fetchApps, POLL_MS)
}

export const useLoanApplications = () => {
  const [apps, setApps] = useState(cache)
  useEffect(() => {
    ensurePolling()
    setApps(cache)
    listeners.add(setApps)
    return () => { listeners.delete(setApps) }
  }, [])
  return apps
}

export const refreshLoanApplications = fetchApps
