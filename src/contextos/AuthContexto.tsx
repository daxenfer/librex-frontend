import { createContext, useContext, useState, type ReactNode } from 'react'
import { authService, type LoginResponse } from '../servicios/authServicio'

interface AuthContextType {
  user: LoginResponse | null
  isAuthenticated: boolean
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

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
