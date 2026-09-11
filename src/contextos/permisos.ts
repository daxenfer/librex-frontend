// Espejo de Librex.Domain/Constants/Permissions.cs.
//
// Aquí vive solo el TIPO, no la matriz: qué permisos tiene cada rol lo decide el backend y llega
// ya resuelto en la respuesta del login. Tener la lista de nombres en TypeScript es lo que hace
// que un `can('products.delet')` sea un error de compilación y no un botón que nunca aparece.
export type Permission =
  | 'suppliers.write'
  | 'suppliers.delete'
  | 'products.write'
  | 'products.delete'
  | 'customers.write'
  | 'customers.delete'
  | 'remissions.write'
  | 'remissions.delete'
  | 'returns.write'
  | 'returns.delete'
  | 'payments.write'
  | 'payments.delete'
  | 'settings.manage'
  | 'users.manage'

export type Role = 'SuperAdmin' | 'Administrator' | 'User'

export const ROLE_LABELS: Record<Role, string> = {
  SuperAdmin: 'Super administrador',
  Administrator: 'Administrador',
  User: 'Usuario',
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as Role] ?? role
}

// Los permisos viajan como `<módulo>.<acción>`. Estas tablas los vuelven legibles; si el backend
// agrega uno que aquí no está, se muestra crudo en vez de desaparecer de la pantalla.
const MODULE_LABELS: Record<string, string> = {
  suppliers: 'Editoriales',
  products: 'Productos',
  customers: 'Clientes',
  remissions: 'Remisiones',
  returns: 'Devoluciones',
  payments: 'Pagos',
  settings: 'Configuración',
  users: 'Usuarios',
}

const ACTION_LABELS: Record<string, string> = {
  write: 'Crear y editar',
  delete: 'Eliminar',
  manage: 'Administrar',
}

export function describePermission(permission: string): { module: string; action: string } {
  const [module, action] = permission.split('.')
  return {
    module: MODULE_LABELS[module] ?? module,
    action: ACTION_LABELS[action] ?? action,
  }
}
