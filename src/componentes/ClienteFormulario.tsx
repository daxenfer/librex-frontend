import { useState, useEffect, type FormEvent } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'
import type { CustomerDto, CreateCustomerDto, UpdateCustomerDto } from '../servicios/clientesServicio'

interface Props {
  show: boolean
  customer?: CustomerDto | null
  onSave: (data: CreateCustomerDto | UpdateCustomerDto) => Promise<void>
  onClose: () => void
}

export function CustomerForm({ show, customer, onSave, onClose }: Props) {
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (customer) {
      setName(customer.name)
      setIsActive(customer.isActive)
    } else {
      setName('')
      setIsActive(true)
    }
  }, [customer, show])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(customer ? { name, isActive } : { name })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{customer ? 'Editar cliente' : 'Nuevo cliente'}</Modal.Title>
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
              placeholder="Nombre del cliente"
            />
          </Form.Group>

          {customer && (
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
