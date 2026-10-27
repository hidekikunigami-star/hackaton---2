import { Navigate, Outlet, useLocation, type Location } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useAuth } from './AuthContext'

export function BootScreen() {
  const { status, retryCheck, logout } = useAuth()
  if (status === 'error') {
    return (
      <div className="boot-screen" role="alert">
        <div className="brand-mark"><Compass size={30} /></div>
        <p>No pudimos verificar tu sesión con el servidor.</p>
        <div className="boot-actions">
          <button className="primary-btn" onClick={retryCheck}>Reintentar</button>
          <button className="secondary-btn" onClick={logout}>Ir al login</button>
        </div>
      </div>
    )
  }
  return (
    <div className="boot-screen" aria-busy="true">
      <div className="brand-mark"><Compass size={30} /></div>
      <p>Consultando el Log Pose…</p>
      <div className="loading-line" />
    </div>
  )
}

interface FromState { from?: Location }

function destinationFrom(state: unknown): string {
  const from = (state as FromState | null)?.from
  if (!from || from.pathname === '/login' || from.pathname === '/register') return '/'
  return `${from.pathname}${from.search}${from.hash}`
}

// Rutas privadas: sin sesión se va al login, guardando la ubicación completa (path + query + hash).
export function PrivateRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'checking' || status === 'error') return <BootScreen />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

// Login y registro: si ya hay sesión (o se acaba de iniciar), se vuelve a donde el usuario quería ir.
export function PublicOnlyRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'checking' || status === 'error') return <BootScreen />
  if (status === 'authenticated') return <Navigate to={destinationFrom(location.state)} replace />
  return <Outlet />
}
