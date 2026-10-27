import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError, getToken, onUnauthorized, setToken } from '../api/client'
import type { LoginResponse, MeResponse, Team, User } from '../api/types'

// 'checking': hay token guardado y lo estamos validando con /auth/me (no se muestra el login).
// 'error': no pudimos verificar la sesión por un problema de red/servidor (se ofrece reintentar).
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous' | 'error'

interface Session { user: User; team: Team; expiresAt: string }

interface AuthContextValue {
  status: AuthStatus
  session: Session | null
  login: (email: string, password: string) => Promise<void>
  register: (teamName: string, email: string, password: string) => Promise<void>
  logout: () => void
  retryCheck: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => (getToken() ? 'checking' : 'anonymous'))
  const [session, setSession] = useState<Session | null>(null)
  const [checkAttempt, setCheckAttempt] = useState(0)

  const logout = useCallback(() => {
    setToken(null)
    setSession(null)
    setStatus('anonymous')
  }, [])

  // Cualquier 401 de la API (token vencido o revocado) cierra la sesión.
  useEffect(() => onUnauthorized(logout), [logout])

  // Restaurar la sesión al recargar: validar el token guardado con /auth/me.
  useEffect(() => {
    if (!getToken()) return
    const controller = new AbortController()
    setStatus('checking')
    api<MeResponse>('/auth/me', { signal: controller.signal })
      .then((me) => {
        setSession({ user: me.user, team: me.team, expiresAt: me.expiresAt })
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 401) logout()
        else setStatus('error')
      })
    return () => controller.abort()
  }, [checkAttempt, logout])

  // Si el token vence mientras la app está abierta, volvemos al login sin esperar otra request.
  useEffect(() => {
    if (!session) return
    const msLeft = new Date(session.expiresAt).getTime() - Date.now()
    if (Number.isNaN(msLeft)) return
    if (msLeft <= 0) { logout(); return }
    const timer = window.setTimeout(logout, Math.min(msLeft, 2_147_483_647))
    return () => window.clearTimeout(timer)
  }, [session, logout])

  const startSession = useCallback((res: LoginResponse) => {
    setToken(res.token)
    setSession({ user: res.user, team: res.team, expiresAt: res.expiresAt })
    setStatus('authenticated')
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<LoginResponse>('/auth/login', { method: 'POST', body: { email: email.trim(), password } })
    startSession(res)
  }, [startSession])

  // El registro devuelve la sesión ya iniciada (igual que el login): se entra directo a la app.
  const register = useCallback(async (teamName: string, email: string, password: string) => {
    const res = await api<LoginResponse>('/auth/register', { method: 'POST', body: { teamName: teamName.trim(), email: email.trim(), password } })
    startSession(res)
  }, [startSession])

  const retryCheck = useCallback(() => setCheckAttempt((n) => n + 1), [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, login, register, logout, retryCheck }),
    [status, session, login, register, logout, retryCheck],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
