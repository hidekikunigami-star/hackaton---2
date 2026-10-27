import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Compass, LogOut, Menu, Newspaper, Skull, Target, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

function routeLabel(path: string): string {
  if (path.startsWith('/wanted')) return 'SE BUSCA'
  if (path.startsWith('/news')) return 'NEWS COO'
  if (path.startsWith('/sagas')) return 'PONEGLYPH'
  return 'PUENTE DE MANDO'
}

export function Layout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileNav, setMobileNav] = useState(false)

  // Cerrar el menú móvil al cambiar de ruta.
  useEffect(() => { setMobileNav(false) }, [location.pathname])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`} aria-label="Navegación principal">
        <Link to="/" className="brand">
          <span className="brand-mark"><Compass size={25} /></span>
          <span><strong>LOG POSE</strong><small>BOUNTY GUILD</small></span>
        </Link>
        <div className="crew-chip">
          <span className="crew-avatar"><Skull size={20} /></span>
          <span><b>{session?.team.name ?? 'Tripulación'}</b><small>{session?.team.code ?? ''}</small></span>
          <span className="online-dot" />
        </div>
        <p className="nav-label">TU RUTA</p>
        <nav className="main-nav">
          <NavLink to="/" end><Compass size={18} /> Puente de mando</NavLink>
          <NavLink to="/wanted"><Target size={18} /> Se busca</NavLink>
          <NavLink to="/news"><Newspaper size={18} /> News Coo</NavLink>
          <NavLink to="/sagas"><BookOpen size={18} /> Poneglyph</NavLink>
        </nav>
        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={handleLogout}><LogOut size={16} /> Cerrar sesión</button>
        </div>
      </aside>
      {mobileNav && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setMobileNav(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileNav((v) => !v)} aria-label={mobileNav ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileNav}>
            {mobileNav ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="breadcrumb"><span>GRAND LINE</span><span className="crumb-slash">/</span><b>{routeLabel(location.pathname)}</b></div>
          <div className="top-actions">
            <div className="top-avatar" title={session?.user.email}>{(session?.team.name ?? 'P').slice(0, 1).toUpperCase()}</div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
