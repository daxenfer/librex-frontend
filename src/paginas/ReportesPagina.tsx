import { useState, useEffect } from 'react'
import {
  reportService,
  type CustomerReportRow, type SupplierReport,
  type SalesByProductReport, type UnallocatedPaymentsReport,
} from '../servicios/reportesServicio'
import { supplierService, type SupplierDto } from '../servicios/proveedoresServicio'
import { exportToExcel } from '../utils/exportarExcel'

type Tab = 'saldos' | 'cantidades'

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('saldos')
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])

  useEffect(() => {
    supplierService.getAll().then(setSuppliers).catch(() => {})
  }, [])

  return (
    <div className="page-content" style={{ padding: '1.5rem 2rem', maxWidth: 1100 }}>
      <h4 style={{ color: '#1a1a2e', marginBottom: '1.5rem', fontWeight: 700, fontSize: '1.25rem' }}>Reportes</h4>

      <div style={tabBar}>
        <TabButton label="Saldos por cliente" active={activeTab === 'saldos'} onClick={() => setActiveTab('saldos')} />
        <TabButton label="Cantidades por producto" active={activeTab === 'cantidades'} onClick={() => setActiveTab('cantidades')} />
      </div>

      {activeTab === 'saldos' && <SaldosReport suppliers={suppliers} />}
      {activeTab === 'cantidades' && <CantidadesReport suppliers={suppliers} />}
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

function SaldosReport({ suppliers }: { suppliers: SupplierDto[] }) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [reports, setReports] = useState<SupplierReport[]>([])
  const [unallocated, setUnallocated] = useState<UnallocatedPaymentsReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [pdfLoading, setPdfLoading] = useState(false)

  const load = async (pid: string) => {
    setLoading(true); setError(null)
    try {
      const unallocatedPromise = reportService.getUnallocatedPayments()
      if (pid) {
        const r = await reportService.getBySupplier(Number(pid))
        setReports([r])
        setExpanded(new Set([String(r.supplierId ?? 'all'), 'unallocated']))
      } else {
        const results = await Promise.all(suppliers.map(p => reportService.getBySupplier(p.id)))
        const filtered = results.filter(r => r.customers.length > 0)
        setReports(filtered)
        setExpanded(new Set([...filtered.map(r => String(r.supplierId ?? 'all')), 'unallocated']))
      }
      setUnallocated(await unallocatedPromise)
    } catch {
      setError('No se pudo generar el reporte.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (suppliers.length > 0) load(selectedSupplierId)
  }, [suppliers])

  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const handleFilter = (pid: string) => {
    setSelectedSupplierId(pid)
    if (suppliers.length > 0) load(pid)
  }

  const downloadExcel = () => {
    // La hoja junta dos secciones con columnas distintas (saldos y pagos sin asignar),
    // así que las filas son heterogéneas a propósito.
    const rows: Record<string, unknown>[] = reports.flatMap(report => [
      ...report.customers.map(row => ({
        'Proveedor': report.supplierName,
        'Cliente': row.customerName,
        'Ventas': row.totalSales,
        'Devoluciones': row.totalReturns,
        'Pagos': row.totalPayments,
        'Saldo': row.balance,
      })),
      {
        'Proveedor': report.supplierName,
        'Cliente': 'TOTALES',
        'Ventas': report.totals.totalSales,
        'Devoluciones': report.totals.totalReturns,
        'Pagos': report.totals.totalPayments,
        'Saldo': report.totals.balance,
      },
    ])
    if (unallocated && unallocated.rows.length > 0) {
      rows.push(
        ...unallocated.rows.map(row => ({
          'Proveedor': 'PAGOS SIN ASIGNAR',
          'Cliente': row.customerName,
          'Pagos totales': row.totalPayments,
          'Aplicado': row.allocatedAmount,
          'Sin asignar': row.unallocatedAmount,
        })),
        {
          'Proveedor': 'PAGOS SIN ASIGNAR',
          'Cliente': 'TOTAL SIN ASIGNAR',
          'Sin asignar': unallocated.totalUnallocated,
        },
      )
    }
    exportToExcel(rows, 'saldos-por-cliente')
  }

  const downloadPdf = async () => {
    setPdfLoading(true)
    try {
      const supplierName = suppliers.find(p => String(p.id) === selectedSupplierId)?.name ?? ''
      const [{ pdf }, { SaldosReportePdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../componentes/SaldosReportePdf'),
      ])
      const blob = await pdf(
        <SaldosReportePdf reports={reports} filtroProveedor={supplierName} unallocated={unallocated ?? undefined} />
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
        <label style={labelStyle}>Proveedor</label>
        <select style={selectStyle} value={selectedSupplierId} onChange={e => handleFilter(e.target.value)}>
          <option value="">Todos los proveedores</option>
          {suppliers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
          const key = String(report.supplierId ?? 'all')
          const open = expanded.has(key)
          const balance = report.totals?.balance ?? 0
          return (
            <div key={key} style={accordionWrapper}>
              <button style={accordionHeader} onClick={() => toggle(key)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#999', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  <span style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '0.95rem' }}>{report.supplierName}</span>
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
                    {selectedSupplierId
                      ? '† Los pagos están prorrateados según la participación de esta proveedor en cada remisión.'
                      : '† Los pagos corresponden al total del cliente en todas las proveedores.'}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {unallocated && unallocated.rows.length > 0 && (() => {
          const open = expanded.has('unallocated')
          return (
            <div style={accordionWrapper}>
              <button style={accordionHeader} onClick={() => toggle('unallocated')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#999', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  <span style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '0.95rem' }}>Pagos sin asignar (anticipos)</span>
                  <span style={{ fontSize: '0.8rem', color: '#888' }}>{unallocated.rows.length} cliente{unallocated.rows.length !== 1 ? 's' : ''}</span>
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e67e22' }}>{fmt(unallocated.totalUnallocated)}</span>
              </button>

              {open && (
                <div style={{ padding: '0 0 0.5rem' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f8f8', borderBottom: '2px solid #e0e0e0' }}>
                          <th style={th}>Cliente</th>
                          <th style={{ ...th, textAlign: 'right' }}>Pagos totales</th>
                          <th style={{ ...th, textAlign: 'right' }}>Aplicado</th>
                          <th style={{ ...th, textAlign: 'right' }}>Sin asignar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unallocated.rows.map(row => (
                          <tr key={row.customerId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={td}>{row.customerName}</td>
                            <td style={{ ...td, textAlign: 'right' }}>{fmt(row.totalPayments)}</td>
                            <td style={{ ...td, textAlign: 'right' }}>{fmt(row.allocatedAmount)}</td>
                            <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: '#e67e22' }}>{fmt(row.unallocatedAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid #e0e0e0', backgroundColor: '#fafafa', fontWeight: 700 }}>
                          <td style={td}>TOTAL</td>
                          <td style={{ ...td, textAlign: 'right' }} />
                          <td style={{ ...td, textAlign: 'right' }} />
                          <td style={{ ...td, textAlign: 'right', color: '#e67e22' }}>{fmt(unallocated.totalUnallocated)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#aaa', margin: '0.5rem 1rem 0' }}>
                    † Estos montos no son atribuibles a ningún proveedor hasta que se apliquen a remisiones (en Cuentas por Cobrar o al editar el pago).
                  </p>
                </div>
              )}
            </div>
          )
        })()}
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

function CantidadesReport({ suppliers }: { suppliers: SupplierDto[] }) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
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
        setExpanded(new Set([String(r.supplierId ?? 'all')]))
      } else {
        const results = await Promise.all(suppliers.map(p => reportService.getSalesByProduct(p.id)))
        const filtered = results.filter(r => r.rows.length > 0)
        setReports(filtered)
        setExpanded(new Set(filtered.map(r => String(r.supplierId ?? 'all'))))
      }
    } catch {
      setError('No se pudo generar el reporte.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (suppliers.length > 0) load(selectedSupplierId)
  }, [suppliers])

  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const handleFilter = (pid: string) => {
    setSelectedSupplierId(pid)
    if (suppliers.length > 0) load(pid)
  }

  const downloadExcel = () => {
    const rows = reports.flatMap(report => [
      ...report.rows.map(row => {
        const obj: Record<string, unknown> = { 'Proveedor': report.supplierName, 'Cliente': row.customerName }
        report.products.forEach((p, i) => {
          obj[`${p.productName} (vend.)`] = row.quantitiesSold[i] ?? 0
          obj[`${p.productName} (dev.)`] = row.quantitiesReturned[i] ?? 0
        })
        obj['Total vend.'] = row.totalSold
        obj['Total dev.'] = row.totalReturned
        return obj
      }),
      (() => {
        const obj: Record<string, unknown> = { 'Proveedor': report.supplierName, 'Cliente': 'TOTALES' }
        report.products.forEach((p, i) => {
          obj[`${p.productName} (vend.)`] = report.productTotalsSold[i] ?? 0
          obj[`${p.productName} (dev.)`] = report.productTotalsReturned[i] ?? 0
        })
        obj['Total vend.'] = report.grandTotalSold
        obj['Total dev.'] = report.grandTotalReturned
        return obj
      })(),
    ])
    exportToExcel(rows, 'cantidades-por-producto')
  }

  const downloadPdf = async () => {
    setPdfLoading(true)
    try {
      const supplierName = suppliers.find(p => String(p.id) === selectedSupplierId)?.name ?? ''
      const [{ pdf }, { CantidadesReportePdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../componentes/CantidadesReportePdf'),
      ])
      const blob = await pdf(
        <CantidadesReportePdf reports={reports} filtroProveedor={supplierName} />
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
        <label style={labelStyle}>Proveedor</label>
        <select style={selectStyle} value={selectedSupplierId} onChange={e => handleFilter(e.target.value)}>
          <option value="">Todos los proveedores</option>
          {suppliers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button style={btnExcelReport} onClick={downloadExcel} disabled={loading || reports.length === 0}>Descargar Excel</button>
        <button style={btnPdf} onClick={downloadPdf} disabled={loading || pdfLoading || reports.length === 0}>
          {pdfLoading ? 'Generando...' : 'Descargar PDF'}
        </button>
        {loading && <span style={{ fontSize: '0.85rem', color: '#888' }}>Cargando...</span>}
      </div>

      {error && <p style={{ color: '#c0392b', marginTop: '1rem' }}>{error}</p>}

      {reports.length > 0 && (
        <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '1rem' }}>
          Cantidad vendida · <span style={{ color: '#c0392b' }}>−devuelta</span> (en rojo).
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
        {reports.map(report => {
          const key = String(report.supplierId ?? 'all')
          const open = expanded.has(key)
          return (
            <div key={key} style={accordionWrapper}>
              <button style={accordionHeader} onClick={() => toggle(key)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#999', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  <span style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '0.95rem' }}>{report.supplierName}</span>
                  <span style={{ fontSize: '0.8rem', color: '#888' }}>{report.products.length} producto{report.products.length !== 1 ? 's' : ''}</span>
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1a2e' }}>
                  {report.grandTotalSold} vend.
                  {report.grandTotalReturned > 0 && <span style={{ color: '#c0392b', marginLeft: '0.5rem' }}>{report.grandTotalReturned} dev.</span>}
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
                            {report.products.map((_, i) => (
                              <td key={i} style={{ ...td, textAlign: 'center' }}>
                                <QtyCell sold={row.quantitiesSold[i]} returned={row.quantitiesReturned[i]} />
                              </td>
                            ))}
                            <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>
                              <QtyCell sold={row.totalSold} returned={row.totalReturned} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid #e0e0e0', backgroundColor: '#fafafa', fontWeight: 700 }}>
                          <td style={td}>TOTALES</td>
                          {report.products.map((_, i) => (
                            <td key={i} style={{ ...td, textAlign: 'center' }}>
                              <QtyCell sold={report.productTotalsSold[i]} returned={report.productTotalsReturned[i]} />
                            </td>
                          ))}
                          <td style={{ ...td, textAlign: 'center' }}>
                            <QtyCell sold={report.grandTotalSold} returned={report.grandTotalReturned} />
                          </td>
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

// Muestra vendido y, si hubo, devuelto (en rojo). Vendido y devuelto van por separado: nunca se
// netean, así que un producto se ve aunque se haya devuelto más de lo vendido.
function QtyCell({ sold, returned }: { sold: number; returned: number }) {
  if (sold === 0 && returned === 0) return <span style={{ color: '#ccc' }}>—</span>
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.25 }}>
      <span style={{ color: sold === 0 ? '#ccc' : undefined }}>{sold}</span>
      {returned > 0 && <span style={{ color: '#c0392b', fontSize: '0.78rem', fontWeight: 400 }}>−{returned}</span>}
    </span>
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
