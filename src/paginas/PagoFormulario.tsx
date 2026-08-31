import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { paymentService, PAYMENT_METHODS, type PaymentDto } from '../servicios/pagosServicio'
import { customerService, type CustomerDto } from '../servicios/clientesServicio'
import { receivablesService, type CustomerReceivable, type ReceivableRemission } from '../servicios/cobranzaServicio'
import { AllocationEditor, summarizeAllocation, distributeOldestFirst, round2, ALLOC_EPSILON } from '../componentes/AllocationEditor'
import { DateField } from '../componentes/DateField'
import { downloadPaymentPdf, printPaymentPdf } from '../utils/pagoPdf'
import { todayIso, toUtcNoon } from '../utils/dates'
import { errorMessage } from '../utils/errores'

const fmt = (n: number) => `$${n.toFixed(2)}`

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

  // Reparto del pago entre las remisiones con saldo del cliente. Se prellena solo con las más
  // antiguas: el default es "aplicado", y dejarlo como anticipo tiene que ser una decisión.
  // alloc: remissionId -> texto del input.
  const [receivable, setReceivable] = useState<CustomerReceivable | null>(null)
  const [alloc, setAlloc] = useState<Record<number, string>>({})
  const [loadingReceivable, setLoadingReceivable] = useState(false)
  // En refs y no en estado: las lee el callback de carga sin volverse dependencia del efecto
  // (si `amount` lo fuera, cada tecla dispararía otra consulta de cuentas por cobrar).
  const amountRef = useRef('')
  const allocTouchedRef = useRef(false)
  const [advanceWarned, setAdvanceWarned] = useState(false)

  const [customers, setCustomers] = useState<CustomerDto[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [savedPayment, setSavedPayment] = useState<PaymentDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Declarada antes de los efectos: uno de ellos la llama al llegar las cuentas por cobrar.
  const applyDistribution = (rems: ReceivableRemission[], amountValue: string) => {
    const value = parseFloat(amountValue) || 0
    setAlloc(value > 0 ? distributeOldestFirst(rems, value) : {})
  }

  useEffect(() => {
    customerService.getAll().then(setCustomers).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    paymentService.getById(Number(id)).then(p => {
      setCustomerId(String(p.customerId))
      setDate(p.date.slice(0, 10))
      setAmount(String(p.amount))
      amountRef.current = String(p.amount)
      setPaymentMethod(p.paymentMethod)
      setReference(p.reference ?? '')
      setReceivedFrom(p.receivedFrom ?? '')
      setConcept(p.concept ?? '')
      setCollectedBy(p.collectedBy ?? '')
      setCity(p.city ?? '')
      setNotes(p.notes ?? '')
      setAlloc(Object.fromEntries(p.allocations.map(a => [a.remissionId, String(a.amount)])))
      // El reparto guardado manda: nunca se pisa con uno automático.
      allocTouchedRef.current = true
      setSavedPayment(p)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  // Carga las remisiones con saldo del cliente para el reparto. En edición se excluye
  // este pago para que sus propias asignaciones no hagan ver las remisiones liquidadas.
  useEffect(() => {
    if (!customerId) { setReceivable(null); return }
    const cid = Number(customerId)
    let cancelled = false
    setLoadingReceivable(true)
    receivablesService.getByCustomer(cid, isEdit ? { excludePaymentId: Number(id) } : undefined)
      .then(r => {
        if (cancelled) return
        setReceivable(r)
        if (!allocTouchedRef.current) applyDistribution(r?.remissions ?? [], amountRef.current)
      })
      .catch(() => { if (!cancelled) setReceivable(null) })
      .finally(() => { if (!cancelled) setLoadingReceivable(false) })
    return () => { cancelled = true }
  }, [customerId, id, isEdit])

  const remissions = receivable?.remissions ?? []
  const available = parseFloat(amount) || 0
  const { leftover, overAssigned, anyRowOver } = summarizeAllocation(remissions, alloc, available)
  const hasUnapplied = remissions.length > 0 && leftover > ALLOC_EPSILON

  const handleAmountChange = (value: string) => {
    setAmount(value)
    amountRef.current = value
    setAdvanceWarned(false)
    if (!allocTouchedRef.current) applyDistribution(remissions, value)
  }

  const handleAllocChange = (next: Record<number, string>) => {
    setAlloc(next)
    allocTouchedRef.current = true
    setAdvanceWarned(false)
  }

  const handleCustomerChange = (value: string) => {
    if (value !== customerId) {
      setAlloc({})               // el reparto es de otro cliente; se descarta
      allocTouchedRef.current = false
      setAdvanceWarned(false)
    }
    setCustomerId(value)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!customerId) { setError('Selecciona un cliente.'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('El monto debe ser mayor a cero.'); return }
    if (overAssigned) { setError('Lo aplicado a remisiones supera el monto del pago.'); return }
    if (anyRowOver) { setError('Una aplicación supera el saldo de su remisión.'); return }
    // Dejar dinero sin aplicar teniendo remisiones con saldo se avisa una vez; si el usuario
    // insiste, se guarda como anticipo.
    if (hasUnapplied && !advanceWarned) { setAdvanceWarned(true); setError(null); return }
    setSaving(true); setError(null)
    try {
      // Solo las filas con monto > 0. Si no hay ninguna, el pago queda como anticipo.
      const allocations = remissions
        .map(r => ({ remissionId: r.remissionId, amount: round2(parseFloat(alloc[r.remissionId]) || 0) }))
        .filter(a => a.amount > 0)
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
        allocations,
      }
      if (isEdit) {
        await paymentService.update(Number(id), base)
      } else {
        await paymentService.create(base)
      }
      navigate('/payments')
    } catch (err) {
      setError(errorMessage(err, 'Error al guardar el pago.'))
    } finally {
      setSaving(false)
    }
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
                onChange={e => handleAmountChange(e.target.value)}
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

        {customerId && (
          <div style={{ ...card, marginTop: 12 }}>
            <h6 style={sectionTitle}>Aplicar a remisiones</h6>
            {loadingReceivable ? (
              <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>Cargando remisiones...</p>
            ) : remissions.length === 0 ? (
              <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>
                Este cliente no tiene remisiones con saldo pendiente. El pago quedará como anticipo.
              </p>
            ) : (
              <>
                <p style={{ color: '#555', fontSize: '0.85rem', marginTop: 0, marginBottom: 10 }}>
                  El reparto se prellena con las remisiones más antiguas. Lo que dejes sin aplicar queda
                  como anticipo a favor del cliente.
                </p>
                <AllocationEditor
                  remissions={remissions}
                  available={available}
                  value={alloc}
                  onChange={handleAllocChange}
                  showDistributeButton
                />
              </>
            )}
          </div>
        )}

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

        {advanceWarned && hasUnapplied && (
          <div style={advanceWarning}>
            <div>
              Vas a dejar <strong>{fmt(leftover)}</strong> como anticipo, y este cliente tiene{' '}
              <strong>{fmt(receivable?.totalOutstanding ?? 0)}</strong> pendiente en{' '}
              {remissions.length} {remissions.length === 1 ? 'remisión' : 'remisiones'}.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button" style={btnApplyOldest}
                onClick={() => { applyDistribution(remissions, amount); allocTouchedRef.current = true; setAdvanceWarned(false) }}
              >
                Aplicar a las más antiguas
              </button>
              <span style={{ fontSize: '0.8rem' }}>O vuelve a pulsar Guardar para registrarlo como anticipo.</span>
            </div>
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
const advanceWarning: React.CSSProperties = { marginTop: 12, padding: '0.9rem 1.1rem', backgroundColor: '#fdf6e3', border: '1px solid #e67e22', borderRadius: 8, color: '#8a6d3b', fontSize: '0.9rem' }
const btnApplyOldest: React.CSSProperties = { padding: '0.4rem 0.9rem', backgroundColor: '#e67e22', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem' }
const btnPrimary: React.CSSProperties = { padding: '0.6rem 1.5rem', backgroundColor: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem' }
const btnSecondary: React.CSSProperties = { padding: '0.6rem 1.5rem', backgroundColor: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem' }
const btnPdf: React.CSSProperties = { padding: '0.5rem 1rem', backgroundColor: '#fff', color: '#1a1a2e', border: '1px solid #1a1a2e', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }
const btnPrintPdf: React.CSSProperties = { padding: '0.5rem 1rem', backgroundColor: '#1a1a2e', color: '#fff', border: '1px solid #1a1a2e', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }
