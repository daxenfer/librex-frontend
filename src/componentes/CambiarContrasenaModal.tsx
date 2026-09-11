import { useState, useEffect, type FormEvent } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'
import { errorMessage } from '../utils/errores'
import type { UserDto } from '../servicios/usuariosServicio'

interface Props {
  show: boolean
  user: UserDto | null
  onSave: (newPassword: string) => Promise<void>
  onClose: () => void
}

// Debe coincidir con StrongPasswordAttribute del backend, que es quien de verdad valida.
const MIN_PASSWORD = 10

// Restablecer, no cambiar: el super administrador asigna una contraseña nueva sin conocer la
// anterior. Por eso no pide la actual.
export function ChangePasswordModal({ show, user, onSave, onClose }: Props) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPassword('')
    setConfirmation('')
    setError(null)
  }, [user, show])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(password)
    } catch (err) {
      setError(errorMessage(err, 'No se pudo cambiar la contraseña.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Cambiar contraseña</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <p className="text-muted small">
            Se asignará una contraseña nueva a <strong>{user?.fullName}</strong>.
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Contraseña nueva *</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD}
              maxLength={100}
              autoFocus
              autoComplete="new-password"
              placeholder={`Mínimo ${MIN_PASSWORD}, con mayúscula, número y símbolo`}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Confirmar contraseña *</Form.Label>
            <Form.Control
              type="password"
              value={confirmation}
              onChange={e => setConfirmation(e.target.value)}
              required
              maxLength={100}
              autoComplete="new-password"
            />
          </Form.Group>

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
