import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const authService = {
  signIn: async ({ email, password }) => {
    const { data } = await api.post('/auth/signin', { email, password })
    localStorage.setItem('mw_token', data.token)
    localStorage.setItem('mw_user', JSON.stringify(data.user))
    return data
  },

  signUp: async ({ fullName, email, password }) => {
    const { data } = await api.post('/auth/signup', { fullName, email, password })
    localStorage.setItem('mw_token', data.token)
    localStorage.setItem('mw_user', JSON.stringify(data.user))
    return data
  },

  signOut: () => {
    localStorage.removeItem('mw_token')
    localStorage.removeItem('mw_user')
  },

  getToken: () => localStorage.getItem('mw_token'),
  getUser:  () => JSON.parse(localStorage.getItem('mw_user') ?? 'null'),
}
