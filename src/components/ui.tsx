import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Anchor, ArrowRight, Lock, Search, X } from 'lucide-react'
import { ApiError, errorMessage } from '../api/client'

export function PageHeading({ eyebrow, title, highlight, description, action }: {
  eyebrow: string
  title: string
  highlight?: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="section-kicker"><span className="kicker-line" />{eyebrow}</div>
        <h1>{title} {highlight && <em>{highlight}</em>}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  )
}

export function LoadingState({ text = 'Consultando el registro de la Guild…' }: { text?: string }) {
  return <div className="loading-state" role="status"><span className="spinner dark-spinner" /><span>{text}</span></div>
}

export function ErrorState({ error, onRetry, title = 'Perdimos la señal' }: { error: unknown; onRetry: () => void; title?: string }) {
  return (
    <div className="state-panel error-state" role="alert">
      <div className="state-icon"><X size={22} /></div>
      <h3>{title}</h3>
      <p>{errorMessage(error)}</p>
      <button className="secondary-btn" onClick={onRetry}>Reintentar <ArrowRight size={15} /></button>
    </div>
  )
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="state-panel">
      <div className="state-icon"><Search size={22} /></div>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  )
}

// El backend responde 423 LOG_POSE_REQUIRED en el Grand Line hasta aprobar el CP3.
export function isLogPoseRequired(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 423 || error.code === 'LOG_POSE_REQUIRED')
}

export function LogPoseRequired() {
  return (
    <div className="state-panel logpose-required">
      <div className="state-icon"><Lock size={22} /></div>
      <h3>Necesitas el Log Pose</h3>
      <p>El Grand Line sigue bloqueado para tu tripulación. Aprueben la inspección de Reverse Mountain (CP3) para desbloquear esta sección.</p>
      <Link className="secondary-btn" to="/"><Anchor size={15} /> Ver estado del Log Pose</Link>
    </div>
  )
}

export function NotFoundState({ title, detail, backTo, backLabel }: { title: string; detail: string; backTo: string; backLabel: string }) {
  return (
    <div className="state-panel">
      <div className="state-icon"><Search size={22} /></div>
      <h3>{title}</h3>
      <p>{detail}</p>
      <Link className="secondary-btn" to={backTo}>{backLabel} <ArrowRight size={15} /></Link>
    </div>
  )
}
