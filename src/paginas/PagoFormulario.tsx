import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { paymentService, PAYMENT_METHODS, type PaymentDto } from '../servicios/pagosServicio'
import { customerService, type CustomerDto } from '../servicios/clientesServicio'
import { remissionService, type RemissionDto } from '../servicios/remisionesServicio'

export function PaymentForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [customerId, setCustomerId] = useState('')
  const [remissionId, setRemissionId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0])
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [customers, setCustomers] = useState<CustomerDto[]>([])
  const [remissions, setRemissions] = useState<RemissionDto[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [savedPayment, setSavedPayment] = useState<PaymentDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([customerService.getAll(), remissionService.getAll()])
      .then(([c, r]) => { setCustomers(c); setRemissions(r) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    paymentService.getById(Number(id)).then(p => {
      setCustomerId(String(p.customerId))
      setRemissionId(p.remissionId ? String(p.remissionId) : '')
      setDate(p.date.slice(0, 10))
      setAmount(String(p.amount))
      setPaymentMethod(p.paymentMethod)
      setReference(p.reference ?? '')
      setNotes(p.notes ?? '')
      setIsActive(p.isActive)
      setSavedPayment(p)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const customerRemissions = remissions.filter(r => r.customerId === Number(customerId))

  const handleCustomerChange = (val: string) => {
    setCustomerId(val)
    setRemissionId('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!customerId) { setError('Selecciona un cliente.'); return }
    if (!remissionId) { setError('Selecciona una remisión.'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('El monto debe ser mayor a cero.'); return }
    setSaving(true); setError(null)
    try {
      const base = {
        customerId: Number(customerId),
        remissionId: Number(remissionId),
        date: new Date(date).toISOString(),
        amount: parseFloat(amount),
        paymentMethod,
        reference: reference || undefined,
        notes: notes || undefined,
      }
      let result: PaymentDto
      if (isEdit) {
        result = await paymentService.update(Number(id), { ...base, isActive })
      } else {
        result = await paymentService.create(base)
      }
      setSavedPayment(result)
      navigate('/payments')
    } catch {
      setError('Error al guardar el pago.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '2rem' }}>Cargando...</div>

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h4 style={{ color: '#1a1a2e', fontWeight: 700, margin: 0 }}>
          {isEdit ? `Pago ${savedPayment?.folioFormatted ?? ''}` : 'Nuevo pago'}
        </h4>
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
              <input style={input} type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>

          <div style={{ ...row, marginTop: 10 }}>
            <div style={{ ...field, flex: 2 }}>
              <label style={label}>Remisión *</label>
              <select style={input} value={remissionId} onChange={e => setRemissionId(e.target.value)} disabled={!customerId} required>
                <option value="" disabled>Seleccionar remisión...</option>
                {customerRemissions.map(r => (
                  <option key={r.id} value={r.id}>N° {r.folioFormatted} — {new Date(r.date).toLocaleDateString('es-MX')}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ ...card, marginTop: 12 }}>
          <h6 style={sectionTitle}>Detalle del pago</h6>
          <div style={row}>
            <div style={{ ...field, maxWidth: 180 }}>
              <label style={label}>Monto *</label>
              <input
                style={input} type="number" value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0.01" step="0.01" placeholder="0.00" required
              />
            </div>
            <div style={field}>
              <label style={label}>Método de pago *</label>
              <select style={input} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ ...field, flex: 2 }}>
              <label style={label}>Referencia <span style={{ color: '#888', fontSize: '0.75rem' }}>(folio, clave, etc.)</span></label>
              <input style={input} type="text" value={reference} onChange={e => setReference(e.target.value)} maxLength={200} placeholder="Número de cheque, clave de transferencia..." />
            </div>
          </div>
        </div>

        <div style={{ ...card, marginTop: 12 }}>
          <h6 style={sectionTitle}>Observaciones</h6>
          <textarea
            style={{ ...input, height: 80, resize: 'vertical' }}
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notas adicionales..."
          />
        </div>

        {isEdit && (
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              Activo
            </label>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: 16 }}>
          <button type="submit" disabled={saving} style={btnPrimary}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" style={btnSecondary} onClick={() => navigate('/payments')}>Cancelar</button>
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
const btnPrimary: React.CSSProperties = { padding: '0.6rem 1.5rem', backgroundColor: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem' }
const btnSecondary: React.CSSProperties = { padding: '0.6rem 1.5rem', backgroundColor: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem' }
