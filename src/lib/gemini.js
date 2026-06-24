import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

/*
 * Returns a Gemini 2.5 Flash model.
 * - With responseSchema → strict JSON matching the schema (extraction / structured outputs)
 * - Without responseSchema → free-form text (chat, summaries, recommendations)
 */
export const getGeminiModel = (responseSchema) => {
  const generationConfig = responseSchema
    ? { responseMimeType: 'application/json', responseSchema }
    : {}
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig,
  })
}

/*
 * Robustly parse JSON out of a model's text response.
 * Models sometimes wrap output in ```json fences or prepend prose even when
 * asked for JSON — a bare JSON.parse() then throws. This strips fences and,
 * failing that, extracts the first balanced {…} / […] block before parsing.
 */
export const parseModelJson = (text) => {
  if (text == null || String(text).trim() === '') {
    throw new Error('Empty response from AI model')
  }
  let s = String(text).trim()

  // Strip a surrounding ```json … ``` (or ``` … ```) fence if present.
  const fenced = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenced) s = fenced[1].trim()

  // Happy path.
  try { return JSON.parse(s) } catch { /* fall through to extraction */ }

  // Extract the first balanced object/array, respecting strings/escapes.
  const start = s.search(/[{[]/)
  if (start === -1) throw new Error('AI response contained no JSON')
  const open = s[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === open) depth++
    else if (c === close) {
      depth--
      if (depth === 0) return JSON.parse(s.slice(start, i + 1))
    }
  }
  throw new Error('AI response contained incomplete JSON')
}
