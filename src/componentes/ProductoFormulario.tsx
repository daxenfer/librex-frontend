import { useState, useEffect, type FormEvent } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'
import type { ProductDto, CreateProductDto, UpdateProductDto } from '../servicios/productosServicio'
import { supplierService, type SupplierDto } from '../servicios/proveedoresServicio'

interface Props {
  show: boolean
  product?: ProductDto | null
  onSave: (data: CreateProductDto | UpdateProductDto) => Promise<void>
  onClose: () => void
}

export function ProductForm({ show, product, onSave, onClose }: Props) {
  const [name, setName] = useState('')
  const [isbn, setIsbn] = useState('')
  const [supplierId, setSupplierId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])

  useEffect(() => {
    supplierService.getAll().then(setSuppliers).catch(() => {})
  }, [])

  useEffect(() => {
    if (product) {
      setName(product.name)
      setIsbn(product.isbn ?? '')
      setSupplierId(product.supplierId ? String(product.supplierId) : '')
    } else {
      setName('')
      setIsbn('')
      setSupplierId('')
    }
  }, [product, show])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const pid = Number(supplierId)
      const isbnValue = isbn || undefined
      await onSave(product ? { name, isbn: isbnValue, supplierId: pid, isActive: true } : { name, isbn: isbnValue, supplierId: pid })
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
            <Form.Label>ISBN</Form.Label>
            <Form.Control
              type="text"
              value={isbn}
              onChange={e => setIsbn(e.target.value)}
              maxLength={50}
              placeholder="ISBN del producto"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Proveedor *</Form.Label>
            <Form.Select value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
              <option value="" disabled>Seleccionar proveedor...</option>
              {suppliers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Form.Select>
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
