import { Navigate, useLocation } from 'react-router-dom'
import { isAuthenticated } from './auth'

/**
 * Route guard. Wrap any element that requires a signed-in user.
 * Unauthenticated visitors are bounced to /signin with their original
 * destination preserved in location.state so we can route them back after login.
 */
const RequireAuth = ({ children }) => {
  const location = useLocation()
  if (!isAuthenticated()) {
    return <Navigate to="/signin" state={{ from: location }} replace />
  }
  return children
}

export default RequireAuth
