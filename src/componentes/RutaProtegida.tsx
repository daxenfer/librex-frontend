import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contextos/AuthContexto'
import type { Permission } from '../contextos/permisos'

interface Props {
  permission?: Permission
}

// Sin sesión, al login. Con sesión pero sin el permiso de la ruta, a la pantalla de inicio: una
// URL escrita a mano no debe dejar al usuario mirando algo que no puede usar.
export function ProtectedRoute({ permission }: Props) {
  const { isAuthenticated, can } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (permission && !can(permission)) return <Navigate to="/remissions" replace />

  return <Outlet />
}
