import { useState } from 'react'
import { getGeminiModel } from '../../../lib/gemini'

/* Convert a File object to a base64 string (strips the data: prefix) */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

/*
 * useGeminiExtract — reusable hook for Gemini structured extraction.
 *
 * Two modes:
 *   extractFromImage(file, prompt, schema) — sends an image + prompt, returns JSON
 *   extractFromData(data, prompt, schema)  — sends plain JSON data + prompt, returns JSON
 *
 * Both return null on failure and set `error`.
 */
export const useGeminiExtract = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState(null)

  const extractFromImage = async (file, prompt, schema) => {
    setIsLoading(true)
    setError(null)
    try {
      console.group('🤖 Gemini — extractFromImage')
      console.log('📄 File:', file.name, file.type, file.size + 'b')
      console.log('📝 Prompt:', prompt)
      console.log('📐 Schema:', schema)

      const base64 = await fileToBase64(file)
      const model  = getGeminiModel(schema)
      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { data: base64, mimeType: file.type } },
      ])
      const raw    = result.response.text()
      const parsed = JSON.parse(raw)

      console.log('✅ Raw response:', raw)
      console.log('✅ Parsed:', parsed)
      console.groupEnd()
      return parsed
    } catch (err) {
      console.error('❌ Gemini error:', err)
      console.groupEnd()
      setError(err.message || 'AI extraction failed')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const extractFromData = async (data, prompt, schema) => {
    setIsLoading(true)
    setError(null)
    try {
      const fullPrompt = `${prompt}\n\nData:\n${JSON.stringify(data, null, 2)}`

      console.group('🤖 Gemini — extractFromData')
      console.log('📦 Input data:', data)
      console.log('📝 Full prompt sent:\n', fullPrompt)
      console.log('📐 Schema:', schema)

      const model  = getGeminiModel(schema)
      const result = await model.generateContent([{ text: fullPrompt }])
      const raw    = result.response.text()
      const parsed = JSON.parse(raw)

      console.log('✅ Raw response:', raw)
      console.log('✅ Parsed:', parsed)
      console.groupEnd()
      return parsed
    } catch (err) {
      console.error('❌ Gemini error:', err)
      console.groupEnd()
      setError(err.message || 'AI extraction failed')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { extractFromImage, extractFromData, isLoading, error }
}
