import axios from 'axios'
import { authService } from '../../auth/services/authService'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = authService.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const onboardingService = {
  get:   ()       => api.get('/onboarding').then((r) => r.data),
  patch: (fields) => api.patch('/onboarding', fields).then((r) => r.data),
}
