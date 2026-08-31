import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { returnNoteService, type CreateReturnNoteDetailDto, type ReturnNoteDto } from '../servicios/devolucionesServicio'
import { customerService, type CustomerDto } from '../servicios/clientesServicio'
import { productService, type ProductDto } from '../servicios/productosServicio'
import { remissionService, type RemissionDto } from '../servicios/remisionesServicio'
import { DateField } from '../componentes/DateField'
import { ProductPickerModal } from '../componentes/ProductPickerModal'
import { downloadReturnNotePdf, printReturnNotePdf, printReturnNotePdfVertical } from '../utils/devolucionPdf'
import { todayIso, toUtcNoon } from '../utils/dates'
import { errorMessage } from '../utils/errores'

interface DetailRow {
  productId: string
  supplierName: string
  quantity: string
  unitPrice: string
}

const emptyRow = (): DetailRow => ({ productId: '', supplierName: '', quantity: '', unitPrice: '' })

const rowsFromRemission = (remission: RemissionDto): DetailRow[] =>
  remission.details.map(d => ({
    productId: String(d.productId),
    supplierName: d.supplierName ?? '',
    quantity: String(d.quantity),
    unitPrice: String(d.unitPrice),
  }))

export function ReturnNoteForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [customerId, setCustomerId] = useState('')
  const [remissionId, setRemissionId] = useState<string>('')
  // Capturar sin remisión sigue siendo posible, pero es una decisión explícita que exige motivo.
  const [unlinked, setUnlinked] = useState(false)
  const [unlinkedReason, setUnlinkedReason] = useState('')
  const [date, setDate] = useState(todayIso())
  const [notes, setNotes] = useState('')
  const [receivedBy, setReceivedBy] = useState('')
  const [discount, setDiscount] = useState('0')
  const [details, setDetails] = useState<DetailRow[]>([emptyRow()])
  const [pickerRow, setPickerRow] = useState<number | null>(null)

  const [customers, setCustomers] = useState<CustomerDto[]>([])
  const [products, setProducts] = useState<ProductDto[]>([])
  const [remissions, setRemissions] = useState<RemissionDto[]>([])
  const [returns, setReturns] = useState<ReturnNoteDto[]>([])
  // La remisión completa (con sus renglones), traída por id: la lista no puebla productName.
  const [linkedRemission, setLinkedRemission] = useState<RemissionDto | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [savedNote, setSavedNote] = useState<ReturnNoteDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      customerService.getAll(), productService.getAll(),
      remissionService.getAll(), returnNoteService.getAll(),
    ])
      .then(([c, p, r, n]) => { setCustomers(c); setProducts(p); setRemissions(r); setReturns(n) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    returnNoteService.getById(Number(id)).then(async r => {
      setCustomerId(String(r.customerId))
      setRemissionId(r.remissionId ? String(r.remissionId) : '')
      setUnlinked(!r.remissionId)
      setUnlinkedReason(r.unlinkedReason ?? '')
      setDate(r.date.slice(0, 10))
      setNotes(r.notes ?? '')
      setReceivedBy(r.receivedBy ?? '')
      setDiscount(String(r.discount))
      setSavedNote(r)
      // Los renglones son los de la nota, no los de la remisión: al editar no se recargan.
      setDetails(r.details.map(d => ({
        productId: String(d.productId),
        supplierName: d.supplierName ?? '',
        quantity: String(d.quantity),
        unitPrice: String(d.unitPrice),
      })))
      if (r.remissionId) {
        setLinkedRemission(await remissionService.getById(r.remissionId).catch(() => null))
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const customerRemissions = remissions.filter(r => r.customerId === Number(customerId))

  // Nombres por id: incluye los de la remisión ligada, para que un producto ya eliminado del
  // catálogo siga mostrando su nombre en el renglón.
  const productNameById = useMemo(() => {
    const map: Record<number, string> = {}
    for (const p of products) map[p.id] = p.name
    for (const d of linkedRemission?.details ?? []) map[d.productId] = d.productName
    return map
  }, [products, linkedRemission])

  // Con una remisión ligada, solo se pueden devolver los productos que iban en ella.
  const pickerProducts = useMemo(() => {
    if (!linkedRemission) return products
    const ids = new Set(linkedRemission.details.map(d => d.productId))
    return products.filter(p => ids.has(p.id))
  }, [products, linkedRemission])

  const remittedByProduct = useMemo(() => {
    const map: Record<number, number> = {}
    for (const d of linkedRemission?.details ?? []) {
      map[d.productId] = (map[d.productId] ?? 0) + d.quantity
    }
    return map
  }, [linkedRemission])

  // Lo ya devuelto en OTRAS notas de la misma remisión; la nota en edición no se cuenta a sí misma.
  const returnedByProduct = useMemo(() => {
    const map: Record<number, number> = {}
    if (!linkedRemission) return map
    for (const note of returns) {
      if (!note.isActive || note.remissionId !== linkedRemission.id) continue
      if (isEdit && note.id === Number(id)) continue
      for (const d of note.details) map[d.productId] = (map[d.productId] ?? 0) + d.quantity
    }
    return map
  }, [returns, linkedRemission, isEdit, id])

  const availableFor = (productId: number) =>
    (remittedByProduct[productId] ?? 0) - (returnedByProduct[productId] ?? 0)

  const handleCustomerChange = (val: string) => {
    setCustomerId(val)
    setRemissionId('')
    setLinkedRemission(null)
  }

  // Elegir la remisión carga sus renglones: ligar tiene que costar menos que no ligar.
  const handleRemissionChange = async (val: string) => {
    setRemissionId(val)
    if (!val) { setLinkedRemission(null); return }
    const full = await remissionService.getById(Number(val)).catch(() => null)
    setLinkedRemission(full)
    if (full) setDetails(rowsFromRemission(full))
  }

  const handleUnlinkedChange = (checked: boolean) => {
    setUnlinked(checked)
    if (checked) {
      setRemissionId('')
      setLinkedRemission(null)
    } else {
      setUnlinkedReason('')
    }
  }

  const updateRow = (i: number, field: keyof DetailRow, value: string) => {
    setDetails(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      if (field === 'productId' && value) {
        const p = products.find(x => x.id === Number(value))
        if (p) next[i].supplierName = p.supplierName ?? ''
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
    if (!unlinked && !remissionId) {
      setError('Selecciona la remisión que se está devolviendo, o marca que no corresponde a ninguna.'); return
    }
    if (unlinked && !unlinkedReason.trim()) {
      setError('Indica el motivo por el que la devolución no corresponde a una remisión.'); return
    }
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
        remissionId: unlinked ? undefined : Number(remissionId),
        unlinkedReason: unlinked ? unlinkedReason.trim() : undefined,
        date: toUtcNoon(date),
        notes: notes || undefined,
        receivedBy: receivedBy || undefined,
        discount: discountNum,
        details: dtos,
      }
      let result: ReturnNoteDto
      if (isEdit) {
        result = await returnNoteService.update(Number(id), base)
      } else {
        result = await returnNoteService.create(base)
      }
      setSavedNote(result)
      navigate('/returns')
    } catch (err) {
      setError(errorMessage(err, 'Error al guardar la devolución.'))
    } finally {
      setSaving(false)
    }
  }

  const downloadPdf = async () => {
    if (!savedNote) return
    await downloadReturnNotePdf(savedNote)
  }

  const printPdf = async () => {
    if (!savedNote) return
    await printReturnNotePdf(savedNote)
  }

  const printPdfVertical = async () => {
    if (!savedNote) return
    await printReturnNotePdfVertical(savedNote)
  }

  if (loading) return <div style={{ padding: '2rem' }}>Cargando...</div>

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h4 style={{ color: '#1a1a2e', fontWeight: 700, margin: 0 }}>
          {isEdit ? `Devolución ${savedNote?.folioFormatted ?? ''}` : 'Nueva devolución'}
        </h4>
        {isEdit && savedNote && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={btnPdf} onClick={downloadPdf}>📄 Descargar PDF</button>
            <button style={btnPrintPdf} onClick={printPdf}>🖨️ Imprimir</button>
            <button style={btnPrintPdf} onClick={printPdfVertical}>🖨️ Imprimir vertical</button>
          </div>
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

          {!unlinked && (
            <div style={{ ...row, marginTop: 10 }}>
              <div style={{ ...field, flex: 2 }}>
                <label style={label}>Remisión *</label>
                <select
                  style={{ ...input, flex: 1 }} value={remissionId}
                  onChange={e => handleRemissionChange(e.target.value)}
                  disabled={!customerId}
                >
                  <option value="">Seleccionar remisión...</option>
                  {customerRemissions.map(r => (
                    <option key={r.id} value={r.id}>N° {r.folioFormatted} — {new Date(r.date).toLocaleDateString('es-MX')}</option>
                  ))}
                </select>
                {linkedRemission && (
                  <span style={hint}>
                    Se cargaron {linkedRemission.details.length} renglones de la remisión.
                  </span>
                )}
              </div>
            </div>
          )}

          <label style={checkboxRow}>
            <input type="checkbox" checked={unlinked} onChange={e => handleUnlinkedChange(e.target.checked)} />
            Esta devolución no corresponde a una remisión
          </label>

          {unlinked && (
            <div style={{ ...row, marginTop: 10 }}>
              <div style={{ ...field, flex: 2 }}>
                <label style={label}>Motivo *</label>
                <input
                  style={input} type="text" value={unlinkedReason} maxLength={500}
                  onChange={e => setUnlinkedReason(e.target.value)}
                  placeholder="Por qué no hay remisión (material de muestra, reposición, etc.)"
                />
                <span style={hint}>
                  Sale en el reporte de devoluciones sin remisión y no se le atribuye a ningún proveedor.
                </span>
              </div>
            </div>
          )}
        </div>

        <div style={{ ...card, marginTop: 12 }}>
          <h6 style={sectionTitle}>Productos a devolver</h6>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={th}>Proveedor</th>
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
                  const pid = Number(d.productId)
                  const available = linkedRemission && d.productId ? availableFor(pid) : null
                  const exceeds = available !== null && (parseFloat(d.quantity) || 0) > available
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={td}>
                        <input style={{ ...inputSmall, backgroundColor: '#f9f9f9' }} value={d.supplierName} readOnly placeholder="(auto)" />
                      </td>
                      <td style={td}>
                        <button
                          type="button"
                          style={{ ...pickerBtn, color: d.productId ? '#1a1a2e' : '#999' }}
                          onClick={() => setPickerRow(i)}
                        >
                          {productNameById[pid] ?? 'Seleccionar...'}
                        </button>
                      </td>
                      <td style={td}>
                        <input
                          style={{ ...inputSmall, ...(exceeds ? inputWarning : null) }}
                          type="number" value={d.quantity}
                          onChange={e => updateRow(i, 'quantity', e.target.value)}
                          min="0.01" step="0.01" required
                        />
                        {exceeds && (
                          <span style={warningText}>
                            Remitidas {remittedByProduct[pid] ?? 0} · ya devueltas{' '}
                            {returnedByProduct[pid] ?? 0} · disponible {available}
                          </span>
                        )}
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

      <ProductPickerModal
        show={pickerRow !== null}
        products={pickerProducts}
        onClose={() => setPickerRow(null)}
        onSelect={p => { if (pickerRow !== null) updateRow(pickerRow, 'productId', String(p.id)); setPickerRow(null) }}
      />
    </div>
  )
}

const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const sectionTitle: React.CSSProperties = { color: '#1a1a2e', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }
const row: React.CSSProperties = { display: 'flex', gap: '1rem', flexWrap: 'wrap' }
const field: React.CSSProperties = { flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 4 }
const label: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: '#555' }
const hint: React.CSSProperties = { fontSize: '0.75rem', color: '#888' }
const checkboxRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: '0.85rem', color: '#555', cursor: 'pointer' }
const input: React.CSSProperties = { padding: '0.45rem 0.6rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }
const inputSmall: React.CSSProperties = { padding: '0.3rem 0.4rem', border: '1px solid #ccc', borderRadius: '3px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }
const inputWarning: React.CSSProperties = { borderColor: '#c0392b', backgroundColor: '#fdf1f0' }
const warningText: React.CSSProperties = { display: 'block', marginTop: 2, fontSize: '0.7rem', color: '#c0392b' }
const th: React.CSSProperties = { padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, borderBottom: '2px solid #ddd' }
const td: React.CSSProperties = { padding: '0.4rem 0.5rem', verticalAlign: 'middle' }
const totalRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '1rem' }
const totalLabel: React.CSSProperties = { fontSize: '0.9rem', color: '#555', width: 90, textAlign: 'right' }
const totalValue: React.CSSProperties = { fontSize: '0.9rem', width: 100, textAlign: 'right' }
const btnPrimary: React.CSSProperties = { padding: '0.6rem 1.5rem', backgroundColor: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem' }
const btnSecondary: React.CSSProperties = { padding: '0.6rem 1.5rem', backgroundColor: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem' }
const btnAdd: React.CSSProperties = { marginTop: 8, padding: '0.35rem 0.75rem', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }
const pickerBtn: React.CSSProperties = { padding: '0.3rem 0.4rem', border: '1px solid #ccc', borderRadius: '3px', fontSize: '0.85rem', width: '100%', minWidth: 140, boxSizing: 'border-box', textAlign: 'left', backgroundColor: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
const btnRemove: React.CSSProperties = { padding: '0.2rem 0.4rem', backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.75rem' }
const btnPdf: React.CSSProperties = { padding: '0.5rem 1rem', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }
const btnPrintPdf: React.CSSProperties = { padding: '0.5rem 1rem', backgroundColor: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }
