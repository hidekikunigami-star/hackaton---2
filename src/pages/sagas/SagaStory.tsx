import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Compass, Ship } from 'lucide-react'
import { ApiError } from '../../api/client'
import type { SagaStage, SagaStory as SagaStoryData } from '../../api/types'
import { ErrorState, isLogPoseRequired, LoadingState, LogPoseRequired, NotFoundState } from '../../components/ui'
import { prefersReducedMotion } from '../../lib/format'
import { useResource } from '../../lib/useResource'
import { withViewTransition } from '../../lib/viewTransition'
import { getSagaSummary, transitionName } from './sagaCache'

// Línea de referencia (fracción del alto de la ventana): la etapa activa es la última
// cuyo borde superior ya cruzó esta línea. En mobile el mapa ocupa la parte superior,
// por eso la línea va más abajo. Debe coincidir con el scroll-margin-top del CSS.
const MOBILE_QUERY = '(max-width: 900px)'
function anchorRatio(): number {
  return window.matchMedia(MOBILE_QUERY).matches ? 0.62 : 0.5
}

const supportsScrollTimeline = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()')

export function SagaStory() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { state, retry } = useResource<SagaStoryData>(`/sagas/${encodeURIComponent(id)}/story`)
  const summary = getSagaSummary(id)

  function backToList() {
    withViewTransition(() => navigate('/sagas'))
  }

  return (
    <div className="sg-page">
      {state.status !== 'success' && (
        <div className="page-content">
          <button className="back-link" onClick={backToList}><ArrowLeft size={16} /> Archivo de sagas</button>
          {summary && (
            <h1 className="sg-title vt-title" style={{ '--vt-name': transitionName(id) } as CSSProperties}>{summary.title}</h1>
          )}
          {state.status === 'loading' && <LoadingState text="Descifrando el Poneglyph…" />}
          {state.status === 'error' && (
            isLogPoseRequired(state.error) ? <LogPoseRequired />
              : state.error instanceof ApiError && state.error.status === 404
                ? <NotFoundState title="Saga no encontrada" detail="Esta saga no existe en tu workspace." backTo="/sagas" backLabel="Ver sagas" />
                : <ErrorState error={state.error} onRetry={retry} />
          )}
        </div>
      )}
      {state.status === 'success' && state.data.stages.length > 0 && <Story story={state.data} onBack={backToList} />}
      {state.status === 'success' && state.data.stages.length === 0 && (
        <div className="page-content"><NotFoundState title="Saga sin etapas" detail="Esta saga todavía no tiene historia." backTo="/sagas" backLabel="Ver sagas" /></div>
      )}
    </div>
  )
}

function Story({ story, onBack }: { story: SagaStoryData; onBack: () => void }) {
  const { saga, map, stages } = story
  const [searchParams, setSearchParams] = useSearchParams()
  const urlStage = searchParams.get('stage')

  // La URL indica la etapa activa (?stage=<slug>). Un slug inválido cae en la primera etapa.
  const indexOfSlug = useCallback((slug: string | null) => {
    const i = stages.findIndex((s) => s.slug === slug)
    return i >= 0 ? i : 0
  }, [stages])

  const [active, setActive] = useState(() => indexOfSlug(urlStage))
  const [revealedUpTo, setRevealedUpTo] = useState(() => indexOfSlug(urlStage))
  const activeRef = useRef(active)
  activeRef.current = active
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const progressRef = useRef<HTMLDivElement>(null)

  const scrollToStage = useCallback((index: number, smooth: boolean, focus = true) => {
    const section = sectionRefs.current[index]
    if (!section) return
    section.scrollIntoView({ block: 'start', behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' })
    // El foco acompaña a la etapa (lectores de pantalla y Tab siguen desde ahí).
    if (focus) section.focus({ preventScroll: true })
  }, [])

  // Abrir una URL con ?stage=... lleva directo a esa etapa.
  useLayoutEffect(() => {
    const initial = indexOfSlug(urlStage)
    if (initial > 0) scrollToStage(initial, false, false)
    else window.scrollTo(0, 0)
    // solo al montar la historia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mantener la URL sincronizada con la etapa activa (replace: no llena el historial).
  useEffect(() => {
    const slug = stages[active]?.slug
    if (slug && searchParams.get('stage') !== slug) {
      const next = new URLSearchParams(searchParams)
      next.set('stage', slug)
      setSearchParams(next, { replace: true })
    }
  }, [active, stages, searchParams, setSearchParams])

  // Etapa activa según el scroll (+ progreso de respaldo cuando no hay Scroll-driven Animations).
  useEffect(() => {
    let frame = 0
    const measure = () => {
      const line = window.innerHeight * anchorRatio()
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      let current = 0
      let revealed = 0
      sectionRefs.current.forEach((section, i) => {
        if (!section) return
        const top = section.getBoundingClientRect().top
        if (top <= line) current = i
        if (top <= window.innerHeight * 0.9) revealed = i
      })
      if (atBottom) current = stages.length - 1
      setActive(current)
      setRevealedUpTo((prev) => Math.max(prev, revealed))
      // Respaldo: sin soporte de Scroll-driven Animations (o con reduced motion) la barra se actualiza desde JS.
      if ((!supportsScrollTimeline || prefersReducedMotion()) && progressRef.current) {
        const max = document.documentElement.scrollHeight - window.innerHeight
        const fraction = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1
        progressRef.current.style.setProperty('--scroll-progress', String(fraction))
      }
    }
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    // Primera medición después de que el salto inicial se haya aplicado.
    frame = requestAnimationFrame(measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [stages.length])

  const goTo = useCallback((index: number) => {
    const safe = Math.min(stages.length - 1, Math.max(0, index))
    scrollToStage(safe, true)
  }, [stages.length, scrollToStage])

  // Teclado: → / j siguiente etapa, ← / k anterior. Las flechas ↑↓ y Tab siguen funcionando normal.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return
      if (event.key === 'ArrowRight' || event.key === 'j') { event.preventDefault(); goTo(activeRef.current + 1) }
      if (event.key === 'ArrowLeft' || event.key === 'k') { event.preventDefault(); goTo(activeRef.current - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo])

  const stage = stages[active]
  const palette = stage.palette
  const themeStyle = {
    '--sg-bg': palette.background,
    '--sg-surface': palette.surface,
    '--sg-primary': palette.primary,
    '--sg-accent': palette.accent,
    '--sg-text': palette.text,
  } as CSSProperties

  return (
    <div className="sg-root" style={themeStyle}>
      <div className="sg-progress" ref={progressRef} role="progressbar" aria-label="Progreso del recorrido" aria-valuemin={1} aria-valuemax={stages.length} aria-valuenow={active + 1} aria-valuetext={`Etapa ${active + 1} de ${stages.length}`}>
        <div className="sg-progress-fill" />
      </div>

      <header className="sg-header">
        <button className="sg-back" onClick={onBack}><ArrowLeft size={16} /> Archivo de sagas</button>
        <span className="sg-kicker">SAGA {String(saga.order).padStart(2, '0')} · {saga.firstIsland} → {saga.lastIsland}</span>
        <h1 className="sg-title vt-title" style={{ '--vt-name': transitionName(saga.id) } as CSSProperties}>{saga.title}</h1>
        <p className="sg-subtitle">{saga.subtitle}</p>
        <p className="sg-intro">{saga.intro}</p>
        <p className="sg-hint">Desplázate para navegar · <kbd>←</kbd> <kbd>→</kbd> o <kbd>j</kbd> <kbd>k</kbd> para cambiar de etapa · <kbd>Tab</kbd> recorre las etapas</p>
      </header>

      <div className="sg-body">
        <aside className="sg-panel" aria-label="Mapa y métricas de la etapa activa">
          <RouteMap stages={stages} active={active} width={map.width} height={map.height} />
          <div className="sg-panel-row">
            <span className="sg-step">Etapa <b>{active + 1}</b> de {stages.length} · {Math.round(((active + 1) / stages.length) * 100)}% del recorrido</span>
            <div className="sg-step-buttons">
              <button onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Etapa anterior"><ArrowLeft size={15} /></button>
              <button onClick={() => goTo(active + 1)} disabled={active === stages.length - 1} aria-label="Etapa siguiente"><ArrowRight size={15} /></button>
            </div>
          </div>
          {/* Las métricas salen SIEMPRE de la etapa activa: no hay otro estado que pueda desincronizarse. */}
          <dl className="sg-metrics" aria-live="polite">
            {stage.metrics.map((metric) => (
              <div key={metric.key} className="sg-metric">
                <dt>{metric.label}</dt>
                <dd>{metric.value.toLocaleString('es-PE')} <small>{metric.unit}</small></dd>
              </div>
            ))}
          </dl>
          <ol className="sg-stage-nav">
            {stages.map((s, i) => (
              <li key={s.id}>
                <button onClick={() => goTo(i)} aria-current={i === active ? 'step' : undefined} className={i < active ? 'is-visited' : ''}>
                  <span>{String(s.order).padStart(2, '0')}</span>{s.title}
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <ol className="sg-stages">
          {stages.map((s, i) => (
            <li key={s.id}>
              <section
                ref={(node) => { sectionRefs.current[i] = node }}
                id={`etapa-${s.slug}`}
                tabIndex={0}
                aria-labelledby={`etapa-${s.slug}-title`}
                className={`sg-stage ${i === active ? 'is-active' : ''} ${i <= revealedUpTo ? 'is-revealed' : ''}`}
                style={{ '--stage-accent': s.palette.accent, '--stage-primary': s.palette.primary } as CSSProperties}
              >
                <div className="sg-stage-inner">
                  <span className="sg-stage-order">ETAPA {String(s.order).padStart(2, '0')} · {s.island.name}</span>
                  <h2 id={`etapa-${s.slug}-title`}>{s.title}</h2>
                  {s.narrative.map((paragraph, p) => <p key={p}>{paragraph}</p>)}
                </div>
              </section>
            </li>
          ))}
        </ol>
      </div>

      <footer className="sg-end">
        <Compass size={26} />
        <h2>Fin del registro</h2>
        <p>Recorriste {saga.totalDistanceNm.toLocaleString('es-PE')} millas náuticas en {stages.length} etapas.</p>
        <button className="primary-btn" onClick={onBack}>Volver al archivo <ArrowRight size={16} /></button>
      </footer>
    </div>
  )
}

// Mapa persistente: islas en sus coordenadas reales (viewBox = map.width × map.height),
// la ruta completa tenue y la ruta recorrida que se dibuja hasta la etapa activa.
function RouteMap({ stages, active, width, height }: { stages: SagaStage[]; active: number; width: number; height: number }) {
  const points = useMemo(() => stages.map((s) => ({ x: s.island.x, y: s.island.y })), [stages])
  const cumulative = useMemo(() => {
    const out = [0]
    for (let i = 1; i < points.length; i++) {
      out.push(out[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y))
    }
    return out
  }, [points])
  const total = cumulative[cumulative.length - 1] || 1
  const traveled = cumulative[active] ?? 0
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')
  const ship = points[active]
  const unit = Math.max(width, height) / 100

  return (
    <svg className="sg-map" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Mapa del Grand Line. Barco en ${stages[active].island.name}, etapa ${active + 1} de ${stages.length}.`}>
      <defs>
        <pattern id="sg-grid" width={width / 10} height={height / 5} patternUnits="userSpaceOnUse">
          <path d={`M ${width / 10} 0 L 0 0 0 ${height / 5}`} fill="none" className="sg-map-grid" />
        </pattern>
      </defs>
      <rect width={width} height={height} className="sg-map-sea" />
      <rect width={width} height={height} fill="url(#sg-grid)" />
      <path d={pathD} className="sg-route-base" strokeWidth={unit * 0.5} />
      <path
        d={pathD}
        className="sg-route-traveled"
        strokeWidth={unit * 0.8}
        style={{ strokeDasharray: total, strokeDashoffset: total - traveled }}
      />
      {stages.map((s, i) => (
        <g key={s.id} className={`sg-island ${i === active ? 'is-active' : i < active ? 'is-visited' : ''}`}>
          <circle cx={s.island.x} cy={s.island.y} r={unit * (i === active ? 2.4 : 1.6)} />
          <text x={s.island.x} y={s.island.y + unit * 5} textAnchor="middle" fontSize={unit * 2.6}>{s.island.name}</text>
        </g>
      ))}
      <g className="sg-ship" style={{ transform: `translate(${ship.x}px, ${ship.y - unit * 4.5}px)` }}>
        <Ship x={-unit * 2.5} y={-unit * 2.5} width={unit * 5} height={unit * 5} />
      </g>
    </svg>
  )
}
