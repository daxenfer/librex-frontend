import { useState, useEffect } from 'react'
import {
  reportService,
  type CustomerReportRow, type PublisherReport,
  type SalesByProductReport,
} from '../servicios/reportesServicio'
import { publisherService, type PublisherDto } from '../servicios/editorialesServicio'

type Tab = 'saldos' | 'cantidades'

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('saldos')
  const [publishers, setPublishers] = useState<PublisherDto[]>([])

  useEffect(() => {
    publisherService.getAll().then(setPublishers).catch(() => {})
  }, [])

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <h4 style={{ color: '#1a1a2e', marginBottom: '1.25rem', fontWeight: 700 }}>Reportes</h4>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <TabButton label="Saldos por cliente" active={activeTab === 'saldos'} onClick={() => setActiveTab('saldos')} />
        <TabButton label="Cantidades por producto" active={activeTab === 'cantidades'} onClick={() => setActiveTab('cantidades')} />
      </div>

      {activeTab === 'saldos' && <SaldosReport publishers={publishers} />}
      {activeTab === 'cantidades' && <CantidadesReport publishers={publishers} />}
    </div>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 1.25rem',
        borderRadius: '20px',
        border: active ? 'none' : '1px solid #ccc',
        backgroundColor: active ? '#1a1a2e' : '#fff',
        color: active ? '#fff' : '#555',
        fontWeight: active ? 600 : 400,
        fontSize: '0.9rem',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

/* ── Tab 1: Saldos por cliente ─────────────────────────────── */

function SaldosReport({ publishers }: { publishers: PublisherDto[] }) {
  const [selectedPublisherId, setSelectedPublisherId] = useState<string>('')
  const [report, setReport] = useState<PublisherReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true); setError(null)
    try {
      const pid = selectedPublisherId ? Number(selectedPublisherId) : undefined
      setReport(await reportService.getByPublisher(pid))
    } catch {
      setError('No se pudo generar el reporte.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={card}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>Editorial</label>
            <select style={{ ...inputStyle, minWidth: 220 }} value={selectedPublisherId} onChange={e => setSelectedPublisherId(e.target.value)}>
              <option value="">Todas las editoriales</option>
              {publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button style={btnPrimary} onClick={generate} disabled={loading}>
            {loading ? 'Generando...' : 'Generar reporte'}
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#c0392b', marginTop: '1rem' }}>{error}</p>}

      {report && (
        <div style={{ ...card, marginTop: 16 }}>
          <h6 style={{ color: '#1a1a2e', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            {report.publisherName}
          </h6>
          {report.customers.length === 0 ? (
            <p style={{ color: '#888', padding: '1rem 0' }}>No hay movimientos para esta editorial.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
                    <th style={th}>Cliente</th>
                    <th style={{ ...th, textAlign: 'right' }}>Ventas</th>
                    <th style={{ ...th, textAlign: 'right' }}>Devoluciones</th>
                    <th style={{ ...th, textAlign: 'right' }}>Pagos</th>
                    <th style={{ ...th, textAlign: 'right' }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {report.customers.map(row => <ReportRow key={row.customerId} row={row} />)}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 700 }}>
                    <td style={td}>TOTALES</td>
                    <td style={{ ...td, textAlign: 'right' }}>{fmt(report.totals.totalSales)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{fmt(report.totals.totalReturns)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{fmt(report.totals.totalPayments)}</td>
                    <SaldoCell value={report.totals.balance} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.75rem' }}>
            † Los pagos corresponden al total del cliente y no se atribuyen por editorial.
          </p>
        </div>
      )}
    </>
  )
}

function ReportRow({ row }: { row: CustomerReportRow }) {
  return (
    <tr style={{ borderBottom: '1px solid #eee' }}>
      <td style={td}>{row.customerName}</td>
      <td style={{ ...td, textAlign: 'right' }}>{fmt(row.totalSales)}</td>
      <td style={{ ...td, textAlign: 'right' }}>{fmt(row.totalReturns)}</td>
      <td style={{ ...td, textAlign: 'right' }}>{fmt(row.totalPayments)}</td>
      <SaldoCell value={row.balance} />
    </tr>
  )
}

function SaldoCell({ value }: { value: number }) {
  const color = value > 0 ? '#c0392b' : value < 0 ? '#27ae60' : '#888'
  return (
    <td style={{ ...td, textAlign: 'right', fontWeight: 600, color }}>{fmt(value)}</td>
  )
}

/* ── Tab 2: Cantidades por producto ────────────────────────── */

function CantidadesReport({ publishers }: { publishers: PublisherDto[] }) {
  const [selectedPublisherId, setSelectedPublisherId] = useState<string>('')
  const [report, setReport] = useState<SalesByProductReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true); setError(null)
    try {
      const pid = selectedPublisherId ? Number(selectedPublisherId) : undefined
      setReport(await reportService.getSalesByProduct(pid))
    } catch {
      setError('No se pudo generar el reporte.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={card}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>Editorial</label>
            <select style={{ ...inputStyle, minWidth: 220 }} value={selectedPublisherId} onChange={e => setSelectedPublisherId(e.target.value)}>
              <option value="">Todas las editoriales</option>
              {publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button style={btnPrimary} onClick={generate} disabled={loading}>
            {loading ? 'Generando...' : 'Generar reporte'}
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#c0392b', marginTop: '1rem' }}>{error}</p>}

      {report && (
        <div style={{ ...card, marginTop: 16 }}>
          <h6 style={{ color: '#1a1a2e', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            {report.publisherName}
          </h6>
          {report.rows.length === 0 ? (
            <p style={{ color: '#888', padding: '1rem 0' }}>No hay ventas netas para esta editorial.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
                    <th style={{ ...th, minWidth: 160 }}>Cliente</th>
                    {report.products.map(p => (
                      <th key={p.productId} style={{ ...th, textAlign: 'center', minWidth: 90 }} title={p.productName}>
                        {p.productName.length > 14 ? p.productName.slice(0, 13) + '…' : p.productName}
                      </th>
                    ))}
                    <th style={{ ...th, textAlign: 'center', minWidth: 70 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map(row => (
                    <tr key={row.customerId} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={td}>{row.customerName}</td>
                      {row.quantities.map((qty, i) => (
                        <td key={i} style={{ ...td, textAlign: 'center', color: qty === 0 ? '#ccc' : undefined }}>
                          {qty === 0 ? '—' : qty}
                        </td>
                      ))}
                      <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{row.totalQuantity}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 700 }}>
                    <td style={td}>TOTALES</td>
                    {report.productTotals.map((t, i) => (
                      <td key={i} style={{ ...td, textAlign: 'center' }}>{t}</td>
                    ))}
                    <td style={{ ...td, textAlign: 'center' }}>{report.grandTotal}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}

const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: '#555' }
const inputStyle: React.CSSProperties = { padding: '0.45rem 0.6rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9rem' }
const th: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 700 }
const td: React.CSSProperties = { padding: '0.65rem 1rem', fontSize: '0.9rem' }
const btnPrimary: React.CSSProperties = { padding: '0.6rem 1.25rem', backgroundColor: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem', whiteSpace: 'nowrap' }
