import { useState, useEffect, useMemo } from 'react'
import { Modal, Button } from 'react-bootstrap'
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
import { BsPencilSquare, BsTrash, BsKey } from 'react-icons/bs'
import { userService, type UserDto, type CreateUserDto, type UpdateUserDto, type PermissionMatrixDto } from '../servicios/usuariosServicio'
import { UserForm } from '../componentes/UsuarioFormulario'
import { ChangePasswordModal } from '../componentes/CambiarContrasenaModal'
import { PermissionMatrix } from '../componentes/MatrizPermisos'
import { useAuth } from '../contextos/AuthContexto'
import { roleLabel } from '../contextos/permisos'
import { errorMessage } from '../utils/errores'

// Solo llega aquí quien tiene users.manage, o sea el super administrador: la ruta y el ítem del
// menú ya filtraron al resto.
export function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserDto[]>([])
  const [matrix, setMatrix] = useState<PermissionMatrixDto | null>(null)
  const [selected, setSelected] = useState<UserDto | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [toChangePassword, setToChangePassword] = useState<UserDto | null>(null)
  const [toDeactivate, setToDeactivate] = useState<UserDto | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try { setUsers(await userService.getAll()) }
    catch { setError('No se pudieron cargar los usuarios. Verificá la conexión con el servidor.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Los roles asignables y lo que puede cada uno los dicta el backend: si mañana aparece un rol
  // nuevo, esta pantalla lo ofrece en el selector y lo documenta en la matriz sin tocarla.
  useEffect(() => { userService.getPermissionMatrix().then(setMatrix).catch(() => setMatrix(null)) }, [])

  const openNew = () => { setSelected(null); setShowModal(true) }
  const openEdit = (u: UserDto) => { setSelected(u); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setSelected(null) }

  const save = async (data: CreateUserDto | UpdateUserDto) => {
    if (selected) await userService.update(selected.id, data as UpdateUserDto)
    else await userService.create(data as CreateUserDto)
    closeModal()
    await load()
  }

  const savePassword = async (newPassword: string) => {
    if (!toChangePassword) return
    await userService.changePassword(toChangePassword.id, { newPassword })
    setToChangePassword(null)
  }

  const deactivate = async () => {
    if (!toDeactivate) return
    setDeactivating(true)
    setError(null)
    try {
      await userService.delete(toDeactivate.id)
      setToDeactivate(null)
      await load()
    } catch (err) {
      setError(errorMessage(err, 'No se pudo desactivar el usuario.'))
      setToDeactivate(null)
    } finally {
      setDeactivating(false)
    }
  }

  const columns = useMemo<ColumnDef<UserDto>[]>(() => [
    {
      accessorKey: 'username',
      header: 'Usuario',
    },
    {
      accessorKey: 'fullName',
      header: 'Nombre',
    },
    {
      accessorKey: 'role',
      header: 'Rol',
      cell: info => roleLabel(info.getValue() as string),
    },
    {
      accessorKey: 'createdAt',
      header: 'Alta',
      cell: info => new Date(info.getValue() as string).toLocaleDateString('es-MX'),
    },
    {
      id: 'acciones',
      header: 'Acciones',
      enableSorting: false,
      cell: ({ row }) => {
        // Desactivarse a sí mismo dejaría la sesión abierta contra un usuario que ya no puede
        // entrar. El backend lo rechaza igual; aquí solo se evita ofrecerlo.
        const isSelf = row.original.username === currentUser?.username
        return (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button style={btnEdit} title="Editar" onClick={() => openEdit(row.original)}><BsPencilSquare size={15} /></button>
            <button style={btnKey} title="Cambiar contraseña" onClick={() => setToChangePassword(row.original)}><BsKey size={15} /></button>
            <button
              style={{ ...btnDelete, ...(isSelf ? btnDisabled : null) }}
              title={isSelf ? 'No puedes desactivar tu propio usuario' : 'Desactivar'}
              disabled={isSelf}
              onClick={() => setToDeactivate(row.original)}
            >
              <BsTrash size={15} />
            </button>
          </div>
        )
      },
    },
  ], [currentUser])

  const table = useReactTable({
    data: users,
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
      <h4 style={{ color: '#1a1a2e', marginBottom: '1.25rem', fontWeight: 700 }}>Usuarios</h4>

      {error && <p style={{ color: '#c0392b', marginBottom: '1rem' }}>{error}</p>}

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        {/* Toolbar */}
        <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
          <input
            style={searchInput}
            placeholder="Buscar usuarios..."
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
          />
          <button style={btnPrimary} onClick={openNew}>+ Nuevo usuario</button>
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
                        No hay usuarios registrados.
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
                Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()} — {table.getFilteredRowModel().rows.length} usuario(s)
              </span>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button style={btnPage} onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>← Anterior</button>
                <button style={btnPage} onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente →</button>
              </div>
            </div>
          </>
        )}
      </div>

      <PermissionMatrix matrix={matrix} />

      <UserForm
        show={showModal}
        user={selected}
        roles={matrix?.roles ?? []}
        onSave={save}
        onClose={closeModal}
      />

      <ChangePasswordModal
        show={toChangePassword !== null}
        user={toChangePassword}
        onSave={savePassword}
        onClose={() => setToChangePassword(null)}
      />

      {/* Un usuario no borra en cascada nada: se desactiva y deja de poder entrar. Por eso no usa
          ConfirmarBorradoModal, que existe para explicar el impacto de una cascada. */}
      <Modal show={toDeactivate !== null} onHide={() => setToDeactivate(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>¿Desactivar este usuario?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            <strong>{toDeactivate?.fullName}</strong> ({toDeactivate?.username}) dejará de poder
            iniciar sesión.
          </p>
          <p className="mb-0 text-muted small">
            Los documentos que capturó no se modifican.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setToDeactivate(null)} disabled={deactivating}>Cancelar</Button>
          <Button variant="danger" onClick={deactivate} disabled={deactivating}>
            {deactivating ? 'Desactivando…' : 'Desactivar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 700, borderBottom: '2px solid #ddd' }
const tdStyle: React.CSSProperties = { padding: '0.65rem 1rem', fontSize: '0.9rem' }
const searchInput: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.95rem', minWidth: '220px', flex: 1, maxWidth: '360px' }
const btnPrimary: React.CSSProperties = { padding: '0.6rem 1.25rem', backgroundColor: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem', whiteSpace: 'nowrap' }
const iconBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.35rem 0.5rem', borderRadius: '3px', cursor: 'pointer', fontSize: '0.85rem' } as const
const btnEdit: React.CSSProperties = { ...iconBtn, backgroundColor: '#2980b9', color: '#fff', border: 'none' }
const btnKey: React.CSSProperties = { ...iconBtn, backgroundColor: '#7f8c8d', color: '#fff', border: 'none' }
const btnDelete: React.CSSProperties = { ...iconBtn, backgroundColor: '#c0392b', color: '#fff', border: 'none' }
const btnDisabled: React.CSSProperties = { opacity: 0.4, cursor: 'not-allowed' }
const btnPage: React.CSSProperties = { padding: '0.35rem 0.75rem', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }
