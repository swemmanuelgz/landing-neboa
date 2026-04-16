import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './ProtectedRoute.css'

const ProtectedRoute = () => {
  const { session } = useAuth()

  if (session === undefined) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner"></div>
      </div>
    )
  }

  if (session === null) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export const RoleRoute = ({ allowed }) => {
  const { session, role } = useAuth()

  if (session === undefined || role === undefined) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner"></div>
      </div>
    )
  }

  if (session === null) {
    return <Navigate to="/login" replace />
  }

  if (!allowed.includes(role)) {
    return <Navigate to="/dashboard/reservas" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
