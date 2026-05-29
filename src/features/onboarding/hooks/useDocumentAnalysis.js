import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { documentService } from '../services/documentService'

/*
 * useDocumentAnalysis — covers TWO concepts:
 *
 *  1. API integration — calls POST /api/onboarding/analyze-documents
 *
 *  2. TanStack Query — manages the loading / success / error states
 *     automatically. No manual isLoading flag, no try/catch, no
 *     cleanup — useQuery handles all of it.
 *
 * How useQuery works:
 *   queryKey  → unique cache key. If this key already has data, it
 *               returns the cached result instantly (no re-fetch).
 *   queryFn   → the async function that fetches data.
 *   staleTime → how long cached data stays "fresh". Infinity = never
 *               re-fetch once we have a result (analysis runs once).
 *
 * The progress bar is the only piece that stays as useState —
 * it's purely a visual animation, not data from the server.
 */
export const useDocumentAnalysis = () => {
  const [progress, setProgress] = useState(0)

  /* ── TanStack Query does the heavy lifting ── */
  const { data, isLoading, isError, error } = useQuery({
    queryKey:  ['documentAnalysis'],
    queryFn:   () => documentService.analyzeDocuments().then((r) => r.data),
    staleTime: Infinity,   // analysis result never goes stale — run once
    retry:     1,          // retry once on failure before showing error
  })

  /* ── Animate progress bar while isLoading is true ── */
  useEffect(() => {
    if (!isLoading) return
    const id = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 82))   // creep up to 82%, not 100%
    }, 80)
    return () => clearInterval(id)
  }, [isLoading])

  /* ── Jump to 100% the moment the query succeeds ── */
  useEffect(() => {
    if (data) setProgress(100)
  }, [data])

  return {
    /* TanStack Query states — used to switch UI */
    isLoading,
    isError,
    isSuccess: !!data,

    /* Progress for the animated bar (0–100) */
    progress,

    /* Data returned by the server once complete */
    steps:      data?.checks      ?? null,
    confidence: data?.confidence  ?? null,
    error:      error?.message    ?? 'Something went wrong',
  }
}
