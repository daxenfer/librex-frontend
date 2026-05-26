import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { remissionService, type CreateRemissionDetailDto, type RemissionDto } from '../servicios/remisionesServicio'
import { customerService, type CustomerDto } from '../servicios/clientesServicio'
import { productService, type ProductDto } from '../servicios/productosServicio'
import { RemisionPdf } from '../componentes/RemisionPdf'

interface DetailRow {
  productId: string
  publisherName: string
  city: string
  quantity: string
  unitPrice: string
}

const emptyRow = (): DetailRow => ({ productId: '', publisherName: '', city: '', quantity: '', unitPrice: '' })

export function RemissionForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [customerId, setCustomerId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [salesPerson, setSalesPerson] = useState('')
  const [notes, setNotes] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [discount, setDiscount] = useState('0')
  const [details, setDetails] = useState<DetailRow[]>([emptyRow()])
  const [isActive, setIsActive] = useState(true)

  const [customers, setCustomers] = useState<CustomerDto[]>([])
  const [products, setProducts] = useState<ProductDto[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [savedRemission, setSavedRemission] = useState<RemissionDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([customerService.getAll(), productService.getAll()])
      .then(([c, p]) => { setCustomers(c); setProducts(p) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    remissionService.getById(Number(id)).then(r => {
      setCustomerId(String(r.customerId))
      setDate(r.date.slice(0, 10))
      setSalesPerson(r.salesPerson ?? '')
      setNotes(r.notes ?? '')
      setRecipientName(r.recipientName ?? '')
      setDiscount(String(r.discount))
      setIsActive(r.isActive)
      setSavedRemission(r)
      setDetails(r.details.map(d => ({
        productId: String(d.productId),
        publisherName: d.publisherName ?? '',
        city: d.city ?? '',
        quantity: String(d.quantity),
        unitPrice: String(d.unitPrice),
      })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const productMap = Object.fromEntries(products.map(p => [p.id, p]))

  const updateRow = (i: number, field: keyof DetailRow, value: string) => {
    setDetails(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      if (field === 'productId' && value) {
        const p = productMap[Number(value)]
        if (p) next[i].publisherName = p.publisherName ?? ''
      }
      return next
    })
  }

  const addRow = () => setDetails(prev => [...prev, emptyRow()])
  const removeRow = (i: number) => setDetails(prev => prev.filter((_, idx) => idx !== i))

  const subtotal = details.reduce((sum, d) => {
    const qty = parseFloat(d.quantity) || 0
    const price = parseFloat(d.unitPrice) || 0
    return sum + qty * price
  }, 0)
  const discountNum = parseFloat(discount) || 0
  const total = subtotal - discountNum

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!customerId) { setError('Selecciona un cliente.'); return }
    if (details.some(d => !d.productId || !d.quantity || !d.unitPrice)) {
      setError('Completa todos los campos de los productos.'); return
    }
    setSaving(true); setError(null)
    try {
      const dtos: CreateRemissionDetailDto[] = details.map(d => ({
        productId: Number(d.productId),
        city: d.city || undefined,
        quantity: parseFloat(d.quantity),
        unitPrice: parseFloat(d.unitPrice),
      }))
      const base = {
        customerId: Number(customerId),
        date: new Date(date).toISOString(),
        salesPerson: salesPerson || undefined,
        notes: notes || undefined,
        recipientName: recipientName || undefined,
        discount: discountNum,
        details: dtos,
      }
      let result: RemissionDto
      if (isEdit) {
        result = await remissionService.update(Number(id), { ...base, isActive })
      } else {
        result = await remissionService.create(base)
      }
      setSavedRemission(result)
      navigate('/remissions')
    } catch {
      setError('Error al guardar la remisión.')
    } finally {
      setSaving(false)
    }
  }

  const downloadPdf = async () => {
    if (!savedRemission) return
    const blob = await pdf(<RemisionPdf remission={savedRemission} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `remision-${savedRemission.folioFormatted}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div style={{ padding: '2rem' }}>Cargando...</div>

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h4 style={{ color: '#1a1a2e', fontWeight: 700, margin: 0 }}>
          {isEdit ? `Remisión ${savedRemission?.folioFormatted ?? ''}` : 'Nueva remisión'}
        </h4>
        {isEdit && savedRemission && (
          <button style={btnPdf} onClick={downloadPdf}>📄 Descargar PDF</button>
        )}
      </div>

      {error && <p style={{ color: '#c0392b', marginBottom: '1rem' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={card}>
          <h6 style={sectionTitle}>Datos generales</h6>
          <div style={row}>
            <div style={field}>
              <label style={label}>Cliente *</label>
              <select style={input} value={customerId} onChange={e => setCustomerId(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ ...field, maxWidth: 160 }}>
              <label style={label}>Fecha *</label>
              <input style={input} type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div style={field}>
              <label style={label}>Vendedor</label>
              <input style={input} type="text" value={salesPerson} onChange={e => setSalesPerson(e.target.value)} placeholder="Nombre del vendedor" maxLength={200} />
            </div>
          </div>
          {isEdit && (
            <div style={{ marginTop: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                Activo
              </label>
            </div>
          )}
        </div>

        <div style={{ ...card, marginTop: 12 }}>
          <h6 style={sectionTitle}>Productos</h6>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={th}>Editorial</th>
                  <th style={th}>Título *</th>
                  <th style={th}>Ciudad</th>
                  <th style={{ ...th, width: 80 }}>Cantidad *</th>
                  <th style={{ ...th, width: 100 }}>P. Unitario *</th>
                  <th style={{ ...th, width: 100 }}>Importe</th>
                  <th style={{ ...th, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {details.map((d, i) => {
                  const amt = (parseFloat(d.quantity) || 0) * (parseFloat(d.unitPrice) || 0)
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={td}>
                        <input style={{ ...inputSmall, backgroundColor: '#f9f9f9' }} value={d.publisherName} readOnly placeholder="(auto)" />
                      </td>
                      <td style={td}>
                        <select style={inputSmall} value={d.productId} onChange={e => updateRow(i, 'productId', e.target.value)} required>
                          <option value="">Seleccionar...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td style={td}>
                        <input style={inputSmall} type="text" value={d.city} onChange={e => updateRow(i, 'city', e.target.value)} maxLength={100} />
                      </td>
                      <td style={td}>
                        <input style={inputSmall} type="number" value={d.quantity} onChange={e => updateRow(i, 'quantity', e.target.value)} min="0.01" step="0.01" required />
                      </td>
                      <td style={td}>
                        <input style={inputSmall} type="number" value={d.unitPrice} onChange={e => updateRow(i, 'unitPrice', e.target.value)} min="0" step="0.01" required />
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>
                        ${amt.toFixed(2)}
                      </td>
                      <td style={td}>
                        {details.length > 1 && (
                          <button type="button" onClick={() => removeRow(i)} style={btnRemove}>✕</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button type="button" style={btnAdd} onClick={addRow}>+ Agregar producto</button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 12, gap: 6 }}>
            <div style={totalRow}><span style={totalLabel}>Subtotal:</span><span style={totalValue}>${subtotal.toFixed(2)}</span></div>
            <div style={totalRow}>
              <span style={totalLabel}>Descuento:</span>
              <input style={{ ...inputSmall, width: 100, textAlign: 'right' }} type="number" value={discount} onChange={e => setDiscount(e.target.value)} min="0" step="0.01" />
            </div>
            <div style={{ ...totalRow, fontWeight: 700, fontSize: '1rem', color: '#1a1a2e' }}>
              <span style={totalLabel}>Total:</span><span style={totalValue}>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ ...card, marginTop: 12 }}>
          <h6 style={sectionTitle}>Notas y recepción</h6>
          <div style={row}>
            <div style={{ flex: 2 }}>
              <label style={label}>Observaciones</label>
              <textarea style={{ ...input, height: 70, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones generales..." />
            </div>
            <div style={field}>
              <label style={label}>Nombre de quien recibe</label>
              <input style={input} type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Nombre y firma de recibido" maxLength={200} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: 16 }}>
          <button type="submit" disabled={saving} style={btnPrimary}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" style={btnSecondary} onClick={() => navigate('/remissions')}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}

const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const sectionTitle: React.CSSProperties = { color: '#1a1a2e', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }
const row: React.CSSProperties = { display: 'flex', gap: '1rem', flexWrap: 'wrap' }
const field: React.CSSProperties = { flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 4 }
const label: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: '#555' }
const input: React.CSSProperties = { padding: '0.45rem 0.6rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }
const inputSmall: React.CSSProperties = { padding: '0.3rem 0.4rem', border: '1px solid #ccc', borderRadius: '3px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }
const th: React.CSSProperties = { padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, borderBottom: '2px solid #ddd' }
const td: React.CSSProperties = { padding: '0.4rem 0.5rem', verticalAlign: 'middle' }
const totalRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '1rem' }
const totalLabel: React.CSSProperties = { fontSize: '0.9rem', color: '#555', width: 90, textAlign: 'right' }
const totalValue: React.CSSProperties = { fontSize: '0.9rem', width: 100, textAlign: 'right' }
const btnPrimary: React.CSSProperties = { padding: '0.6rem 1.5rem', backgroundColor: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem' }
const btnSecondary: React.CSSProperties = { padding: '0.6rem 1.5rem', backgroundColor: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem' }
const btnAdd: React.CSSProperties = { marginTop: 8, padding: '0.35rem 0.75rem', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }
const btnRemove: React.CSSProperties = { padding: '0.2rem 0.4rem', backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.75rem' }
const btnPdf: React.CSSProperties = { padding: '0.5rem 1rem', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }
