import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Globe2, Newspaper, RotateCw } from 'lucide-react'
import { api, ApiError, errorMessage } from '../../api/client'
import { NEWS_PRIORITIES, NEWS_STATUSES, NEWS_TYPES, pickEnum } from '../../api/types'
import type { NewsFeed, NewsItem } from '../../api/types'
import { EmptyState, ErrorState, isLogPoseRequired, LogPoseRequired, PageHeading } from '../../components/ui'
import { dateTime, NEWS_PRIORITY_LABEL, NEWS_STATUS_LABEL, NEWS_TYPE_LABEL } from '../../lib/format'
import { filtersToParams, getFeed, parseNewsFilters, saveFeed, type NewsFilters } from './newsStore'

const PAGE_LIMIT = 20

interface FeedState {
  key: string            // filtros a los que pertenece este estado
  items: NewsItem[]
  nextCursor: string | null
  hasMore: boolean
  started: boolean       // ya llegó la primera carga
  loading: boolean
  error: unknown | null
}

function emptyFeed(key: string): FeedState {
  return { key, items: [], nextCursor: null, hasMore: true, started: false, loading: false, error: null }
}

function feedFromCache(key: string): FeedState | null {
  const cached = getFeed(key)
  if (!cached) return null
  return { key, items: cached.items, nextCursor: cached.nextCursor, hasMore: cached.hasMore, started: true, loading: false, error: null }
}

function isCursorError(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 'INVALID_CURSOR' || error.code === 'CURSOR_FILTER_MISMATCH')
}

export function NewsFeedPage() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseNewsFilters(params), [params])
  const key = filtersToParams(filters).toString()

  // URL con valores inválidos → se normaliza (replace).
  useEffect(() => {
    if (params.toString() !== key) setParams(new URLSearchParams(key), { replace: true })
  }, [params, key, setParams])

  const [state, setState] = useState<FeedState>(() => feedFromCache(key) ?? emptyFeed(key))
  const stateRef = useRef(state)
  stateRef.current = state

  const keyRef = useRef(key)            // filtros vigentes
  const inFlight = useRef(false)        // una sola carga en vuelo
  const controllerRef = useRef<AbortController | null>(null)
  const lastScrollY = useRef(0)
  const pendingScroll = useRef<number | null>(getFeed(key)?.scrollY ?? null)

  const loadPage = useCallback(async (forKey: string, cursor: string | null) => {
    if (inFlight.current) return
    inFlight.current = true
    const controller = new AbortController()
    controllerRef.current = controller
    setState((s) => (s.key === forKey ? { ...s, loading: true, error: null } : s))
    try {
      const query = new URLSearchParams(forKey)
      query.set('limit', String(PAGE_LIMIT))
      if (cursor) query.set('cursor', cursor)
      const res = await api<NewsFeed>(`/news/feed?${query.toString()}`, { signal: controller.signal })
      // Si mientras tanto cambiaron los filtros, esta respuesta es de otro feed: se descarta (nunca se mezclan).
      if (controller.signal.aborted || keyRef.current !== forKey) return
      setState((s) => {
        if (s.key !== forKey) return s
        // Regla de Nami: ninguna noticia aparece dos veces.
        const seen = new Set(s.items.map((item) => item.id))
        const fresh: NewsItem[] = []
        for (const item of res.items) {
          if (!seen.has(item.id)) { seen.add(item.id); fresh.push(item) }
        }
        return {
          ...s,
          items: [...s.items, ...fresh],
          nextCursor: res.nextCursor,
          hasMore: res.hasMore && res.nextCursor !== null,
          started: true,
          loading: false,
          error: null,
        }
      })
    } catch (error) {
      if (controller.signal.aborted || keyRef.current !== forKey) return
      // Un error NO borra lo que ya estaba cargado.
      setState((s) => (s.key === forKey ? { ...s, loading: false, error } : s))
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
        inFlight.current = false
      }
    }
  }, [])

  // Cambio de filtros: se cancela la carga en vuelo y se empieza de cero (o desde lo guardado).
  useEffect(() => {
    keyRef.current = key
    const cached = feedFromCache(key)
    if (cached) {
      setState(cached)
    } else {
      setState(emptyFeed(key))
      void loadPage(key, null)
    }
    return () => {
      controllerRef.current?.abort()
      controllerRef.current = null
      inFlight.current = false
    }
  }, [key, loadPage])

  // Guardar el feed (para volver del detalle sin pedir de nuevo lo que ya teníamos).
  useEffect(() => {
    if (state.started && state.items.length > 0) {
      saveFeed(state.key, { items: state.items, nextCursor: state.nextCursor, hasMore: state.hasMore, scrollY: lastScrollY.current })
    }
  }, [state])

  // Registrar la posición de scroll y guardarla al salir.
  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => { lastScrollY.current = window.scrollY })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
      const s = stateRef.current
      if (s.started && s.items.length > 0) {
        saveFeed(s.key, { items: s.items, nextCursor: s.nextCursor, hasMore: s.hasMore, scrollY: lastScrollY.current })
      }
    }
  }, [])

  // Al volver del detalle: restaurar la posición exacta.
  useLayoutEffect(() => {
    if (pendingScroll.current === null || !state.started) return
    window.scrollTo(0, pendingScroll.current)
    lastScrollY.current = pendingScroll.current
    pendingScroll.current = null
  }, [state.started])

  // Infinite scroll: un IntersectionObserver vigila un "sentinel" al final de la lista.
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadMore = useCallback(() => {
    const s = stateRef.current
    if (!s.started || s.loading || s.error !== null || !s.hasMore || !s.nextCursor) return
    void loadPage(s.key, s.nextCursor)
  }, [loadPage])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !state.started || state.loading || state.error !== null || !state.hasMore) return
    // Se re-observa tras cada carga: si el sentinel sigue visible (lista corta), se dispara de nuevo.
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore()
    }, { rootMargin: '600px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [state.started, state.loading, state.error, state.hasMore, state.items.length, loadMore])

  function retry() {
    const s = stateRef.current
    if (!s.started || isCursorError(s.error)) {
      // Primera carga fallida o cursor inválido: se empieza de cero.
      setState(emptyFeed(s.key))
      void loadPage(s.key, null)
    } else {
      void loadPage(s.key, s.nextCursor)
    }
  }

  function updateFilter(patch: NewsFilters) {
    setParams(filtersToParams({ ...filters, ...patch }))
  }

  function rememberScroll() { lastScrollY.current = window.scrollY }

  const view = state.key === key ? state : (feedFromCache(key) ?? emptyFeed(key))

  return (
    <div className="page-content">
      <PageHeading
        eyebrow="GRAND LINE · NEWS COO"
        title="El mundo"
        highlight="no se detiene."
        description="Rumores, reportes y noticias del Grand Line. Verifica los rumores desde el detalle."
        action={<span className="count-pill"><Globe2 size={15} /> {view.items.length} cargadas</span>}
      />

      <div className="news-filter-bar">
        <div className="news-filter-title"><Newspaper size={17} /><span>FILTRO DE TRANSMISIONES</span></div>
        <label><span>Tipo</span>
          <select value={filters.type ?? ''} onChange={(e) => updateFilter({ type: pickEnum(NEWS_TYPES, e.target.value) })}>
            <option value="">Todos</option>
            {NEWS_TYPES.map((t) => <option key={t} value={t}>{NEWS_TYPE_LABEL[t]}</option>)}
          </select>
        </label>
        <label><span>Prioridad</span>
          <select value={filters.priority ?? ''} onChange={(e) => updateFilter({ priority: pickEnum(NEWS_PRIORITIES, e.target.value) })}>
            <option value="">Todas</option>
            {NEWS_PRIORITIES.map((p) => <option key={p} value={p}>{NEWS_PRIORITY_LABEL[p]}</option>)}
          </select>
        </label>
        <label><span>Estado</span>
          <select value={filters.status ?? ''} onChange={(e) => updateFilter({ status: pickEnum(NEWS_STATUSES, e.target.value) })}>
            <option value="">Todos</option>
            {NEWS_STATUSES.map((s) => <option key={s} value={s}>{NEWS_STATUS_LABEL[s]}</option>)}
          </select>
        </label>
      </div>

      {isLogPoseRequired(view.error) ? (
        <LogPoseRequired />
      ) : !view.started && view.error !== null ? (
        <ErrorState error={view.error} onRetry={retry} />
      ) : !view.started ? (
        <div className="news-feed" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="news-card skeleton-block" style={{ height: 132 }} />)}
        </div>
      ) : view.items.length === 0 && !view.hasMore ? (
        <EmptyState title="Silencio en las ondas" detail="No hay noticias con estos filtros." />
      ) : (
        <div className="news-feed">
          {view.items.map((item) => <NewsCard key={item.id} item={item} onOpen={rememberScroll} />)}
          <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />
          {view.loading && <div className="feed-loading" role="status"><span className="spinner dark-spinner" /> Recibiendo nuevas transmisiones…</div>}
          {view.error !== null && (
            <div className="inline-error" role="alert">
              <span>{errorMessage(view.error)} Las noticias ya cargadas se conservan.</span>
              <button className="secondary-btn" onClick={retry}><RotateCw size={14} /> Reintentar</button>
            </div>
          )}
          {!view.hasMore && !view.loading && <div className="feed-end"><span /> FIN DE TRANSMISIÓN · {view.items.length} noticias <span /></div>}
        </div>
      )}
    </div>
  )
}

function NewsCard({ item, onOpen }: { item: NewsItem; onOpen: () => void }) {
  return (
    <Link to={`/news/${encodeURIComponent(item.id)}`} state={{ fromFeed: true }} className="news-card" onClick={onOpen}>
      <div className={`news-priority priority-${item.priority.toLowerCase()}`} />
      <div className="news-card-content">
        <div className="news-meta">
          <span className="news-type">{NEWS_TYPE_LABEL[item.type]}</span>
          <span className={`news-status status-${item.status.toLowerCase()}`}>{NEWS_STATUS_LABEL[item.status]}</span>
          <span className="news-date">{dateTime(item.publishedAt)}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        <div className="news-card-bottom">
          <span>{item.source} · {item.island} · Prioridad {NEWS_PRIORITY_LABEL[item.priority]}</span>
          <span className="read-report">LEER REPORTE <ArrowRight size={14} /></span>
        </div>
      </div>
    </Link>
  )
}
