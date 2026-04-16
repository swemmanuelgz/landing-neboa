import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import logo from '../../img/logo_neboa.jpg'
import './DashboardLayout.css'

const DashboardLayout = () => {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true'
  )

  const toggleSidebar = () =>
    setCollapsed(c => {
      const next = !c
      localStorage.setItem('sidebarCollapsed', next)
      return next
    })

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navClass = ({ isActive }) =>
    isActive ? 'dash-nav-item dash-nav-item--active' : 'dash-nav-item'

  return (
    <div className={`dash-shell${collapsed ? ' dash-shell--collapsed' : ''}`}>
      <aside className={`dash-sidebar${collapsed ? ' dash-sidebar--collapsed' : ''}`}>
        <div className="dash-brand">
          <img src={logo} alt="Néboa" />
          {!collapsed && <span>Néboa</span>}
          <button
            className="dash-collapse-btn"
            onClick={toggleSidebar}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>
        <nav className="dash-nav">
          <NavLink to="/dashboard/reservas" className={navClass} title="Reservas">
            {collapsed ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ) : 'Reservas'}
          </NavLink>
          <NavLink to="/dashboard/estadisticas" className={navClass} title="Estadísticas">
            {collapsed ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ) : 'Estadísticas'}
          </NavLink>
          <NavLink to="/dashboard/llamadas" className={navClass} title="Llamadas">
            {collapsed ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            ) : 'Llamadas'}
          </NavLink>
          {role !== 'worker' ? (
            <NavLink to="/dashboard/usuarios" className={navClass} title="Usuarios">
              {collapsed ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : 'Usuarios'}
            </NavLink>
          ) : null}
          {role !== 'worker' ? (
            <NavLink to="/dashboard/horarios" className={navClass} title="Horarios">
              {collapsed ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : 'Horarios'}
            </NavLink>
          ) : null}
          {role !== 'worker' ? (
            <NavLink to="/dashboard/dev" className={navClass} title="Dev Settings">
              {collapsed ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" />
                </svg>
              ) : 'Dev'}
            </NavLink>
          ) : null}
        </nav>
        <div className="dash-sidebar-footer">
          {!collapsed && (
            <NavLink to="/dashboard/perfil" className="dash-user-link">
              <span className="dash-user-role">{role}</span>
              <span className="dash-user-email">{user?.email}</span>
              <span className="dash-user-perfil-hint">Perfil</span>
            </NavLink>
          )}
          <button className="dash-signout" onClick={handleSignOut}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="dash-main">
        <Outlet />
      </main>
    </div>
  )
}

export default DashboardLayout
