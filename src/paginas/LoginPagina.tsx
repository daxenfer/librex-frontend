import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contextos/AuthContexto'
import { AnimatedShaderBackground } from '../componentes/AnimatedShaderBackground'

// Login con fondo animado de shader (aurora WebGL) + tarjeta glass.
// En móvil / reduce-motion / save-data el shader no se monta: queda el degradado CSS.
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
    <div className="lxd-page">
      <style>{css}</style>
      <AnimatedShaderBackground />
      <div className="lxd-card">
        <h1 className="lxd-brand">Librex</h1>
        <p className="lxd-subtitle">Sistema de distribución de libros</p>
        <form onSubmit={handleSubmit}>
          <div className="lxd-field">
            <label className="lxd-label">Usuario</label>
            <input className="lxd-input" type="text" value={username}
              onChange={e => setUsername(e.target.value)} required autoFocus autoComplete="username" />
          </div>
          <div className="lxd-field">
            <label className="lxd-label">Contraseña</label>
            <input className="lxd-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          {error && <p className="lxd-error">{error}</p>}
          <button className="lxd-button" type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

const css = `
/* Degradado estático tipo aurora: es el fondo en móvil/reduce-motion y el fallback si WebGL no carga.
   En escritorio el canvas del shader se dibuja encima. */
.lxd-page { position: relative; min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 1.5rem; box-sizing: border-box;
  background:
    radial-gradient(circle at 22% 28%, rgba(34,211,238,0.22), transparent 45%),
    radial-gradient(circle at 78% 72%, rgba(124,58,237,0.28), transparent 50%),
    linear-gradient(160deg, #050810 0%, #0a1024 55%, #0a0f1f 100%); }
.lxd-card { position: relative; z-index: 1; width: 100%; max-width: 380px; padding: 2.5rem; border-radius: 20px; background: rgba(10,14,25,0.78); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 24px 60px rgba(0,0,0,0.55); }
.lxd-brand { margin: 0 0 0.25rem 0; font-size: 2rem; font-weight: 800; color: #fff; letter-spacing: 0.5px; }
.lxd-subtitle { margin: 0 0 1.75rem 0; color: rgba(255,255,255,0.7); font-size: 0.95rem; }
.lxd-field { margin-bottom: 1.1rem; display: flex; flex-direction: column; gap: 0.35rem; }
.lxd-label { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.85); }
.lxd-input { padding: 0.7rem 0.85rem; border: 1.5px solid rgba(255,255,255,0.18); border-radius: 10px; font-size: 1rem; background: rgba(255,255,255,0.08); color: #fff; outline: none; transition: border-color .15s, box-shadow .15s, background .15s; }
.lxd-input::placeholder { color: rgba(255,255,255,0.4); }
.lxd-input:focus { border-color: #67e8f9; background: rgba(255,255,255,0.12); box-shadow: 0 0 0 3px rgba(103,232,249,0.22); }
.lxd-error { color: #fca5a5; font-size: 0.85rem; margin: 0.25rem 0 0.75rem 0; }
.lxd-button { width: 100%; padding: 0.8rem; background: linear-gradient(135deg, #22d3ee, #6366f1); color: #fff; border: none; border-radius: 10px; font-size: 1rem; font-weight: 700; cursor: pointer; margin-top: 0.75rem; transition: filter .15s, transform .05s, box-shadow .15s; box-shadow: 0 8px 24px rgba(34,211,238,0.35); }
.lxd-button:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 10px 30px rgba(34,211,238,0.5); }
.lxd-button:active:not(:disabled) { transform: translateY(1px); }
.lxd-button:disabled { opacity: 0.6; cursor: default; }
@media (max-width: 480px) {
  .lxd-page { padding: 1rem; }
  .lxd-card { padding: 1.75rem 1.5rem; border-radius: 16px; }
  .lxd-brand { font-size: 1.7rem; }
}
`
