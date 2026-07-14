import { useState, useEffect, useMemo } from 'react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel, flexRender,
  type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { receivablesService, type CustomerReceivable } from '../servicios/cobranzaServicio'
import { CobranzaClienteModal } from '../componentes/CobranzaClienteModal'

const fmt = (n: number) => `$${n.toFixed(2)}`

export function AccountsReceivablePage() {
  const [rows, setRows] = useState<CustomerReceivable[]>([])
  const [selected, setSelected] = useState<CustomerReceivable | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const load = async () => {
    setLoading(true); setError(null)
    try { setRows(await receivablesService.getAll()) }
    catch { setError('No se pudieron cargar las cuentas por cobrar.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCustomer = (c: CustomerReceivable) => { setSelected(c); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setSelected(null) }
  const onSaved = async () => { await load() }

  const columns = useMemo<ColumnDef<CustomerReceivable>[]>(() => [
    { accessorKey: 'customerName', header: 'Cliente' },
    {
      accessorKey: 'openCount', header: 'Remisiones',
      cell: info => `${info.getValue() as number}`,
    },
    {
      accessorKey: 'totalOutstanding', header: 'Por cobrar',
      cell: info => <span style={{ fontWeight: 600 }}>{fmt(info.getValue() as number)}</span>,
    },
    {
      accessorKey: 'overdueOutstanding', header: 'Vencido',
      cell: info => {
        const v = info.getValue() as number
        return v > 0.01
          ? <span style={overdueChip}>{fmt(v)}</span>
          : <span style={{ color: '#999' }}>—</span>
      },
    },
    {
      accessorKey: 'availableCredit', header: 'Saldo a favor',
      cell: info => {
        const v = info.getValue() as number
        return v > 0.01 ? fmt(v) : <span style={{ color: '#999' }}>—</span>
      },
    },
    {
      id: 'acciones', header: 'Acciones', enableSorting: false,
      cell: ({ row }) => (
        <button style={btnPrimarySm} onClick={() => openCustomer(row.original)}>Ver / Aplicar</button>
      ),
    },
  ], [])

  const table = useReactTable({
    data: rows, columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const grandTotal = rows.reduce((s, r) => s + r.totalOutstanding, 0)

  return (
    <div className="page-content" style={{ padding: '1.5rem 2rem' }}>
      <h4 style={{ color: '#1a1a2e', marginBottom: '1.25rem', fontWeight: 700 }}>Cuentas por cobrar</h4>
      {error && <p style={{ color: '#c0392b', marginBottom: '1rem' }}>{error}</p>}

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
          <input style={searchInput} placeholder="Buscar clientes..." value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} />
          <span style={{ fontSize: '0.95rem', color: '#1a1a2e', fontWeight: 700 }}>Total por cobrar: {fmt(grandTotal)}</span>
        </div>

        {loading ? <p>Cargando...</p> : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id} style={{ backgroundColor: '#f0f0f0' }}>
                      {hg.headers.map(header => (
                        <th key={header.id} style={{ ...thStyle, cursor: header.column.getCanSort() ? 'pointer' : 'default', userSelect: 'none' }} onClick={header.column.getToggleSortingHandler()}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && <span style={{ marginLeft: '0.35rem', color: '#999' }}>{{ asc: '↑', desc: '↓' }[header.column.getIsSorted() as string] ?? '↕'}</span>}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr><td colSpan={columns.length} style={{ ...tdStyle, textAlign: 'center', color: '#888', padding: '2rem' }}>No hay cuentas por cobrar.</td></tr>
                  ) : table.getRowModel().rows.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
                      {row.getVisibleCells().map(cell => <td key={cell.id} style={tdStyle}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#555' }}>Filas por página:</span>
                <select style={{ padding: '0.25rem 0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.875rem' }} value={table.getState().pagination.pageSize} onChange={e => table.setPageSize(Number(e.target.value))}>
                  {[10, 25, 50].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <span style={{ fontSize: '0.875rem', color: '#555' }}>Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()} — {table.getFilteredRowModel().rows.length} cliente(s)</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button style={btnPage} onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>← Anterior</button>
                <button style={btnPage} onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente →</button>
              </div>
            </div>
          </>
        )}
      </div>

      <CobranzaClienteModal show={showModal} customer={selected} onClose={closeModal} onSaved={onSaved} />
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 700, borderBottom: '2px solid #ddd' }
const tdStyle: React.CSSProperties = { padding: '0.65rem 1rem', fontSize: '0.9rem' }
const searchInput: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.95rem', minWidth: '220px', flex: 1, maxWidth: '360px' }
const overdueChip: React.CSSProperties = { padding: '0.1rem 0.5rem', borderRadius: 10, fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#f8d7da', color: '#721c24' }
const btnPrimarySm: React.CSSProperties = { padding: '0.35rem 0.85rem', backgroundColor: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }
const btnPage: React.CSSProperties = { padding: '0.35rem 0.75rem', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }
