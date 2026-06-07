import { useState, useEffect } from 'react'
import {
  reportService,
  type CustomerReportRow, type PublisherReport,
  type SalesByProductReport,
} from '../servicios/reportesServicio'
import { publisherService, type PublisherDto } from '../servicios/editorialesServicio'
import { exportToExcel } from '../utils/exportarExcel'

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
    <div className="page-content" style={{ padding: '1.5rem 2rem', maxWidth: 1100 }}>
      <h4 style={{ color: '#1a1a2e', marginBottom: '1.5rem', fontWeight: 700, fontSize: '1.25rem' }}>Reportes</h4>

      <div style={tabBar}>
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
    <button onClick={onClick} style={{
      padding: '0.6rem 1.5rem',
      border: 'none',
      background: 'none',
      borderBottom: active ? '2px solid #1a1a2e' : '2px solid transparent',
      color: active ? '#1a1a2e' : '#888',
      fontWeight: active ? 700 : 400,
      fontSize: '0.95rem',
      cursor: 'pointer',
      transition: 'all 0.15s',
    }}>
      {label}
    </button>
  )
}

/* ── Tab 1: Saldos por cliente ─────────────────────────────── */

function SaldosReport({ publishers }: { publishers: PublisherDto[] }) {
  const [selectedPublisherId, setSelectedPublisherId] = useState<string>('')
  const [reports, setReports] = useState<PublisherReport[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [pdfLoading, setPdfLoading] = useState(false)

  const load = async (pid: string) => {
    setLoading(true); setError(null)
    try {
      if (pid) {
        const r = await reportService.getByPublisher(Number(pid))
        setReports([r])
        setExpanded(new Set([String(r.publisherId ?? 'all')]))
      } else {
        const results = await Promise.all(publishers.map(p => reportService.getByPublisher(p.id)))
        const filtered = results.filter(r => r.customers.length > 0)
        setReports(filtered)
        setExpanded(new Set(filtered.map(r => String(r.publisherId ?? 'all'))))
      }
    } catch {
      setError('No se pudo generar el reporte.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (publishers.length > 0) load(selectedPublisherId)
  }, [publishers])

  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const handleFilter = (pid: string) => {
    setSelectedPublisherId(pid)
    if (publishers.length > 0) load(pid)
  }

  const downloadExcel = () => {
    const rows = reports.flatMap(report => [
      ...report.customers.map(row => ({
        'Editorial': report.publisherName,
        'Cliente': row.customerName,
        'Ventas': row.totalSales,
        'Devoluciones': row.totalReturns,
        'Pagos': row.totalPayments,
        'Saldo': row.balance,
      })),
      {
        'Editorial': report.publisherName,
        'Cliente': 'TOTALES',
        'Ventas': report.totals.totalSales,
        'Devoluciones': report.totals.totalReturns,
        'Pagos': report.totals.totalPayments,
        'Saldo': report.totals.balance,
      },
    ])
    exportToExcel(rows, 'saldos-por-cliente')
  }

  const downloadPdf = async () => {
    setPdfLoading(true)
    try {
      const publisherName = publishers.find(p => String(p.id) === selectedPublisherId)?.name ?? ''
      const [{ pdf }, { SaldosReportePdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../componentes/SaldosReportePdf'),
      ])
      const blob = await pdf(
        <SaldosReportePdf reports={reports} filtroEditorial={publisherName} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'saldos-por-cliente.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <>
      <div style={filterBar}>
        <label style={labelStyle}>Editorial</label>
        <select style={selectStyle} value={selectedPublisherId} onChange={e => handleFilter(e.target.value)}>
          <option value="">Todas las editoriales</option>
          {publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button style={btnExcelReport} onClick={downloadExcel} disabled={loading || reports.length === 0}>Descargar Excel</button>
        <button style={btnPdf} onClick={downloadPdf} disabled={loading || pdfLoading || reports.length === 0}>
          {pdfLoading ? 'Generando...' : 'Descargar PDF'}
        </button>
        {loading && <span style={{ fontSize: '0.85rem', color: '#888' }}>Cargando...</span>}
      </div>

      {error && <p style={{ color: '#c0392b', marginTop: '1rem' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
        {reports.map(report => {
          const key = String(report.publisherId ?? 'all')
          const open = expanded.has(key)
          const balance = report.totals?.balance ?? 0
          return (
            <div key={key} style={accordionWrapper}>
              <button style={accordionHeader} onClick={() => toggle(key)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#999', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  <span style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '0.95rem' }}>{report.publisherName}</span>
                  <span style={{ fontSize: '0.8rem', color: '#888' }}>{report.customers.length} cliente{report.customers.length !== 1 ? 's' : ''}</span>
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: balance > 0 ? '#c0392b' : balance < 0 ? '#27ae60' : '#888' }}>
                  {fmt(balance)}
                </span>
              </button>

              {open && (
                <div style={{ padding: '0 0 0.5rem' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f8f8', borderBottom: '2px solid #e0e0e0' }}>
                          <th style={th}>Cliente</th>
                          <th style={{ ...th, textAlign: 'right' }}>Ventas</th>
                          <th style={{ ...th, textAlign: 'right' }}>Devoluciones</th>
                          <th style={{ ...th, textAlign: 'right' }}>Pagos</th>
                          <th style={{ ...th, textAlign: 'right' }}>Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.customers.map(row => <SaldosRow key={row.customerId} row={row} />)}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid #e0e0e0', backgroundColor: '#fafafa', fontWeight: 700 }}>
                          <td style={td}>TOTALES</td>
                          <td style={{ ...td, textAlign: 'right' }}>{fmt(report.totals.totalSales)}</td>
                          <td style={{ ...td, textAlign: 'right' }}>{fmt(report.totals.totalReturns)}</td>
                          <td style={{ ...td, textAlign: 'right' }}>{fmt(report.totals.totalPayments)}</td>
                          <SaldoCell value={report.totals.balance} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#aaa', margin: '0.5rem 1rem 0' }}>
                    {selectedPublisherId
                      ? '† Los pagos están prorrateados según la participación de esta editorial en cada remisión.'
                      : '† Los pagos corresponden al total del cliente en todas las editoriales.'}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function SaldosRow({ row }: { row: CustomerReportRow }) {
  return (
    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
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
  const [reports, setReports] = useState<SalesByProductReport[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [pdfLoading, setPdfLoading] = useState(false)

  const load = async (pid: string) => {
    setLoading(true); setError(null)
    try {
      if (pid) {
        const r = await reportService.getSalesByProduct(Number(pid))
        setReports([r])
        setExpanded(new Set([String(r.publisherId ?? 'all')]))
      } else {
        const results = await Promise.all(publishers.map(p => reportService.getSalesByProduct(p.id)))
        const filtered = results.filter(r => r.rows.length > 0)
        setReports(filtered)
        setExpanded(new Set(filtered.map(r => String(r.publisherId ?? 'all'))))
      }
    } catch {
      setError('No se pudo generar el reporte.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (publishers.length > 0) load(selectedPublisherId)
  }, [publishers])

  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const handleFilter = (pid: string) => {
    setSelectedPublisherId(pid)
    if (publishers.length > 0) load(pid)
  }

  const downloadExcel = () => {
    const rows = reports.flatMap(report => [
      ...report.rows.map(row => {
        const obj: Record<string, unknown> = { 'Editorial': report.publisherName, 'Cliente': row.customerName }
        report.products.forEach((p, i) => { obj[p.productName] = row.quantities[i] ?? 0 })
        obj['Total'] = row.totalQuantity
        return obj
      }),
      (() => {
        const obj: Record<string, unknown> = { 'Editorial': report.publisherName, 'Cliente': 'TOTALES' }
        report.products.forEach((p, i) => { obj[p.productName] = report.productTotals[i] ?? 0 })
        obj['Total'] = report.grandTotal
        return obj
      })(),
    ])
    exportToExcel(rows, 'cantidades-por-producto')
  }

  const downloadPdf = async () => {
    setPdfLoading(true)
    try {
      const publisherName = publishers.find(p => String(p.id) === selectedPublisherId)?.name ?? ''
      const [{ pdf }, { CantidadesReportePdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../componentes/CantidadesReportePdf'),
      ])
      const blob = await pdf(
        <CantidadesReportePdf reports={reports} filtroEditorial={publisherName} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'cantidades-por-producto.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <>
      <div style={filterBar}>
        <label style={labelStyle}>Editorial</label>
        <select style={selectStyle} value={selectedPublisherId} onChange={e => handleFilter(e.target.value)}>
          <option value="">Todas las editoriales</option>
          {publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button style={btnExcelReport} onClick={downloadExcel} disabled={loading || reports.length === 0}>Descargar Excel</button>
        <button style={btnPdf} onClick={downloadPdf} disabled={loading || pdfLoading || reports.length === 0}>
          {pdfLoading ? 'Generando...' : 'Descargar PDF'}
        </button>
        {loading && <span style={{ fontSize: '0.85rem', color: '#888' }}>Cargando...</span>}
      </div>

      {error && <p style={{ color: '#c0392b', marginTop: '1rem' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
        {reports.map(report => {
          const key = String(report.publisherId ?? 'all')
          const open = expanded.has(key)
          return (
            <div key={key} style={accordionWrapper}>
              <button style={accordionHeader} onClick={() => toggle(key)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#999', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  <span style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '0.95rem' }}>{report.publisherName}</span>
                  <span style={{ fontSize: '0.8rem', color: '#888' }}>{report.products.length} producto{report.products.length !== 1 ? 's' : ''}</span>
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1a2e' }}>
                  {report.grandTotal} uds.
                </span>
              </button>

              {open && (
                <div style={{ padding: '0 0 0.5rem' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f8f8', borderBottom: '2px solid #e0e0e0' }}>
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
                          <tr key={row.customerId} style={{ borderBottom: '1px solid #f0f0f0' }}>
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
                        <tr style={{ borderTop: '2px solid #e0e0e0', backgroundColor: '#fafafa', fontWeight: 700 }}>
                          <td style={td}>TOTALES</td>
                          {report.productTotals.map((t, i) => (
                            <td key={i} style={{ ...td, textAlign: 'center' }}>{t}</td>
                          ))}
                          <td style={{ ...td, textAlign: 'center' }}>{report.grandTotal}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

const tabBar: React.CSSProperties = { display: 'flex', borderBottom: '1px solid #e0e0e0', marginBottom: '1.5rem' }
const filterBar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }
const labelStyle: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 600, color: '#555' }
const selectStyle: React.CSSProperties = { padding: '0.45rem 0.6rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', minWidth: 220, backgroundColor: '#fff' }
const btnPdf: React.CSSProperties = { padding: '0.45rem 1.1rem', backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap' }
const btnExcelReport: React.CSSProperties = { padding: '0.45rem 1.1rem', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap' }
const accordionWrapper: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e8e8e8', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
const accordionHeader: React.CSSProperties = { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }
const th: React.CSSProperties = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.03em' }
const td: React.CSSProperties = { padding: '0.65rem 1rem', fontSize: '0.9rem' }
