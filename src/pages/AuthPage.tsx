import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Compass, Ship, X } from 'lucide-react'
import { ApiError, errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type Field = 'teamName' | 'email' | 'password'
type FieldErrors = Partial<Record<Field, string>>

// Traduce el error del servidor a errores por campo (para mostrarlos junto al input que corresponde).
function toFieldErrors(error: ApiError): { fields: FieldErrors; general: string } {
  const fields: FieldErrors = {}
  if (error.code === 'EMAIL_ALREADY_REGISTERED') fields.email = error.message
  if (error.code === 'TEAM_NAME_TAKEN') fields.teamName = error.message
  for (const detail of error.details) {
    const key = detail.field.split('.').pop()
    if (key === 'teamName' || key === 'email' || key === 'password') fields[key] = detail.message
  }
  const general = Object.keys(fields).length > 0 ? '' : error.message
  return { fields, general }
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register'
  const { login, register } = useAuth()
  const location = useLocation()
  const [teamName, setTeamName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setFieldErrors({})
    setGeneralError('')
    try {
      if (isRegister) await register(teamName, email, password)
      else await login(email, password)
      // No navegamos aquí: al quedar autenticados, PublicOnlyRoute redirige a la ruta guardada en `from`.
    } catch (error) {
      if (error instanceof ApiError) {
        const { fields, general } = toFieldErrors(error)
        setFieldErrors(fields)
        setGeneralError(general)
      } else {
        setGeneralError(errorMessage(error))
      }
      setBusy(false)
    }
  }

  function clearField(field: Field) {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  return (
    <div className="auth-layout">
      <div className="auth-art" aria-hidden="true">
        <div className="auth-art-grid" />
        <div className="auth-topline"><span><Compass size={18} /> LOG POSE CONSOLE</span><span>EST. GRAND LINE</span></div>
        <div className="auth-illustration">
          <div className="sun-disc" /><div className="sea-ring ring-one" /><div className="sea-ring ring-two" />
          <div className="auth-compass"><Compass size={116} strokeWidth={0.8} /></div>
          <div className="island island-one" /><div className="island island-two" />
          <div className="ship-silhouette"><Ship size={100} strokeWidth={1} /></div>
        </div>
        <div className="auth-hero-copy">
          <p className="eyebrow">LA AVENTURA COMIENZA AQUÍ</p>
          <h1>Tu rumbo.<br /><em>Tu leyenda.</em></h1>
          <p>El Grand Line no espera a nadie. Registra tu tripulación y reclama tu lugar en el mapa.</p>
        </div>
        <div className="auth-foot"><span>01° 52' N — 131° 40' E</span><span>NO MAP. NO MERCY.</span></div>
      </div>
      <div className="auth-panel">
        <div className="auth-mobile-brand"><Compass /> LOG POSE</div>
        <div className="auth-form-wrap">
          <div className="section-kicker"><span className="kicker-line" />{isRegister ? 'NUEVA TRIPULACIÓN' : 'IDENTIFICACIÓN DE TRIPULACIÓN'}</div>
          <h2>{isRegister ? 'Zarpa con nosotros.' : 'Qué bueno verte,'}<br /><span>{isRegister ? 'Crea tu leyenda.' : 'capitán.'}</span></h2>
          <p className="auth-intro">{isRegister ? 'Registra tu tripulación para desbloquear tu consola de navegación.' : 'Ingresa con el email y la contraseña de tu tripulación.'}</p>

          <form onSubmit={submit} className="auth-form" noValidate>
            {isRegister && (
              <label>
                Nombre de la tripulación
                <input
                  value={teamName}
                  onChange={(e) => { setTeamName(e.target.value); clearField('teamName') }}
                  placeholder="Ej. Sabuesos de la Marea"
                  autoComplete="organization"
                  aria-invalid={Boolean(fieldErrors.teamName)}
                  aria-describedby={fieldErrors.teamName ? 'err-teamName' : undefined}
                />
                {fieldErrors.teamName && <span className="field-error" id="err-teamName">{fieldErrors.teamName}</span>}
              </label>
            )}
            <label>
              Email de la tripulación
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearField('email') }}
                placeholder="capitan@grandline.com"
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'err-email' : undefined}
              />
              {fieldErrors.email && <span className="field-error" id="err-email">{fieldErrors.email}</span>}
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearField('password') }}
                placeholder={isRegister ? '8 a 72 caracteres' : 'Tu contraseña'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'err-password' : undefined}
              />
              {fieldErrors.password && <span className="field-error" id="err-password">{fieldErrors.password}</span>}
            </label>

            {generalError && <div className="error-box" role="alert"><X size={16} /><span>{generalError}</span></div>}

            <button className="primary-btn auth-submit" type="submit" disabled={busy}>
              {busy
                ? <><span className="spinner" /> Verificando coordenadas…</>
                : <>{isRegister ? 'Registrar tripulación' : 'Entrar al Grand Line'} <ArrowRight size={17} /></>}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? '¿Ya tienes una tripulación?' : '¿Aún no tienes tripulación?'}{' '}
            {/* Se pasa el mismo `state` para no perder la ruta a la que se quería volver. */}
            <Link to={isRegister ? '/login' : '/register'} state={location.state}>{isRegister ? 'Inicia sesión' : 'Registra tu tripulación'}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
