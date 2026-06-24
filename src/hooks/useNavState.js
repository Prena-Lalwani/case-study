/* Navigation-state helpers so the app "remembers where you were".
 *
 * useUrlState — keeps a piece of view state (active tab, search text, sort,
 *   filter) in the URL query string instead of component-local useState.
 *   Because it lives in the URL, it survives:
 *     • navigating into a detail page and pressing Back
 *     • a full page refresh
 *     • sharing / bookmarking the link
 *   Updates use { replace: true } so changing a filter doesn't spam the
 *   browser history (Back should leave the list, not undo each keystroke).
 *
 * useGoBack — a history-aware Back action. Returns to the actual previous
 *   page when there is in-app history, and falls back to a sensible parent
 *   route when the user deep-linked straight in (no history to pop). */

import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'

export const useUrlState = (key, defaultValue) => {
  const [params, setParams] = useSearchParams()
  const value = params.get(key) ?? defaultValue

  const setValue = (next) => {
    setParams(prev => {
      const p = new URLSearchParams(prev)
      if (next == null || next === '' || next === defaultValue) p.delete(key)
      else p.set(key, String(next))
      return p
    }, { replace: true })
  }

  return [value, setValue]
}

export const useGoBack = (fallback = -1) => {
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    /* location.key is 'default' only for the very first entry in this app's
     * history stack — i.e. the user arrived via a direct link / refresh and
     * there is nothing in-app to go back to. */
    if (location.key !== 'default') navigate(-1)
    else navigate(fallback === -1 ? '/' : fallback)
  }
}
