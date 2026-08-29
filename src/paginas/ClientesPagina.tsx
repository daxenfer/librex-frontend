import { useState, useEffect, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { BsPencilSquare, BsTrash } from 'react-icons/bs'
import { customerService, type CustomerDto, type CreateCustomerDto, type UpdateCustomerDto } from '../servicios/clientesServicio'
import { CustomerForm } from '../componentes/ClienteFormulario'
import { exportToExcel } from '../utils/exportarExcel'
import { ConfirmDeleteModal } from '../componentes/ConfirmarBorradoModal'

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerDto[]>([])
  const [selected, setSelected] = useState<CustomerDto | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<number | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try { setCustomers(await customerService.getAll()) }
    catch { setError('No se pudieron cargar los clientes. Verificá la conexión con el servidor.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const downloadExcel = () => {
    exportToExcel(
      customers.map(c => ({
        'Nombre': c.name,
        'Contacto': c.contact ?? '',
        'Dirección': c.address ?? '',
        'C.P.': c.postalCode ?? '',
        'Teléfono': c.phone ?? '',
        'Ciudad': c.city ?? '',
      })),
      'clientes'
    )
  }

  const openNew = () => { setSelected(null); setShowModal(true) }
  const openEdit = (c: CustomerDto) => { setSelected(c); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setSelected(null) }

  const save = async (data: CreateCustomerDto | UpdateCustomerDto) => {
    if (selected) await customerService.update(selected.id, data as UpdateCustomerDto)
    else await customerService.create(data as CreateCustomerDto)
    closeModal()
    await load()
  }

  const remove = (id: number) => setToDelete(id)

  const columns = useMemo<ColumnDef<CustomerDto>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Nombre',
    },
    {
      accessorKey: 'contact',
      header: 'Contacto',
      cell: info => (info.getValue() as string) || '—',
    },
    {
      id: 'acciones',
      header: 'Acciones',
      enableSorting: false,
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button style={btnEdit} title="Editar" onClick={() => openEdit(row.original)}><BsPencilSquare size={15} /></button>
          <button style={btnDelete} title="Eliminar" onClick={() => remove(row.original.id)}><BsTrash size={15} /></button>
        </div>
      ),
    },
  ], [])

  const table = useReactTable({
    data: customers,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="page-content" style={{ padding: '1.5rem 2rem' }}>
      <h4 style={{ color: '#1a1a2e', marginBottom: '1.25rem', fontWeight: 700 }}>Clientes</h4>

      {error && <p style={{ color: '#c0392b', marginBottom: '1rem' }}>{error}</p>}

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
          <input
            style={searchInput}
            placeholder="Buscar clientes..."
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
          />
          <button style={btnExcel} onClick={downloadExcel} disabled={loading || customers.length === 0}>Descargar Excel</button>
          <button style={btnPrimary} onClick={openNew}>+ Nuevo cliente</button>
        </div>

        {loading ? <p>Cargando...</p> : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id} style={{ backgroundColor: '#f0f0f0' }}>
                      {hg.headers.map(header => (
                        <th
                          key={header.id}
                          style={{ ...thStyle, cursor: header.column.getCanSort() ? 'pointer' : 'default', userSelect: 'none' }}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span style={{ marginLeft: '0.35rem', color: '#999' }}>
                              {{ asc: '↑', desc: '↓' }[header.column.getIsSorted() as string] ?? '↕'}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} style={{ ...tdStyle, textAlign: 'center', color: '#888', padding: '2rem' }}>
                        No hay clientes registrados.
                      </td>
                    </tr>
                  ) : table.getRowModel().rows.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} style={tdStyle}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#555' }}>Filas por página:</span>
                <select
                  style={{ padding: '0.25rem 0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.875rem' }}
                  value={table.getState().pagination.pageSize}
                  onChange={e => table.setPageSize(Number(e.target.value))}
                >
                  {[10, 25, 50].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <span style={{ fontSize: '0.875rem', color: '#555' }}>
                Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()} — {table.getFilteredRowModel().rows.length} cliente(s)
              </span>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button style={btnPage} onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>← Anterior</button>
                <button style={btnPage} onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente →</button>
              </div>
            </div>
          </>
        )}
      </div>

      <CustomerForm
        show={showModal}
        customer={selected}
        onSave={save}
        onClose={closeModal}
      />

      <ConfirmDeleteModal
        show={toDelete !== null}
        id={toDelete}
        title="¿Eliminar este cliente?"
        onImpact={customerService.getDeletionImpact}
        onDelete={customerService.delete}
        onClose={() => setToDelete(null)}
        onDeleted={async () => { setToDelete(null); await load() }}
      />
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 700, borderBottom: '2px solid #ddd' }
const tdStyle: React.CSSProperties = { padding: '0.65rem 1rem', fontSize: '0.9rem' }
const searchInput: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.95rem', minWidth: '220px', flex: 1, maxWidth: '360px' }
const btnPrimary: React.CSSProperties = { padding: '0.6rem 1.25rem', backgroundColor: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem', whiteSpace: 'nowrap' }
const iconBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.35rem 0.5rem', borderRadius: '3px', cursor: 'pointer', fontSize: '0.85rem' } as const
const btnEdit: React.CSSProperties = { ...iconBtn, backgroundColor: '#2980b9', color: '#fff', border: 'none' }
const btnDelete: React.CSSProperties = { ...iconBtn, backgroundColor: '#c0392b', color: '#fff', border: 'none' }
const btnPage: React.CSSProperties = { padding: '0.35rem 0.75rem', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }
const btnExcel: React.CSSProperties = { padding: '0.6rem 1.25rem', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem', whiteSpace: 'nowrap' }
