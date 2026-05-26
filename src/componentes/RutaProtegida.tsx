import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contextos/AuthContexto'

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
