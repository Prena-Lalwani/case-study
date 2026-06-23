import { useEffect } from 'react'
import { start as startProcessing } from '../services/processingService'

/**
 * Mount once near the router root to start the background processing service.
 * Renders nothing.
 */
const ProcessingBootstrap = () => {
  useEffect(() => { startProcessing() }, [])
  return null
}

export default ProcessingBootstrap
