import api from './apiCliente'

export interface LoginResponse {
  token: string
  username: string
  fullName: string
  role: string
  // Ya resueltos desde el rol por el backend. El frontend no conoce la matriz.
  permissions: string[]
  expiresAt: string
}

const TOKEN_KEY = 'librex_token'
const USER_KEY = 'librex_user'

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/api/auth/login', { username, password })
    return response.data
  },

  saveSession(data: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data))
  },

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },

  getUser(): LoginResponse | null {
    const data = localStorage.getItem(USER_KEY)
    if (!data) return null
    try {
      const parsed = JSON.parse(data) as LoginResponse
      // Una sesión guardada antes de que existieran los permisos se queda sin ninguno, nunca con
      // todos: si el JSON viene corrupto se trata como que no hay sesión.
      return { ...parsed, permissions: parsed.permissions ?? [] }
    } catch {
      return null
    }
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return false
    const user = authService.getUser()
    if (!user) return false
    return new Date(user.expiresAt) > new Date()
  },
}
