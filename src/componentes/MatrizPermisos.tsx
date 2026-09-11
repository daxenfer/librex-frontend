import { describePermission, roleLabel } from '../contextos/permisos'
import type { PermissionMatrixDto } from '../servicios/usuariosServicio'

interface Props {
  matrix: PermissionMatrixDto | null
}

// Referencia de solo lectura de qué puede hacer cada rol. La matriz está compilada en el backend
// (Librex.Domain/Constants/Permissions.cs), así que aquí no hay nada que editar: cambiar un
// permiso de rol requiere tocar ese archivo y recompilar.
export function PermissionMatrix({ matrix }: Props) {
  if (!matrix || matrix.permissions.length === 0) return null

  const has = (role: string, permission: string) => (matrix.grants[role] ?? []).includes(permission)

  // El backend manda los permisos agrupados por acción (todos los de escritura, luego los de
  // borrado). Para leerlos conviene lo contrario, así que se reagrupan por módulo; el Map
  // conserva el orden de primera aparición, que ya viene de mayor a menor uso.
  const byModule = new Map<string, string[]>()
  for (const permission of matrix.permissions) {
    const key = permission.split('.')[0]
    const group = byModule.get(key)
    if (group) group.push(permission)
    else byModule.set(key, [permission])
  }

  return (
    <div style={card}>
      <h5 style={title}>Permisos por rol</h5>
      <p style={subtitle}>
        Referencia de solo lectura. Los permisos de cada rol están definidos en el código del
        servidor y no se editan desde aquí.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ ...thStyle, minWidth: '130px' }}>Módulo</th>
              <th style={thStyle}>Acción</th>
              {matrix.roles.map(role => (
                <th key={role} style={{ ...thStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {roleLabel(role)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...byModule.values()].map(permissions =>
              permissions.map((permission, i) => (
                <tr key={permission} style={{ borderBottom: '1px solid #eee' }}>
                  {i === 0 && (
                    <td rowSpan={permissions.length} style={tdModule}>
                      {describePermission(permission).module}
                    </td>
                  )}
                  <td style={tdStyle}>{describePermission(permission).action}</td>
                  {matrix.roles.map(role => (
                    <td key={role} style={tdCheck}>
                      {has(role, permission)
                        ? <span style={{ color: '#27ae60', fontWeight: 700 }} title="Permitido">✓</span>
                        : <span style={{ color: '#ccc' }} title="No permitido">—</span>}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p style={footnote}>
        Consultar y exportar no requiere permiso: cualquier usuario que inicie sesión puede ver
        todas las pantallas e imprimir sus PDFs. La tabla solo describe lo que se puede modificar.
      </p>
    </div>
  )
}

const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginTop: '1.5rem' }
const title: React.CSSProperties = { color: '#1a1a2e', fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }
const subtitle: React.CSSProperties = { color: '#777', fontSize: '0.85rem', marginBottom: '1rem' }
const thStyle: React.CSSProperties = { padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, borderBottom: '2px solid #ddd' }
const tdStyle: React.CSSProperties = { padding: '0.5rem 1rem', fontSize: '0.875rem' }
const tdModule: React.CSSProperties = { ...tdStyle, fontWeight: 600, color: '#1a1a2e', verticalAlign: 'middle', borderRight: '1px solid #eee' }
const tdCheck: React.CSSProperties = { ...tdStyle, textAlign: 'center', fontSize: '1rem' }
const footnote: React.CSSProperties = { color: '#888', fontSize: '0.8rem', marginTop: '0.9rem', marginBottom: 0 }
