import { useGeminiExtract } from '../../onboarding/hooks/useGeminiExtract'
import { UNDERWRITING_ANALYSIS_SCHEMA, UNDERWRITING_ANALYSIS_PROMPT } from '../ai/underwritingSchemas'

const CACHE_PREFIX = 'uw_ai_'

/* Simple deterministic fingerprint — JSON-stringify with sorted keys */
const fingerprint = obj => {
  const sorted = JSON.parse(JSON.stringify(obj))
  return JSON.stringify(sorted)
}

const readCache = appId => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + appId)
    if (!raw) return null
    return JSON.parse(raw) // { result, fp }
  } catch {
    return null
  }
}

const writeCache = (appId, result, fp) => {
  try {
    localStorage.setItem(CACHE_PREFIX + appId, JSON.stringify({ result, fp }))
  } catch {
    /* localStorage full or unavailable — silently skip */
  }
}

export const useUnderwritingAnalysis = () => {
  const { extractFromData, isLoading, error } = useGeminiExtract()

  const analyseApplication = async (appId, applicationDetail) => {
    /* aiAnalysis is already removed from mock data, but guard just in case */
    const { aiAnalysis: _stripped, ...dataForAI } = applicationDetail

    const fp = fingerprint(dataForAI)
    const cached = readCache(appId)

    /* Return cached result when data hasn't changed */
    if (cached && cached.fp === fp) {
      return cached.result
    }

    /* Call Gemini and persist result */
    const result = await extractFromData(dataForAI, UNDERWRITING_ANALYSIS_PROMPT, UNDERWRITING_ANALYSIS_SCHEMA)
    writeCache(appId, result, fp)
    return result
  }

  return { analyseApplication, isLoading, error }
}
