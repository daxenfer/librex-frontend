import { useState, useEffect, useMemo } from 'react'
import { Modal, Form } from 'react-bootstrap'
import { SCHOOL_LEVELS, UNIT_TYPES, type ProductDto } from '../servicios/productosServicio'

interface Props {
  show: boolean
  products: ProductDto[]
  onSelect: (product: ProductDto) => void
  onClose: () => void
}

export function ProductPickerModal({ show, products, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [unit, setUnit] = useState('')
  const [supplierId, setSupplierId] = useState('')

  useEffect(() => {
    if (show) {
      setSearch('')
      setLevel('')
      setUnit('')
      setSupplierId('')
    }
  }, [show])

  const suppliers = useMemo(() => {
    const map = new Map<number, string>()
    products.forEach(p => { if (!map.has(p.supplierId)) map.set(p.supplierId, p.supplierName) })
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter(p => {
      if (!p.isActive) return false
      if (q && !(p.name.toLowerCase().includes(q) || (p.isbn ?? '').toLowerCase().includes(q))) return false
      if (level && p.schoolLevel !== level) return false
      if (unit && p.unitType !== unit) return false
      if (supplierId && p.supplierId !== Number(supplierId)) return false
      return true
    })
  }, [products, search, level, unit, supplierId])

  const choose = (p: ProductDto) => onSelect(p)

  return (
    <Modal show={show} onHide={onClose} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '1.1rem', color: '#1a1a2e', fontWeight: 700 }}>Buscar producto</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={filterRow}>
          <input
            style={{ ...filterCtrl, flex: 2, minWidth: 180 }}
            placeholder="Buscar por nombre o ISBN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <Form.Select style={filterCtrl} value={level} onChange={e => setLevel(e.target.value)}>
            <option value="">Nivel: Todos</option>
            {SCHOOL_LEVELS.map(n => <option key={n} value={n}>{n}</option>)}
          </Form.Select>
          <Form.Select style={filterCtrl} value={unit} onChange={e => setUnit(e.target.value)}>
            <option value="">Unidad: Todas</option>
            {UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
          </Form.Select>
          <Form.Select style={filterCtrl} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
            <option value="">Proveedor: Todos</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Form.Select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={th}>Nombre</th>
                <th style={th}>ISBN</th>
                <th style={th}>Nivel</th>
                <th style={th}>Unidad</th>
                <th style={th}>Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...td, textAlign: 'center', color: '#888', padding: '1.5rem' }}>
                    Sin resultados.
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr
                  key={p.id}
                  style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}
                  onClick={() => choose(p)}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f5f7ff')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                >
                  <td style={{ ...td, fontWeight: 600 }}>{p.name}</td>
                  <td style={td}>{p.isbn ?? '—'}</td>
                  <td style={td}>{p.schoolLevel ?? '—'}</td>
                  <td style={td}>{p.unitType ?? '—'}</td>
                  <td style={td}>{p.supplierName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal.Body>
    </Modal>
  )
}

const filterRow: React.CSSProperties = { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }
const filterCtrl: React.CSSProperties = { flex: 1, minWidth: 130, padding: '0.4rem 0.6rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.85rem', boxSizing: 'border-box' }
const th: React.CSSProperties = { padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, borderBottom: '2px solid #ddd', position: 'sticky', top: 0, backgroundColor: '#f0f0f0' }
const td: React.CSSProperties = { padding: '0.45rem 0.75rem', verticalAlign: 'middle' }
