import { useState, useEffect, type FormEvent } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'
import type { PublisherDto, CreatePublisherDto, UpdatePublisherDto } from '../servicios/editorialesServicio'

interface Props {
  show: boolean
  publisher?: PublisherDto | null
  onSave: (data: CreatePublisherDto | UpdatePublisherDto) => Promise<void>
  onClose: () => void
}

export function PublisherForm({ show, publisher, onSave, onClose }: Props) {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (publisher) {
      setName(publisher.name)
      setContact(publisher.contact ?? '')
      setPhone(publisher.phone ?? '')
      setEmail(publisher.email ?? '')
      setIsActive(publisher.isActive)
    } else {
      setName('')
      setContact('')
      setPhone('')
      setEmail('')
      setIsActive(true)
    }
  }, [publisher, show])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const dto = {
        name,
        contact: contact || undefined,
        phone: phone || undefined,
        email: email || undefined,
      }
      await onSave(publisher ? { ...dto, isActive } : dto)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{publisher ? 'Editar editorial' : 'Nueva editorial'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nombre *</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              maxLength={200}
              autoFocus
              placeholder="Nombre de la editorial"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Contacto</Form.Label>
            <Form.Control
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              maxLength={200}
              placeholder="Nombre del contacto"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Teléfono</Form.Label>
            <Form.Control
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              maxLength={20}
              placeholder="Teléfono"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              maxLength={150}
              placeholder="correo@editorial.com"
            />
          </Form.Group>
          {publisher && (
            <Form.Check
              type="checkbox"
              label="Activo"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={saving}
            style={{ backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
