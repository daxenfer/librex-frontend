import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.DEV ? '' : import.meta.env.VITE_API_URL,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('librex_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Red de seguridad de la autorización: la UI esconde lo que el usuario no puede usar, pero quien
// manda es la policy del backend. Si las dos capas no coinciden, el error llega por aquí.
api.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status
    const url: string = error?.config?.url ?? ''

    // El 401 del propio login significa "credenciales incorrectas", no sesión vencida: si se
    // tratara igual, la pantalla de login se recargaría sola y el mensaje nunca se vería.
    if (status === 401 && !url.includes('/api/auth/login')) {
      localStorage.removeItem('librex_token')
      localStorage.removeItem('librex_user')
      if (window.location.pathname !== '/login') window.location.replace('/login')
    }

    // El 403 de una policy viene con el cuerpo vacío. Se le pone el mensaje que errorMessage()
    // ya sabe leer, y así ninguna pantalla necesita un caso especial.
    if (status === 403 && !error.response?.data?.error) {
      error.response.data = { error: 'No tienes permiso para realizar esta acción.' }
    }

    // El límite de peticiones del login responde 429 con el cuerpo vacío.
    if (status === 429 && !error.response?.data?.error) {
      error.response.data = { error: 'Demasiados intentos seguidos. Esperá un minuto y volvé a intentar.' }
    }

    return Promise.reject(error)
  },
)

export default api
