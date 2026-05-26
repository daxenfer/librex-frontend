import { useState, useEffect, type FormEvent } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'
import type { ProductDto, CreateProductDto, UpdateProductDto } from '../servicios/productosServicio'
import { publisherService, type PublisherDto } from '../servicios/editorialesServicio'

interface Props {
  show: boolean
  product?: ProductDto | null
  onSave: (data: CreateProductDto | UpdateProductDto) => Promise<void>
  onClose: () => void
}

export function ProductForm({ show, product, onSave, onClose }: Props) {
  const [name, setName] = useState('')
  const [publisherId, setPublisherId] = useState<string>('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishers, setPublishers] = useState<PublisherDto[]>([])

  useEffect(() => {
    publisherService.getAll().then(setPublishers).catch(() => {})
  }, [])

  useEffect(() => {
    if (product) {
      setName(product.name)
      setPublisherId(product.publisherId ? String(product.publisherId) : '')
      setIsActive(product.isActive)
    } else {
      setName('')
      setPublisherId('')
      setIsActive(true)
    }
  }, [product, show])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const pid = Number(publisherId)
      await onSave(product ? { name, publisherId: pid, isActive } : { name, publisherId: pid })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{product ? 'Editar producto' : 'Nuevo producto'}</Modal.Title>
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
              placeholder="Nombre del producto"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Editorial *</Form.Label>
            <Form.Select value={publisherId} onChange={e => setPublisherId(e.target.value)} required>
              <option value="" disabled>Seleccionar editorial...</option>
              {publishers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
          {product && (
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
