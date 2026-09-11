import { useState, useEffect, type FormEvent } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'
import { roleLabel } from '../contextos/permisos'
import { errorMessage } from '../utils/errores'
import type { UserDto, CreateUserDto, UpdateUserDto } from '../servicios/usuariosServicio'

interface Props {
  show: boolean
  user?: UserDto | null
  roles: string[]
  onSave: (data: CreateUserDto | UpdateUserDto) => Promise<void>
  onClose: () => void
}

// Debe coincidir con StrongPasswordAttribute del backend, que es quien de verdad valida.
const MIN_PASSWORD = 10

// A diferencia de los demás formularios, este muestra el error adentro: las reglas de guarda del
// backend (nombre repetido, último super administrador, cambio del rol propio) son parte del uso
// normal de la pantalla, no fallas raras.
export function UserForm({ show, user, roles, onSave, onClose }: Props) {
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    setPassword('')
    if (user) {
      setUsername(user.username)
      setFullName(user.fullName)
      setRole(user.role)
    } else {
      setUsername('')
      setFullName('')
      setRole(roles[roles.length - 1] ?? '')
    }
  }, [user, show, roles])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave(user
        ? { username, fullName, role }
        : { username, fullName, role, password })
    } catch (err) {
      setError(errorMessage(err, 'No se pudo guardar el usuario.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{user ? 'Editar usuario' : 'Nuevo usuario'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Usuario *</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              maxLength={100}
              autoFocus
              autoComplete="off"
              placeholder="Con el que inicia sesión"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Nombre completo *</Form.Label>
            <Form.Control
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              maxLength={200}
              placeholder="Nombre de la persona"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Rol *</Form.Label>
            <Form.Select value={role} onChange={e => setRole(e.target.value)} required>
              {roles.map(r => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </Form.Select>
          </Form.Group>
          {!user && (
            <Form.Group className="mb-3">
              <Form.Label>Contraseña *</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD}
                maxLength={100}
                autoComplete="new-password"
                placeholder={`Mínimo ${MIN_PASSWORD}, con mayúscula, número y símbolo`}
              />
            </Form.Group>
          )}

          {error && <div className="alert alert-danger mb-0">{error}</div>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={saving}
            style={{ backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
