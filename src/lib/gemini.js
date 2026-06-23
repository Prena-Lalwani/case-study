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
