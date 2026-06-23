/* Background processing service.
 *
 * Watches the API-backed queue for 'queued' items, marks them 'processing',
 * runs the appropriate Gemini analysis, and POSTs the result back via
 * /api/queue/:id/result (which atomically writes the AI analysis + advisor
 * assignment + flips the queue item to 'ready').
 *
 * Singleton: start() is idempotent and called once via ProcessingBootstrap. */

import { getGeminiModel } from '../../../lib/gemini'
import { ADVISORY_REVIEW_PROMPT, ADVISORY_REVIEW_SCHEMA } from '../ai/advisorySchemas'
import { UNDERWRITING_ANALYSIS_PROMPT, UNDERWRITING_ANALYSIS_SCHEMA } from '../ai/underwritingSchemas'
import { fetchAdvisors } from '../data/advisorStore'
import { api } from './api.js'
import {
  getAllQueues,
  subscribe,
  updateItem,
  writeQueueResult,
} from './clientQueueStore'

let running   = false
let isPumping = false

const advisorsForFlow = (advisors, flowKey) =>
  advisors.filter(a => (a.focus ?? []).includes(flowKey))

/* ── Per-flow processors ─────────────────────────────────────────────── */

const processAdvisory = async (item) => {
  const advisors = await fetchAdvisors()
  const filtered = advisorsForFlow(advisors, item.flowKey)
  const pool     = filtered.length > 0 ? filtered : advisors

  const payload = {
    client:   item.client,
    advisors: pool.map(a => ({
      id: a.id, name: a.name, specialty: a.specialty,
      yearsExperience: a.yearsExperience, clientLoad: a.clientLoad,
      focus: a.focus,
    })),
  }

  const fullPrompt = `${ADVISORY_REVIEW_PROMPT}\n\nData:\n${JSON.stringify(payload, null, 2)}`
  const model      = getGeminiModel(ADVISORY_REVIEW_SCHEMA)
  const result     = await model.generateContent([{ text: fullPrompt }])
  return JSON.parse(result.response.text())
}

const processLoan = async (item) => {
  const fullPrompt = `${UNDERWRITING_ANALYSIS_PROMPT}\n\nData:\n${JSON.stringify(item.client, null, 2)}`
  const model      = getGeminiModel(UNDERWRITING_ANALYSIS_SCHEMA)
  const result     = await model.generateContent([{ text: fullPrompt }])
  return JSON.parse(result.response.text())
}

/* ── Pump loop ───────────────────────────────────────────────────────── */

/* Items stuck in 'processing' for longer than this are assumed dead
   (browser was closed mid-call) and re-picked up. */
const STALE_PROCESSING_MS = 90_000

const pickNextQueued = () => {
  const all = getAllQueues()
  const now = Date.now()
  for (const flowKey of Object.keys(all)) {
    /* Always pick fresh 'queued' first */
    const fresh = all[flowKey].find(it => it.status === 'queued')
    if (fresh) return fresh
    /* Otherwise rescue stale 'processing' items from a previous session */
    const stale = all[flowKey].find(it =>
      it.status === 'processing' &&
      now - new Date(it.createdAt).getTime() > STALE_PROCESSING_MS
    )
    if (stale) return stale
  }
  return null
}

const pump = async () => {
  if (isPumping) return
  isPumping = true
  try {
    while (true) {
      const item = pickNextQueued()
      if (!item) break

      try {
        await updateItem(item.flowKey, item.id, { status: 'processing' })
        const result = item.flowKey.endsWith('-advisory')
          ? await processAdvisory(item)
          : await processLoan(item)
        await writeQueueResult(item.id, result)
      } catch (err) {
        console.error('Processing failed for', item.id, err)
        try {
          await api.patch(`/queue/${item.id}`, {
            status: 'error',
            errorMessage: err.message ?? 'Unknown processing error',
            processedAt: new Date().toISOString(),
          })
        } catch { /* best-effort */ }
      }
    }
  } finally {
    isPumping = false
  }
}

/* ── Public ──────────────────────────────────────────────────────────── */

export const start = () => {
  if (running) return
  running = true
  subscribe(() => { pump().catch(() => {}) })
  pump().catch(() => {})
}
