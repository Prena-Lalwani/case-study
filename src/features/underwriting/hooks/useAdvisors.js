import { useEffect, useState } from 'react'
import { getAllAdvisors, subscribeAdvisors } from '../data/advisorStore'

/**
 * Live snapshot of the advisor list. Re-renders on any add/update/delete.
 */
export const useAdvisors = () => {
  const [advisors, setAdvisors] = useState(getAllAdvisors)

  useEffect(() => {
    setAdvisors(getAllAdvisors())
    const unsub = subscribeAdvisors(setAdvisors)
    return () => { unsub?.() }
  }, [])

  return advisors
}
