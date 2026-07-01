import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

/**
 * Protège une route. Si `role` est fourni, exige ce rôle précis.
 */
export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (role && user.role !== role) {
    return <Navigate to="/" replace />
  }
  return children
}
