import type { ReceivableRemission } from '../servicios/cobranzaServicio'

// Editor de reparto de un pago entre las remisiones pendientes de un cliente.
// Componente controlado y presentacional: el estado (value) vive en el padre.
// Lo usan el modal de Cuentas por Cobrar y el formulario de captura de pago.

export const ALLOC_EPSILON = 0.01
export const round2 = (n: number) => Math.round(n * 100) / 100
const fmt = (n: number) => `$${n.toFixed(2)}`

// Reparte el monto disponible entre las remisiones, de la más antigua a la más nueva.
export function distributeOldestFirst(
  remissions: ReceivableRemission[],
  available: number,
): Record<number, string> {
  let remaining = available
  const next: Record<number, string> = {}
  for (const r of remissions) {
    if (remaining <= ALLOC_EPSILON) { next[r.remissionId] = ''; continue }
    const applied = round2(Math.min(remaining, r.outstanding))
    next[r.remissionId] = applied > 0 ? String(applied) : ''
    remaining -= applied
  }
  return next
}

export interface AllocationSummary {
  assigned: number
  leftover: number      // sigue como anticipo
  overAssigned: boolean // lo asignado supera el disponible
  anyRowOver: boolean   // alguna fila supera el restante de su remisión
}

export function summarizeAllocation(
  remissions: ReceivableRemission[],
  value: Record<number, string>,
  available: number,
): AllocationSummary {
  const assigned = remissions.reduce((sum, r) => sum + (parseFloat(value[r.remissionId]) || 0), 0)
  return {
    assigned,
    leftover: round2(available - assigned),
    overAssigned: assigned > available + ALLOC_EPSILON,
    anyRowOver: remissions.some(r => (parseFloat(value[r.remissionId]) || 0) > r.outstanding + ALLOC_EPSILON),
  }
}

interface Props {
  remissions: ReceivableRemission[]  // ya ordenadas de la más antigua a la más nueva
  available: number                  // saldo del pago (modal) o monto capturado (formulario)
  value: Record<number, string>      // remissionId -> texto del input
  onChange: (next: Record<number, string>) => void
  disabled?: boolean
  showDistributeButton?: boolean
  emptyMessage?: string
}

export function AllocationEditor({
  remissions, available, value, onChange,
  disabled = false, showDistributeButton = false,
  emptyMessage = 'Sin remisiones pendientes.',
}: Props) {
  const { assigned, leftover, overAssigned } = summarizeAllocation(remissions, value, available)

  return (
    <div>
      {showDistributeButton && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            type="button" style={distributeBtn}
            disabled={disabled || remissions.length === 0 || available <= ALLOC_EPSILON}
            onClick={() => onChange(distributeOldestFirst(remissions, available))}
          >
            Distribuir automáticamente
          </button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={th}>Folio</th>
              <th style={th}>Vencimiento</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={{ ...th, textAlign: 'right' }}>Devuelto</th>
              <th style={{ ...th, textAlign: 'right' }}>Pagado</th>
              <th style={{ ...th, textAlign: 'right' }}>Restante</th>
              <th style={{ ...th, textAlign: 'right', width: 120 }}>A aplicar</th>
            </tr>
          </thead>
          <tbody>
            {remissions.map(r => (
              <tr key={r.remissionId} style={{ borderBottom: '1px solid #eee' }}>
                <td style={td}>N° {r.folioFormatted}</td>
                <td style={td}>
                  {new Date(r.paymentDueDate).toLocaleDateString('es-MX')}
                  {r.overdue && <span style={overdueChip}>vencido</span>}
                </td>
                <td style={tdRight}>{fmt(r.total)}</td>
                <td style={tdRight}>{fmt(r.returned)}</td>
                <td style={tdRight}>{fmt(r.paid)}</td>
                <td style={{ ...tdRight, fontWeight: 600 }}>{fmt(r.outstanding)}</td>
                <td style={tdRight}>
                  <input
                    type="number" min="0" step="0.01" style={allocInput}
                    value={value[r.remissionId] ?? ''}
                    disabled={disabled}
                    onChange={e => onChange({ ...value, [r.remissionId]: e.target.value })}
                    placeholder="0.00"
                  />
                </td>
              </tr>
            ))}
            {remissions.length === 0 && (
              <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#888', padding: '1.5rem' }}>
                {emptyMessage}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {!disabled && remissions.length > 0 && (
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: 10, fontSize: '0.85rem', flexWrap: 'wrap' }}>
          <span>Aplicado: <strong>{fmt(assigned)}</strong></span>
          <span style={{ color: overAssigned ? '#c0392b' : '#555' }}>
            {overAssigned ? 'Excede el saldo del pago' : `Queda como anticipo: ${fmt(Math.max(0, leftover))}`}
          </span>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, borderBottom: '2px solid #ddd' }
const td: React.CSSProperties = { padding: '0.4rem 0.6rem' }
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' }
const overdueChip: React.CSSProperties = { marginLeft: 6, padding: '0.05rem 0.4rem', borderRadius: 8, fontSize: '0.68rem', fontWeight: 700, backgroundColor: '#f8d7da', color: '#721c24' }
const allocInput: React.CSSProperties = { width: '100%', padding: '0.25rem 0.4rem', border: '1px solid #ccc', borderRadius: 3, fontSize: '0.8rem', textAlign: 'right', boxSizing: 'border-box' }
const distributeBtn: React.CSSProperties = { padding: '0.35rem 0.75rem', backgroundColor: '#fff', color: '#1a1a2e', border: '1px solid #1a1a2e', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }
