import axios from 'axios'
import { authService } from '../../auth/services/authService'

/*
 * Shared axios instance for onboarding API calls.
 * The request interceptor attaches the JWT token automatically
 * so individual service functions don't need to do it manually.
 */
const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = authService.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const documentService = {
  /*
   * POST /api/onboarding/analyze-documents
   * Triggers AI analysis of the uploaded documents.
   * Returns: { confidence, checks[], extractedFields }
   */
  analyzeDocuments: () => api.post('/onboarding/analyze-documents'),
}
