import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { paymentService, PAYMENT_METHODS, type PaymentDto, type CreatePaymentAllocationDto } from '../servicios/pagosServicio'
import { customerService, type CustomerDto } from '../servicios/clientesServicio'
import { DateField } from '../componentes/DateField'
import { downloadPaymentPdf, printPaymentPdf } from '../utils/pagoPdf'
import { todayIso, toUtcNoon } from '../utils/dates'

export function PaymentForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isEdit = !!id

  const [customerId, setCustomerId] = useState(searchParams.get('customerId') ?? '')
  const [date, setDate] = useState(todayIso())
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0])
  const [reference, setReference] = useState('')
  const [receivedFrom, setReceivedFrom] = useState('')
  const [concept, setConcept] = useState('')
  const [collectedBy, setCollectedBy] = useState('')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')
  // Asignaciones a remisiones hechas en Cuentas por Cobrar. Este formulario no las edita,
  // pero debe reenviarlas en el update para no borrarlas (PUT reemplaza la colección).
  const [allocations, setAllocations] = useState<CreatePaymentAllocationDto[]>([])

  const [customers, setCustomers] = useState<CustomerDto[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [savedPayment, setSavedPayment] = useState<PaymentDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    customerService.getAll().then(list => {
      setCustomers(list)
      // Prellenar la ciudad con la del cliente preseleccionado (p.ej. al venir de CxC).
      if (!isEdit && customerId) {
        const c = list.find(x => String(x.id) === customerId)
        if (c?.city) setCity(prev => prev || c.city)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    paymentService.getById(Number(id)).then(p => {
      setCustomerId(String(p.customerId))
      setDate(p.date.slice(0, 10))
      setAmount(String(p.amount))
      setPaymentMethod(p.paymentMethod)
      setReference(p.reference ?? '')
      setReceivedFrom(p.receivedFrom ?? '')
      setConcept(p.concept ?? '')
      setCollectedBy(p.collectedBy ?? '')
      setCity(p.city ?? '')
      setNotes(p.notes ?? '')
      setAllocations(p.allocations.map(a => ({ remissionId: a.remissionId, amount: a.amount })))
      setSavedPayment(p)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!customerId) { setError('Selecciona un cliente.'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('El monto debe ser mayor a cero.'); return }
    setSaving(true); setError(null)
    try {
      const base = {
        customerId: Number(customerId),
        date: toUtcNoon(date),
        amount: parseFloat(amount),
        paymentMethod,
        reference: reference || undefined,
        receivedFrom: receivedFrom || undefined,
        concept: concept || undefined,
        collectedBy: collectedBy || undefined,
        city: city || undefined,
        notes: notes || undefined,
        allocations, // [] al crear; en edición conserva lo asignado en Cuentas por Cobrar
      }
      if (isEdit) {
        await paymentService.update(Number(id), { ...base, isActive: true })
      } else {
        await paymentService.create(base)
      }
      navigate('/payments')
    } catch {
      setError('Error al guardar el pago.')
    } finally {
      setSaving(false)
    }
  }

  // Al cambiar de cliente, prellenar la ciudad si está vacía o traía la del cliente anterior
  // (no pisa lo que el usuario haya escrito a mano).
  const handleCustomerChange = (value: string) => {
    const prev = customers.find(c => String(c.id) === customerId)
    const next = customers.find(c => String(c.id) === value)
    setCustomerId(value)
    if (next?.city && (!city || city === prev?.city)) setCity(next.city)
  }

  const downloadPdf = () => { if (savedPayment) downloadPaymentPdf(savedPayment) }
  const printPdf = () => { if (savedPayment) printPaymentPdf(savedPayment) }

  if (loading) return <div style={{ padding: '2rem' }}>Cargando...</div>

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h4 style={{ color: '#1a1a2e', fontWeight: 700, margin: 0 }}>
          {isEdit ? `Recibo ${savedPayment?.folioFormatted ?? ''}` : 'Nuevo pago'}
        </h4>
        {isEdit && savedPayment && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" style={btnPdf} onClick={downloadPdf}>📄 Descargar PDF</button>
            <button type="button" style={btnPrintPdf} onClick={printPdf}>🖨️ Imprimir</button>
          </div>
        )}
      </div>

      {error && <p style={{ color: '#c0392b', marginBottom: '1rem' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={card}>
          <h6 style={sectionTitle}>Datos del recibo</h6>
          <div style={row}>
            <div style={field}>
              <label style={label}>Recibimos de (cliente) *</label>
              <select style={input} value={customerId} onChange={e => handleCustomerChange(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ ...field, maxWidth: 160 }}>
              <label style={label}>Fecha *</label>
              <DateField value={date} onChange={setDate} required />
            </div>
            <div style={{ ...field, maxWidth: 200 }}>
              <label style={label}>Ciudad</label>
              <input style={input} type="text" value={city} onChange={e => setCity(e.target.value)}
                maxLength={100} placeholder="Municipio" />
            </div>
          </div>
          <div style={{ ...row, marginTop: 10 }}>
            <div style={field}>
              <label style={label}>Nombre de la escuela</label>
              <input style={input} type="text" value={receivedFrom} onChange={e => setReceivedFrom(e.target.value)}
                maxLength={200} placeholder="Nombre de la escuela (opcional)" />
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
              <label style={label}>Forma de pago *</label>
              <select style={input} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ ...field, flex: 2 }}>
              <label style={label}>Referencia <span style={{ color: '#888', fontSize: '0.75rem' }}>(No. de cheque, depósito, etc.)</span></label>
              <input style={input} type="text" value={reference} onChange={e => setReference(e.target.value)} maxLength={200} placeholder="Número de cheque, folio de depósito..." />
            </div>
          </div>
        </div>

        <div style={{ ...card, marginTop: 12 }}>
          <h6 style={sectionTitle}>Concepto</h6>
          <div style={row}>
            <div style={{ ...field, flex: 2 }}>
              <label style={label}>Por concepto de</label>
              <input style={input} type="text" value={concept} onChange={e => setConcept(e.target.value)}
                maxLength={500} placeholder="Concepto del pago" />
            </div>
            <div style={field}>
              <label style={label}>Vendedor ó cobrador</label>
              <input style={input} type="text" value={collectedBy} onChange={e => setCollectedBy(e.target.value)}
                maxLength={200} placeholder="Quien recibe el pago" />
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
const btnPdf: React.CSSProperties = { padding: '0.5rem 1rem', backgroundColor: '#fff', color: '#1a1a2e', border: '1px solid #1a1a2e', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }
const btnPrintPdf: React.CSSProperties = { padding: '0.5rem 1rem', backgroundColor: '#1a1a2e', color: '#fff', border: '1px solid #1a1a2e', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }
