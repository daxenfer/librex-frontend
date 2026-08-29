import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, Button, Form } from 'react-bootstrap'
import { paymentService } from '../servicios/pagosServicio'
import type { CustomerReceivable } from '../servicios/cobranzaServicio'
import { AllocationEditor, distributeOldestFirst, summarizeAllocation, round2 } from './AllocationEditor'

interface Props {
  show: boolean
  customer: CustomerReceivable | null
  onClose: () => void
  onSaved: () => void
}

const fmt = (n: number) => `$${n.toFixed(2)}`

export function CobranzaClienteModal({ show, customer, onClose, onSaved }: Props) {
  const navigate = useNavigate()
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null)
  const [alloc, setAlloc] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPayment = useMemo(
    () => customer?.unappliedPayments.find(p => p.paymentId === selectedPaymentId) ?? null,
    [customer, selectedPaymentId]
  )

  // Al abrir / cambiar de cliente: autoseleccionar si hay un solo pago con saldo.
  useEffect(() => {
    setError(null)
    const only = customer?.unappliedPayments.length === 1 ? customer.unappliedPayments[0] : null
    setSelectedPaymentId(only?.paymentId ?? null)
    if (only) setAlloc(distributeOldestFirst(customer!.remissions, only.unapplied))
    else setAlloc({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, show])

  const handleSelectPayment = (id: number | null) => {
    setSelectedPaymentId(id)
    const p = customer?.unappliedPayments.find(x => x.paymentId === id) ?? null
    if (p) setAlloc(distributeOldestFirst(customer!.remissions, p.unapplied))
    else setAlloc({})
  }

  const available = selectedPayment?.unapplied ?? 0
  const { assigned, overAssigned, anyRowOver } = summarizeAllocation(customer?.remissions ?? [], alloc, available)

  const canSave = !!selectedPayment && assigned > 0 && !overAssigned && !anyRowOver && !saving

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!customer || !selectedPayment) { setError('Selecciona un pago para aplicar.'); return }
    if (assigned <= 0) { setError('Asigna el pago a al menos una remisión.'); return }
    if (overAssigned) { setError('Lo asignado supera el saldo disponible del pago.'); return }
    if (anyRowOver) { setError('Una asignación supera el saldo de su remisión.'); return }

    setSaving(true); setError(null)
    try {
      // Cargar el pago completo y fusionar sus asignaciones existentes con las nuevas.
      const full = await paymentService.getById(selectedPayment.paymentId)
      const merged = new Map<number, number>()
      for (const a of full.allocations) merged.set(a.remissionId, (merged.get(a.remissionId) ?? 0) + a.amount)
      for (const r of customer.remissions) {
        const add = round2(parseFloat(alloc[r.remissionId]) || 0)
        if (add > 0) merged.set(r.remissionId, round2((merged.get(r.remissionId) ?? 0) + add))
      }
      const allocations = [...merged.entries()].map(([remissionId, amount]) => ({ remissionId, amount }))

      await paymentService.update(full.id, {
        customerId: full.customerId,
        date: full.date,
        amount: full.amount,
        paymentMethod: full.paymentMethod,
        reference: full.reference,
        notes: full.notes,
        receivedFrom: full.receivedFrom,
        concept: full.concept,
        collectedBy: full.collectedBy,
        city: full.city,
        isActive: full.isActive,
        allocations,
      })
      onSaved()
      onClose()
    } catch {
      setError('No se pudo aplicar el pago.')
    } finally {
      setSaving(false)
    }
  }

  const goCapture = () => {
    if (!customer) return
    onClose()
    navigate(`/payments/new?customerId=${customer.customerId}`)
  }

  if (!customer) return null

  const noPayments = customer.unappliedPayments.length === 0

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '1.1rem' }}>Cuenta de {customer.customerName}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <p style={{ color: '#c0392b' }}>{error}</p>}

          {/* Resumen */}
          <div style={summaryBar}>
            <Summary label="Remisionado" value={fmt(customer.totalInvoiced)} />
            <Summary label="Devuelto" value={fmt(customer.totalReturned)} />
            <Summary label="Pagado" value={fmt(customer.totalPaid)} />
            <Summary label="Por cobrar" value={fmt(customer.totalOutstanding)} highlight />
            {customer.availableCredit > 0 && (
              <Summary label="Saldo a favor" value={fmt(customer.availableCredit)} />
            )}
          </div>

          {/* Selección del pago a aplicar */}
          <div style={{ ...cobroBox, marginTop: 16 }}>
            <h6 style={sectionTitle}>Aplicar un pago</h6>
            {noPayments ? (
              <div style={{ fontSize: '0.9rem', color: '#555' }}>
                Este cliente no tiene pagos con saldo disponible.{' '}
                <button type="button" style={linkBtn} onClick={goCapture}>Capturar un pago</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 260 }}>
                  <label style={lbl}>Pago (saldo disponible) *</label>
                  <select
                    style={input}
                    value={selectedPaymentId ?? ''}
                    onChange={e => handleSelectPayment(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Seleccionar pago...</option>
                    {customer.unappliedPayments.map(p => (
                      <option key={p.paymentId} value={p.paymentId}>
                        N° {p.folioFormatted} — {new Date(p.date).toLocaleDateString('es-MX')} — {p.paymentMethod} — saldo {fmt(p.unapplied)}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 160 }}>
                  <label style={lbl}>Saldo disponible</label>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a1a2e' }}>{fmt(available)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Remisiones no liquidadas */}
          <div style={{ marginTop: 12 }}>
            <AllocationEditor
              remissions={customer.remissions}
              available={available}
              value={alloc}
              onChange={setAlloc}
              disabled={!selectedPayment}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={!canSave}
            style={{ backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' }}>
            {saving ? 'Guardando...' : 'Aplicar pago'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

function Summary({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: '1rem', fontWeight: 700, color: highlight ? '#c0392b' : '#1a1a2e' }}>{value}</span>
    </div>
  )
}

const summaryBar: React.CSSProperties = { display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '0.75rem 1rem', backgroundColor: '#f7f7f9', borderRadius: 6 }
const cobroBox: React.CSSProperties = { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '1rem' }
const sectionTitle: React.CSSProperties = { color: '#1a1a2e', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }
const lbl: React.CSSProperties = { fontSize: '0.78rem', fontWeight: 600, color: '#555' }
const input: React.CSSProperties = { padding: '0.45rem 0.6rem', border: '1px solid #ccc', borderRadius: 4, fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#2980b9', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: '0.9rem' }
