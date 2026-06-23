/* Tiny PoC auth store backed by localStorage.
 * Real apps would replace this with a session/JWT check. */

const KEY = 'uw_auth'

export const signIn = (username) => {
  localStorage.setItem(KEY, JSON.stringify({ user: username, at: Date.now() }))
}

export const signOut = () => {
  localStorage.removeItem(KEY)
}

export const isAuthenticated = () => {
  try {
    return Boolean(JSON.parse(localStorage.getItem(KEY) || 'null'))
  } catch {
    return false
  }
}

export const currentUser = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}
