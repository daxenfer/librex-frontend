import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contextos/AuthContexto'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
      navigate('/products', { replace: true })
    } catch {
      setError('Credenciales incorrectas. Verificá tu usuario y contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.brand}>Librex</h1>
        <h2 style={s.subtitle}>Iniciar sesión</h2>
        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>Usuario</label>
            <input style={s.input} type="text" value={username}
              onChange={e => setUsername(e.target.value)} required autoFocus autoComplete="username" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Contraseña</label>
            <input style={s.input} type="password" value={password}
              onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          {error && <p style={s.error}>{error}</p>}
          <button style={s.button} type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' },
  card: { backgroundColor: '#fff', padding: '2.5rem', borderRadius: '8px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', width: '100%', maxWidth: '380px' },
  brand: { margin: '0 0 0.25rem 0', fontSize: '2rem', color: '#1a1a2e' },
  subtitle: { margin: '0 0 1.5rem 0', fontWeight: 400, color: '#555', fontSize: '1.1rem' },
  field: { marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  label: { fontSize: '0.875rem', fontWeight: 600, color: '#333' },
  input: { padding: '0.6rem 0.75rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' },
  error: { color: '#c0392b', fontSize: '0.875rem', margin: '0.5rem 0' },
  button: { width: '100%', padding: '0.75rem', backgroundColor: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' },
}
