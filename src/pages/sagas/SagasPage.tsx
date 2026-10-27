import { useEffect, type CSSProperties, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, MapPin } from 'lucide-react'
import type { SagaSummary } from '../../api/types'
import { EmptyState, ErrorState, isLogPoseRequired, LogPoseRequired, PageHeading } from '../../components/ui'
import { useResource } from '../../lib/useResource'
import { withViewTransition } from '../../lib/viewTransition'
import { rememberSagas, transitionName } from './sagaCache'

export function SagasPage() {
  const { state, retry } = useResource<SagaSummary[]>('/sagas')
  const navigate = useNavigate()

  useEffect(() => {
    if (state.status === 'success') rememberSagas(state.data)
  }, [state])

  function open(event: MouseEvent<HTMLAnchorElement>, id: string) {
    // Clic normal: navegación con View Transition (si existe). Ctrl/Cmd+clic: comportamiento del navegador.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    withViewTransition(() => navigate(`/sagas/${encodeURIComponent(id)}`))
  }

  return (
    <div className="page-content">
      <PageHeading
        eyebrow="GRAND LINE · PONEGLYPH"
        title="La historia"
        highlight="que el mundo olvidó."
        description="Cada saga se recorre isla por isla. Elige una para comenzar el viaje."
      />
      {state.status === 'loading' && (
        <div className="saga-list" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="saga-tile skeleton-block" style={{ height: 230 }} />)}</div>
      )}
      {state.status === 'error' && (isLogPoseRequired(state.error) ? <LogPoseRequired /> : <ErrorState error={state.error} onRetry={retry} />)}
      {state.status === 'success' && (state.data.length === 0 ? (
        <EmptyState title="No hay sagas registradas" detail="El archivo de Poneglyphs está vacío." />
      ) : (
        <div className="saga-list">
          {state.data.map((saga) => (
            <Link
              key={saga.id}
              to={`/sagas/${encodeURIComponent(saga.id)}`}
              onClick={(e) => open(e, saga.id)}
              className="saga-tile"
              style={{ '--saga-bg': saga.palette.background, '--saga-surface': saga.palette.surface, '--saga-primary': saga.palette.primary, '--saga-accent': saga.palette.accent, '--saga-text': saga.palette.text } as CSSProperties}
            >
              <span className="saga-tile-order">SAGA {String(saga.order).padStart(2, '0')}</span>
              <h2 className="vt-title" style={{ '--vt-name': transitionName(saga.id) } as CSSProperties}>{saga.title}</h2>
              <p className="saga-tile-subtitle">{saga.subtitle}</p>
              <p className="saga-tile-synopsis">{saga.synopsis}</p>
              <div className="saga-tile-meta">
                <span><BookOpen size={14} /> {saga.stageCount} etapas</span>
                <span><MapPin size={14} /> {saga.firstIsland} → {saga.lastIsland}</span>
                <span>{saga.totalDistanceNm.toLocaleString('es-PE')} mn</span>
              </div>
              <span className="saga-tile-cta">Iniciar viaje <ArrowRight size={14} /></span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  )
}
