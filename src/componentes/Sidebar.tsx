import { NavLink } from 'react-router-dom'
import { useAuth } from '../contextos/AuthContexto'
import { useNavigate } from 'react-router-dom'
import './sidebar.css'

interface NavItem {
  path: string
  label: string
  icon: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Catálogos',
    items: [
      { path: '/products',   label: 'Productos',   icon: '📦' },
      { path: '/publishers', label: 'Editoriales', icon: '🏢' },
      { path: '/customers',  label: 'Clientes',    icon: '👥' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { path: '/remissions', label: 'Remisiones',   icon: '📄' },
      { path: '/returns',    label: 'Devoluciones', icon: '↩️' },
      { path: '/payments',   label: 'Pagos',        icon: '💳' },
    ],
  },
  {
    label: 'Reportes',
    items: [
      { path: '/reports', label: 'Reportes', icon: '📊' },
    ],
  },
]

const comingSoonItems = [
  { label: 'Punto de Venta',    icon: '🛒' },
  { label: 'Órdenes de Compra', icon: '📋' },
]

interface Props {
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onCloseMobile: () => void
}

export function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const signOut = () => { logout(); navigate('/login', { replace: true }) }

  const sidebarClass = [
    'sidebar',
    collapsed ? 'collapsed' : '',
    mobileOpen ? 'mobile-open' : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onCloseMobile} />}

      <aside className={sidebarClass}>
        {/* Brand + desktop toggle */}
        <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '60px' }}>
          {!collapsed && (
            <span style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              Librex
            </span>
          )}
          <button onClick={onToggleCollapse} style={toggleBtn} title={collapsed ? 'Expandir' : 'Colapsar'}>
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.5rem 0', overflowY: 'auto' }}>
          {navGroups.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <hr className="sidebar-divider" />}
              <div className="sidebar-section-label sidebar-label">{group.label}</div>
              {group.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  title={collapsed ? item.label : undefined}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', padding: '0.7rem 1rem',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                    textDecoration: 'none', fontSize: '0.9rem', gap: '0.6rem',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.12)' : undefined,
                    borderRight: isActive ? '3px solid #4a9eff' : undefined,
                  })}
                >
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                  <span className="sidebar-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}

          {/* Coming soon */}
          <hr className="sidebar-divider" style={{ marginTop: '0.5rem' }} />
          <div className="sidebar-section-label sidebar-label">Próximamente</div>
          {comingSoonItems.map(item => (
            <div
              key={item.label}
              title={collapsed ? item.label : 'Próximamente'}
              style={{ display: 'flex', alignItems: 'center', padding: '0.7rem 1rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.9rem', cursor: 'not-allowed', gap: '0.6rem' }}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {!collapsed && (
            <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.fullName}
            </div>
          )}
          <button
            style={{ ...logoutBtn, justifyContent: collapsed ? 'center' : 'flex-start' }}
            onClick={signOut}
            title={collapsed ? 'Cerrar sesión' : undefined}
          >
            <span>🚪</span>
            {!collapsed && <span style={{ marginLeft: '0.4rem' }}>Cerrar sesión</span>}
          </button>
        </div>
      </aside>
    </>
  )
}

const toggleBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.6)',
  cursor: 'pointer',
  fontSize: '0.75rem',
  padding: '0.25rem 0.4rem',
  borderRadius: '4px',
  marginLeft: 'auto',
}

const logoutBtn: React.CSSProperties = {
  width: '100%',
  padding: '0.4rem 0.5rem',
  backgroundColor: 'transparent',
  color: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.85rem',
  display: 'flex',
  alignItems: 'center',
}
