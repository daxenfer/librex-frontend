import { useState, useEffect } from 'react'
import { Modal, Button, Form, Row, Col } from 'react-bootstrap'
import type { CustomerDto, CreateCustomerDto, UpdateCustomerDto } from '../servicios/clientesServicio'

interface Props {
  show: boolean
  customer?: CustomerDto | null
  onSave: (data: CreateCustomerDto | UpdateCustomerDto) => Promise<void>
  onClose: () => void
}

export function CustomerForm({ show, customer, onSave, onClose }: Props) {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (customer) {
      setName(customer.name)
      setContact(customer.contact ?? '')
      setAddress(customer.address)
      setPostalCode(customer.postalCode)
      setPhone(customer.phone)
      setCity(customer.city)
    } else {
      setName('')
      setContact('')
      setAddress('')
      setPostalCode('')
      setPhone('')
      setCity('')
    }
  }, [customer, show])

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const dto = { name, contact: contact || undefined, address, postalCode, phone, city }
      await onSave(dto)
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
          <Form.Group className="mb-3">
            <Form.Label>Contacto</Form.Label>
            <Form.Control
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              maxLength={200}
              placeholder="Persona de contacto"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Domicilio *</Form.Label>
            <Form.Control
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
              placeholder="Domicilio"
            />
          </Form.Group>
          <Row>
            <Col xs={4}>
              <Form.Group className="mb-3">
                <Form.Label>C.P. *</Form.Label>
                <Form.Control
                  type="text"
                  value={postalCode}
                  onChange={e => setPostalCode(e.target.value)}
                  required
                  maxLength={20}
                  placeholder="C.P."
                />
              </Form.Group>
            </Col>
            <Col xs={8}>
              <Form.Group className="mb-3">
                <Form.Label>Ciudad *</Form.Label>
                <Form.Control
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="Ciudad"
                />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label>Teléfono *</Form.Label>
            <Form.Control
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              maxLength={50}
              placeholder="Teléfono"
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
