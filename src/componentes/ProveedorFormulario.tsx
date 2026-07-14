import { useState, useEffect } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'
import type { SupplierDto, CreateSupplierDto, UpdateSupplierDto } from '../servicios/proveedoresServicio'

interface Props {
  show: boolean
  supplier?: SupplierDto | null
  onSave: (data: CreateSupplierDto | UpdateSupplierDto) => Promise<void>
  onClose: () => void
}

export function SupplierForm({ show, supplier, onSave, onClose }: Props) {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (supplier) {
      setName(supplier.name)
      setContact(supplier.contact)
      setPhone(supplier.phone)
      setEmail(supplier.email)
    } else {
      setName('')
      setContact('')
      setPhone('')
      setEmail('')
    }
  }, [supplier, show])

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const dto = { name, contact, phone, email }
      await onSave(supplier ? { ...dto, isActive: true } : dto)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{supplier ? 'Editar proveedor' : 'Nueva proveedor'}</Modal.Title>
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
              placeholder="Nombre de la proveedor"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Contacto *</Form.Label>
            <Form.Control
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              required
              maxLength={200}
              placeholder="Nombre del contacto"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Teléfono *</Form.Label>
            <Form.Control
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              maxLength={20}
              placeholder="Teléfono"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email *</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              maxLength={150}
              placeholder="correo@proveedor.com"
            />
          </Form.Group>
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
