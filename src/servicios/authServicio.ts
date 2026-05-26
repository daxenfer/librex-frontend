import axios from 'axios'

export interface LoginResponse {
  token: string
  username: string
  fullName: string
  role: string
  expiresAt: string
}

const TOKEN_KEY = 'librex_token'
const USER_KEY = 'librex_user'

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await axios.post<LoginResponse>('/api/auth/login', { username, password })
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
    return data ? JSON.parse(data) : null
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return false
    const user = authService.getUser()
    if (!user) return false
    return new Date(user.expiresAt) > new Date()
  },
}
