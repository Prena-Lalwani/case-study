import { useEffect, useState } from 'react'
import { getAllQueues, subscribe } from '../services/clientQueueStore'

/**
 * Subscribe a component to the client-queue store.
 * Returns the current snapshot of all 4 queues, re-rendering on any change.
 */
export const useClientQueues = () => {
  const [state, setState] = useState(getAllQueues)

  useEffect(() => {
    /* Refresh once on mount in case store changed before subscribe */
    setState(getAllQueues())
    const unsub = subscribe(setState)
    return () => { unsub?.() }
  }, [])

  return state
}
