import { useState, useEffect, type FormEvent } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'
import { SCHOOL_LEVELS, UNIT_TYPES, type ProductDto, type CreateProductDto, type UpdateProductDto } from '../servicios/productosServicio'
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
  const [schoolLevel, setSchoolLevel] = useState<string>('')
  const [unitType, setUnitType] = useState<string>('Unidad')
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
      setSchoolLevel(product.schoolLevel ?? '')
      setUnitType(product.unitType ?? 'Unidad')
      setSupplierId(product.supplierId ? String(product.supplierId) : '')
    } else {
      setName('')
      setIsbn('')
      setSchoolLevel('')
      setUnitType('Unidad')
      setSupplierId('')
    }
  }, [product, show])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const pid = Number(supplierId)
      const isbnValue = isbn || undefined
      const levelValue = schoolLevel || undefined
      await onSave(product
        ? { name, isbn: isbnValue, schoolLevel: levelValue, unitType, supplierId: pid, isActive: true }
        : { name, isbn: isbnValue, schoolLevel: levelValue, unitType, supplierId: pid })
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
            <Form.Label>Nivel escolar</Form.Label>
            <Form.Select value={schoolLevel} onChange={e => setSchoolLevel(e.target.value)}>
              <option value="">— Sin especificar —</option>
              {SCHOOL_LEVELS.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Se maneja por *</Form.Label>
            <Form.Select value={unitType} onChange={e => setUnitType(e.target.value)} required>
              {UNIT_TYPES.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </Form.Select>
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
