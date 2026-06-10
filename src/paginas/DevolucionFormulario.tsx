import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { returnNoteService, type CreateReturnNoteDetailDto, type ReturnNoteDto } from '../servicios/devolucionesServicio'
import { customerService, type CustomerDto } from '../servicios/clientesServicio'
import { productService, type ProductDto } from '../servicios/productosServicio'
import { remissionService, type RemissionDto } from '../servicios/remisionesServicio'
import { DateField } from '../componentes/DateField'

interface DetailRow {
  productId: string
  publisherName: string
  quantity: string
  unitPrice: string
}

const emptyRow = (): DetailRow => ({ productId: '', publisherName: '', quantity: '', unitPrice: '' })

export function ReturnNoteForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [customerId, setCustomerId] = useState('')
  const [remissionId, setRemissionId] = useState<string>('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [receivedBy, setReceivedBy] = useState('')
  const [discount, setDiscount] = useState('0')
  const [details, setDetails] = useState<DetailRow[]>([emptyRow()])
  const [isActive, setIsActive] = useState(true)

  const [customers, setCustomers] = useState<CustomerDto[]>([])
  const [products, setProducts] = useState<ProductDto[]>([])
  const [remissions, setRemissions] = useState<RemissionDto[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [savedNote, setSavedNote] = useState<ReturnNoteDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([customerService.getAll(), productService.getAll(), remissionService.getAll()])
      .then(([c, p, r]) => { setCustomers(c); setProducts(p); setRemissions(r) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    returnNoteService.getById(Number(id)).then(r => {
      setCustomerId(String(r.customerId))
      setRemissionId(r.remissionId ? String(r.remissionId) : '')
      setDate(r.date.slice(0, 10))
      setNotes(r.notes ?? '')
      setReceivedBy(r.receivedBy ?? '')
      setDiscount(String(r.discount))
      setIsActive(r.isActive)
      setSavedNote(r)
      setDetails(r.details.map(d => ({
        productId: String(d.productId),
        publisherName: d.publisherName ?? '',
        quantity: String(d.quantity),
        unitPrice: String(d.unitPrice),
      })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const productMap = Object.fromEntries(products.map(p => [p.id, p]))

  const customerRemissions = remissions.filter(r => r.customerId === Number(customerId))

  const handleCustomerChange = (val: string) => {
    setCustomerId(val)
    setRemissionId('')
  }

  const loadFromRemission = () => {
    const r = remissions.find(r => r.id === Number(remissionId))
    if (!r) return
    setDetails(r.details.map(d => ({
      productId: String(d.productId),
      publisherName: d.publisherName ?? '',
      quantity: String(d.quantity),
      unitPrice: String(d.unitPrice),
    })))
  }

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
    return sum + (parseFloat(d.quantity) || 0) * (parseFloat(d.unitPrice) || 0)
  }, 0)
  const discountNum = parseFloat(discount) || 0
  const total = subtotal - discountNum

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!customerId) { setError('Selecciona un cliente.'); return }
    if (!remissionId) { setError('Selecciona una remisión.'); return }
    if (details.some(d => !d.productId || !d.quantity || !d.unitPrice)) {
      setError('Completa todos los campos de los productos.'); return
    }
    setSaving(true); setError(null)
    try {
      const dtos: CreateReturnNoteDetailDto[] = details.map(d => ({
        productId: Number(d.productId),
        quantity: parseFloat(d.quantity),
        unitPrice: parseFloat(d.unitPrice),
      }))
      const base = {
        customerId: Number(customerId),
        remissionId: Number(remissionId),
        date: new Date(date).toISOString(),
        notes: notes || undefined,
        receivedBy: receivedBy || undefined,
        discount: discountNum,
        details: dtos,
      }
      let result: ReturnNoteDto
      if (isEdit) {
        result = await returnNoteService.update(Number(id), { ...base, isActive })
      } else {
        result = await returnNoteService.create(base)
      }
      setSavedNote(result)
      navigate('/returns')
    } catch {
      setError('Error al guardar la devolución.')
    } finally {
      setSaving(false)
    }
  }

  const downloadPdf = async () => {
    if (!savedNote) return
    const [{ pdf }, { DevolucionPdf }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('../componentes/DevolucionPdf'),
    ])
    const blob = await pdf(<DevolucionPdf returnNote={savedNote} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `devolucion-${savedNote.folioFormatted}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div style={{ padding: '2rem' }}>Cargando...</div>

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h4 style={{ color: '#1a1a2e', fontWeight: 700, margin: 0 }}>
          {isEdit ? `Devolución ${savedNote?.folioFormatted ?? ''}` : 'Nueva devolución'}
        </h4>
        {isEdit && savedNote && (
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
              <select style={input} value={customerId} onChange={e => handleCustomerChange(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ ...field, maxWidth: 160 }}>
              <label style={label}>Fecha *</label>
              <DateField value={date} onChange={setDate} required />
            </div>
          </div>

          <div style={{ ...row, marginTop: 10 }}>
            <div style={{ ...field, flex: 2 }}>
              <label style={label}>Remisión *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ ...input, flex: 1 }} value={remissionId} onChange={e => setRemissionId(e.target.value)} disabled={!customerId} required>
                  <option value="" disabled>Seleccionar remisión...</option>
                  {customerRemissions.map(r => (
                    <option key={r.id} value={r.id}>N° {r.folioFormatted} — {new Date(r.date).toLocaleDateString('es-MX')}</option>
                  ))}
                </select>
                {remissionId && (
                  <button type="button" style={btnLoad} onClick={loadFromRemission}>
                    Cargar ítems
                  </button>
                )}
              </div>
            </div>
            {isEdit && (
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                  Activo
                </label>
              </div>
            )}
          </div>
        </div>

        <div style={{ ...card, marginTop: 12 }}>
          <h6 style={sectionTitle}>Productos a devolver</h6>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={th}>Editorial</th>
                  <th style={th}>Título *</th>
                  <th style={{ ...th, width: 90 }}>Cantidad *</th>
                  <th style={{ ...th, width: 110 }}>P. Unitario *</th>
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
              <label style={label}>Quien recibe</label>
              <input style={input} type="text" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} placeholder="Nombre de quien recibe" maxLength={200} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: 16 }}>
          <button type="submit" disabled={saving} style={btnPrimary}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" style={btnSecondary} onClick={() => navigate('/returns')}>Cancelar</button>
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
const btnLoad: React.CSSProperties = { padding: '0.45rem 0.8rem', backgroundColor: '#2980b9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }
