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
import { productService, type ProductDto, type CreateProductDto, type UpdateProductDto } from '../servicios/productosServicio'
import { ProductForm } from '../componentes/ProductoFormulario'
import { exportToExcel } from '../utils/exportarExcel'

export function ProductsPage() {
  const [products, setProducts] = useState<ProductDto[]>([])
  const [selected, setSelected] = useState<ProductDto | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try { setProducts(await productService.getAll()) }
    catch { setError('No se pudieron cargar los productos. Verificá la conexión con el servidor.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const downloadExcel = () => {
    exportToExcel(
      products.map(p => ({
        'Nombre': p.name,
        'Editorial': p.publisherName ?? '',
        'Estado': p.isActive ? 'Activo' : 'Inactivo',
      })),
      'productos'
    )
  }

  const openNew = () => { setSelected(null); setShowModal(true) }
  const openEdit = (p: ProductDto) => { setSelected(p); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setSelected(null) }

  const save = async (data: CreateProductDto | UpdateProductDto) => {
    if (selected) await productService.update(selected.id, data as UpdateProductDto)
    else await productService.create(data as CreateProductDto)
    closeModal()
    await load()
  }

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar este producto?')) return
    await productService.delete(id)
    await load()
  }

  const columns = useMemo<ColumnDef<ProductDto>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Nombre',
    },
    {
      accessorKey: 'publisherName',
      header: 'Editorial',
      cell: info => info.getValue() ?? '—',
    },
    {
      accessorKey: 'isActive',
      header: 'Estado',
      cell: info => (
        <span style={{
          padding: '0.2rem 0.6rem',
          borderRadius: '12px',
          fontSize: '0.8rem',
          fontWeight: 600,
          backgroundColor: info.getValue() ? '#d4edda' : '#f8d7da',
          color: info.getValue() ? '#155724' : '#721c24',
        }}>
          {info.getValue() ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      id: 'acciones',
      header: 'Acciones',
      enableSorting: false,
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button style={btnEdit} onClick={() => openEdit(row.original)}>Editar</button>
          <button style={btnDelete} onClick={() => remove(row.original.id)}>Eliminar</button>
        </div>
      ),
    },
  ], [])

  const table = useReactTable({
    data: products,
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
      <h4 style={{ color: '#1a1a2e', marginBottom: '1.25rem', fontWeight: 700 }}>Productos</h4>

      {error && <p style={{ color: '#c0392b', marginBottom: '1rem' }}>{error}</p>}

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        {/* Toolbar */}
        <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
          <input
            style={searchInput}
            placeholder="Buscar productos..."
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
          />
          <button style={btnExcel} onClick={downloadExcel} disabled={loading || products.length === 0}>Descargar Excel</button>
          <button style={btnPrimary} onClick={openNew}>+ Nuevo producto</button>
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
                        No hay productos registrados.
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

            {/* Pagination */}
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
                Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()} — {table.getFilteredRowModel().rows.length} producto(s)
              </span>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button style={btnPage} onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>← Anterior</button>
                <button style={btnPage} onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente →</button>
              </div>
            </div>
          </>
        )}
      </div>

      <ProductForm
        show={showModal}
        product={selected}
        onSave={save}
        onClose={closeModal}
      />
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 700, borderBottom: '2px solid #ddd' }
const tdStyle: React.CSSProperties = { padding: '0.65rem 1rem', fontSize: '0.9rem' }
const searchInput: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.95rem', minWidth: '220px', flex: 1, maxWidth: '360px' }
const btnPrimary: React.CSSProperties = { padding: '0.6rem 1.25rem', backgroundColor: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem', whiteSpace: 'nowrap' }
const btnEdit: React.CSSProperties = { padding: '0.3rem 0.75rem', backgroundColor: '#2980b9', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.85rem' }
const btnDelete: React.CSSProperties = { padding: '0.3rem 0.75rem', backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.85rem' }
const btnPage: React.CSSProperties = { padding: '0.35rem 0.75rem', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }
const btnExcel: React.CSSProperties = { padding: '0.6rem 1.25rem', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem', whiteSpace: 'nowrap' }
