import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { remissionService, type CreateRemissionDetailDto, type RemissionDto } from '../servicios/remisionesServicio'
import { customerService, type CustomerDto } from '../servicios/clientesServicio'
import { productService, type ProductDto } from '../servicios/productosServicio'
import { DateField } from '../componentes/DateField'
import { ProductPickerModal } from '../componentes/ProductPickerModal'
import { downloadRemissionPdf, printRemissionPdf, printRemissionPdfVertical } from '../utils/remisionPdf'
import { todayIso, toUtcNoon } from '../utils/dates'

interface DetailRow {
  productId: string
  teacher: string
  supplierName: string
  quantity: string
  unitPrice: string
}

const emptyRow = (): DetailRow => ({ productId: '', teacher: '', supplierName: '', quantity: '', unitPrice: '' })

export function RemissionForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  // Header fields
  const [customerId, setCustomerId] = useState('')
  const [salesPerson, setSalesPerson] = useState('')
  const [purchaseOrder, setPurchaseOrder] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(todayIso())
  const [paymentDueDate, setPaymentDueDate] = useState(todayIso())
  const [returnPercentage, setReturnPercentage] = useState('0')
  const [returnDueDate, setReturnDueDate] = useState(todayIso())

  // Detail table
  const [details, setDetails] = useState<DetailRow[]>([emptyRow()])
  const [discount, setDiscount] = useState('0')
  const [pickerRow, setPickerRow] = useState<number | null>(null)

  // Footer
  const [notes, setNotes] = useState('')
  const [recipientName, setRecipientName] = useState('')

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
      setSalesPerson(r.salesPerson ?? '')
      setPurchaseOrder(r.purchaseOrder ?? '')
      setDeliveryDate(r.deliveryDate.slice(0, 10))
      setPaymentDueDate(r.paymentDueDate.slice(0, 10))
      setReturnPercentage(String(r.returnPercentage))
      setReturnDueDate(r.returnDueDate.slice(0, 10))
      setDiscount(String(r.discountAmount))
      setNotes(r.notes ?? '')
      setRecipientName(r.recipientName ?? '')
      setSavedRemission(r)
      setDetails(r.details.map(d => ({
        productId: String(d.productId),
        teacher: d.teacher ?? '',
        supplierName: d.supplierName ?? '',
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
  const discountAmount = parseFloat(discount) || 0
  const total = subtotal - discountAmount

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!customerId) { setError('Selecciona un cliente.'); return }
    if (details.some(d => !d.productId || !d.quantity || !d.unitPrice)) {
      setError('Completa todos los campos de los productos.'); return
    }
    setSaving(true); setError(null)
    try {
      const dtos: CreateRemissionDetailDto[] = details.map(d => ({
        productId: Number(d.productId),
        teacher: d.teacher || undefined,
        quantity: parseFloat(d.quantity),
        unitPrice: parseFloat(d.unitPrice),
      }))
      const base = {
        customerId: Number(customerId),
        salesPerson: salesPerson || undefined,
        notes: notes || undefined,
        recipientName: recipientName || undefined,
        purchaseOrder: purchaseOrder || undefined,
        deliveryDate: toUtcNoon(deliveryDate),
        paymentDueDate: toUtcNoon(paymentDueDate),
        returnPercentage: parseFloat(returnPercentage) || 0,
        returnDueDate: toUtcNoon(returnDueDate),
        discountAmount,
        details: dtos,
      }
      let result: RemissionDto
      if (isEdit) {
        result = await remissionService.update(Number(id), { ...base, isActive: true })
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
    await downloadRemissionPdf(savedRemission)
  }

  const printPdf = async () => {
    if (!savedRemission) return
    await printRemissionPdf(savedRemission)
  }

  const printPdfVertical = async () => {
    if (!savedRemission) return
    await printRemissionPdfVertical(savedRemission)
  }

  if (loading) return <div style={{ padding: '2rem' }}>Cargando...</div>

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h4 style={{ color: '#1a1a2e', fontWeight: 700, margin: 0 }}>
          {isEdit ? `Remisión ${savedRemission?.folioFormatted ?? ''}` : 'Nueva remisión'}
        </h4>
        {isEdit && savedRemission && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={btnPdf} onClick={downloadPdf}>📄 Descargar PDF</button>
            <button style={btnPrintPdf} onClick={printPdf}>🖨️ Imprimir</button>
            <button style={btnPrintPdf} onClick={printPdfVertical}>🖨️ Imprimir vertical</button>
          </div>
        )}
      </div>

      {error && <p style={{ color: '#c0392b', marginBottom: '1rem' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {/* ── Datos generales ── */}
        <div style={card}>
          <h6 style={sectionTitle}>Datos generales</h6>
          <div style={row}>
            <div style={{ flex: 2, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Cliente *</label>
              <select style={input} value={customerId} onChange={e => setCustomerId(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={field}>
              <label style={labelStyle}>Vendedor</label>
              <input style={input} type="text" value={salesPerson} onChange={e => setSalesPerson(e.target.value)} placeholder="Nombre del vendedor" maxLength={200} />
            </div>
            <div style={field}>
              <label style={labelStyle}>Orden de compra</label>
              <input style={input} type="text" value={purchaseOrder} onChange={e => setPurchaseOrder(e.target.value)} placeholder="Orden de compra (opcional)" maxLength={200} />
            </div>
          </div>

          <div style={{ ...row, marginTop: 12 }}>
            <div style={field}>
              <label style={labelStyle}>Fecha de entrega *</label>
              <DateField value={deliveryDate} onChange={setDeliveryDate} required />
            </div>
            <div style={field}>
              <label style={labelStyle}>Fecha límite de pago *</label>
              <DateField value={paymentDueDate} onChange={setPaymentDueDate} required />
            </div>
            <div style={{ ...field, maxWidth: 140 }}>
              <label style={labelStyle}>% Devolución *</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...input, paddingRight: '1.8rem' }} type="number" value={returnPercentage} onChange={e => setReturnPercentage(e.target.value)} min="0" max="100" step="0.01" required />
                <span style={pctSuffix}>%</span>
              </div>
            </div>
            <div style={field}>
              <label style={labelStyle}>Fecha límite de devolución *</label>
              <DateField value={returnDueDate} onChange={setReturnDueDate} required />
            </div>
          </div>
        </div>

        {/* ── Productos ── */}
        <div style={{ ...card, marginTop: 12 }}>
          <h6 style={sectionTitle}>Productos</h6>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={th}>Maestro</th>
                  <th style={th}>Editorial</th>
                  <th style={th}>Título *</th>
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
                        <input style={inputSmall} type="text" value={d.teacher} onChange={e => updateRow(i, 'teacher', e.target.value)} maxLength={200} placeholder="Maestro" />
                      </td>
                      <td style={td}>
                        <input style={{ ...inputSmall, backgroundColor: '#f9f9f9' }} value={d.supplierName} readOnly placeholder="(auto)" />
                      </td>
                      <td style={td}>
                        <button
                          type="button"
                          style={{ ...pickerBtn, color: d.productId ? '#1a1a2e' : '#999' }}
                          onClick={() => setPickerRow(i)}
                        >
                          {productMap[Number(d.productId)]?.name ?? 'Seleccionar...'}
                        </button>
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
              <div style={{ position: 'relative', width: 100 }}>
                <input style={{ ...inputSmall, textAlign: 'right' }} type="number" value={discount} onChange={e => setDiscount(e.target.value)} min="0" step="0.01" placeholder="0.00" />
              </div>
              <span style={{ ...totalValue, color: '#c0392b' }}>-${discountAmount.toFixed(2)}</span>
            </div>
            <div style={{ ...totalRow, fontWeight: 700, fontSize: '1rem', color: '#1a1a2e' }}>
              <span style={totalLabel}>Total:</span><span style={totalValue}>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ── Notas y recepción ── */}
        <div style={{ ...card, marginTop: 12 }}>
          <h6 style={sectionTitle}>Notas y recepción</h6>
          <div style={row}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Observaciones</label>
              <textarea style={{ ...input, height: 70, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones generales..." />
            </div>
            <div style={field}>
              <label style={labelStyle}>Nombre de quien recibe</label>
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

      <ProductPickerModal
        show={pickerRow !== null}
        products={products}
        onClose={() => setPickerRow(null)}
        onSelect={p => { if (pickerRow !== null) updateRow(pickerRow, 'productId', String(p.id)); setPickerRow(null) }}
      />
    </div>
  )
}

const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const sectionTitle: React.CSSProperties = { color: '#1a1a2e', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }
const row: React.CSSProperties = { display: 'flex', gap: '1rem', flexWrap: 'wrap' }
const field: React.CSSProperties = { flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 4 }
const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: '#555' }
const input: React.CSSProperties = { padding: '0.45rem 0.6rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }
const inputSmall: React.CSSProperties = { padding: '0.3rem 0.4rem', border: '1px solid #ccc', borderRadius: '3px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }
const pctSuffix: React.CSSProperties = { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#666', pointerEvents: 'none' }
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
