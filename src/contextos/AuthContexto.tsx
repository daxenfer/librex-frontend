import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { authService, type LoginResponse } from '../servicios/authServicio'
import type { Permission } from './permisos'

interface AuthContextType {
  user: LoginResponse | null
  isAuthenticated: boolean
  role: string | null
  can: (permission: Permission) => boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(
    () => authService.isAuthenticated() ? authService.getUser() : null
  )

  const login = async (username: string, password: string) => {
    const data = await authService.login(username, password)
    authService.saveSession(data)
    setUser(data)
  }

  const logout = () => {
    authService.clearSession()
    setUser(null)
  }

  // Set en vez de array: can() se llama en cada render de cada tabla, una vez por fila.
  const permissions = useMemo(() => new Set(user?.permissions ?? []), [user])
  const can = useCallback((permission: Permission) => permissions.has(permission), [permissions])

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: user !== null,
    role: user?.role ?? null,
    can,
    login,
    logout,
  }), [user, can])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
