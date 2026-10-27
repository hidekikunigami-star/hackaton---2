import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Filter, Search, Skull, Target, X } from 'lucide-react'
import { api } from '../../api/client'
import type { Crew, FruitFilter, PageSize, WantedPage, WantedSort, WantedStatus, WantedSummary } from '../../api/types'
import { FRUIT_FILTERS, PAGE_SIZES, pickEnum, WANTED_SORTS, WANTED_STATUSES } from '../../api/types'
import { EmptyState, ErrorState, PageHeading } from '../../components/ui'
import { berries, FRUIT_LABEL, WANTED_STATUS_LABEL } from '../../lib/format'
import { useResource } from '../../lib/useResource'
import { DEFAULT_SIZE, DEFAULT_SORT, getCachedPage, parseWantedQuery, setCachedPage, toApiParams, toUrlParams, type WantedQuery } from './wantedQuery'

const SORT_LABEL: Record<WantedSort, string> = {
  'bounty,desc': 'Mayor recompensa',
  'name,asc': 'Nombre A–Z',
  'updatedAt,desc': 'Actualizados recientemente',
}
const SEARCH_DEBOUNCE_MS = 400
const SCROLL_KEY = 'wanted-list-scroll'

export function WantedList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(() => parseWantedQuery(searchParams), [searchParams])
  const urlKey = searchParams.toString()
  const canonicalKey = toUrlParams(query).toString()
  const apiKey = toApiParams(query)

  // 1) URL inválida o no canónica → se corrige con replace (no ensucia el historial).
  useEffect(() => {
    if (urlKey !== canonicalKey) setSearchParams(new URLSearchParams(canonicalKey), { replace: true })
  }, [urlKey, canonicalKey, setSearchParams])

  // Cambia la URL: los filtros/búsqueda/orden/tamaño siempre vuelven a la página 0
  // en la MISMA actualización, así nunca se pide una página que ya no existe.
  function commit(patch: Partial<WantedQuery>, options: { keepPage?: boolean; replace?: boolean } = {}) {
    const next: WantedQuery = { ...query, ...patch }
    if (!options.keepPage) next.page = 0
    setSearchParams(toUrlParams(next), { replace: options.replace })
  }

  // 2) Búsqueda con debounce: el input es local y responde al instante;
  //    la URL (y la request) solo se actualiza cuando el usuario deja de tipear.
  const [input, setInput] = useState(query.q)
  useEffect(() => {
    // Atrás/adelante cambian la URL: el input se sincroniza (sin borrar espacios mientras se tipea).
    setInput((prev) => (prev.trim() === query.q ? prev : query.q))
  }, [query.q])
  useEffect(() => {
    if (input.trim() === query.q) return
    const timer = window.setTimeout(() => commit({ q: input.trim().slice(0, 100) }), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer) // cada tecla cancela el temporizador anterior
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, query])

  // 3) Datos: se conserva la última respuesta mientras carga la siguiente (sin saltos de layout).
  const [result, setResult] = useState<{ key: string; data: WantedPage } | null>(() => {
    const cached = getCachedPage(apiKey)
    return cached ? { key: apiKey, data: cached } : null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ key: string; error: unknown } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const requested = query
    setLoading(true)
    setError(null)
    api<WantedPage>(`/wanted?${apiKey}`, { signal: controller.signal })
      .then((page) => {
        // Página fuera de rango (p. ej. ?page=40 con 3 páginas): se lleva al usuario a una que exista.
        const lastPage = Math.max(0, page.totalPages - 1)
        if (requested.page > lastPage) {
          setSearchParams(toUrlParams({ ...requested, page: lastPage }), { replace: true })
          return
        }
        setCachedPage(apiKey, page)
        setResult({ key: apiKey, data: page })
        setLoading(false)
      })
      .catch((err: unknown) => {
        // Respuesta vieja (la URL ya cambió): se descarta. Solo se muestra lo último que pidió el usuario.
        if (controller.signal.aborted) return
        setError({ key: apiKey, error: err })
        setLoading(false)
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, attempt])

  const crews = useResource<Crew[]>('/crews')
  const crewList = crews.state.status === 'success' ? crews.state.data : []
  const unknownCrew = Boolean(query.crewId) && crews.state.status === 'success' && !crewList.some((c) => c.id === query.crewId)

  // 4) Al volver del detalle se restaura el scroll donde estaba el usuario.
  const restoredRef = useRef(false)
  useLayoutEffect(() => {
    if (restoredRef.current || result?.key !== apiKey) return
    restoredRef.current = true
    try {
      const saved = sessionStorage.getItem(SCROLL_KEY)
      if (!saved) return
      const { key, y } = JSON.parse(saved) as { key: string; y: number }
      sessionStorage.removeItem(SCROLL_KEY)
      if (key === canonicalKey) window.scrollTo(0, y)
    } catch { /* sin sessionStorage: no se restaura */ }
  }, [result, apiKey, canonicalKey])

  function rememberScroll() {
    try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ key: canonicalKey, y: window.scrollY })) } catch { /* ignorar */ }
  }

  const topRef = useRef<HTMLDivElement>(null)
  function goToPage(page: number) {
    commit({ page }, { keepPage: true })
    topRef.current?.scrollIntoView({ block: 'start' })
  }

  const data = result?.data ?? null
  const isCurrent = result?.key === apiKey
  const currentError = error?.key === apiKey ? error.error : null
  const totalPages = data?.totalPages ?? 0
  const hasFilters = Boolean(query.q || query.status || query.crewId || query.fruit)

  return (
    <div className="page-content">
      <PageHeading
        eyebrow="EAST BLUE · ARCHIVO DE RECOMPENSAS"
        title="Se busca,"
        highlight="vivo o muerto."
        description="Filtra, busca y ordena los carteles de tu workspace. Todo el estado vive en la URL."
        action={<span className="count-pill"><Target size={15} />{data ? `${data.totalElements.toLocaleString('es-PE')} carteles` : '— carteles'}</span>}
      />

      <div ref={topRef} />
      <section className="filter-panel" aria-label="Filtros">
        <div className="filter-panel-heading">
          <div><Filter size={16} /><b>FILTRAR ARCHIVO</b></div>
          <button className="text-button" disabled={!hasFilters && input === ''} onClick={() => { setInput(''); setSearchParams(new URLSearchParams()) }}>
            Limpiar filtros <X size={13} />
          </button>
        </div>
        <div className="filters-grid">
          <label className="search-field">
            <Search size={17} />
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Buscar por nombre o epíteto…" aria-label="Buscar por nombre o epíteto" maxLength={100} />
          </label>
          <label>
            <span>Estado</span>
            <select value={query.status ?? ''} onChange={(e) => commit({ status: pickEnum<WantedStatus>(WANTED_STATUSES, e.target.value) })}>
              <option value="">Todos los estados</option>
              {WANTED_STATUSES.map((s) => <option key={s} value={s}>{WANTED_STATUS_LABEL[s]}</option>)}
            </select>
          </label>
          <label>
            <span>Tripulación</span>
            <select value={query.crewId ?? ''} onChange={(e) => commit({ crewId: e.target.value || undefined })} disabled={crews.state.status === 'loading'}>
              <option value="">{crews.state.status === 'loading' ? 'Cargando tripulaciones…' : 'Todas las tripulaciones'}</option>
              {unknownCrew && <option value={query.crewId}>Tripulación desconocida</option>}
              {crewList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {crews.state.status === 'error' && <button className="inline-retry" onClick={crews.retry}>No se cargaron las tripulaciones · Reintentar</button>}
          </label>
          <label>
            <span>Fruta del diablo</span>
            <select value={query.fruit ?? ''} onChange={(e) => commit({ fruit: pickEnum<FruitFilter>(FRUIT_FILTERS, e.target.value) })}>
              <option value="">Todas</option>
              {FRUIT_FILTERS.map((f) => <option key={f} value={f}>{FRUIT_LABEL[f]}</option>)}
            </select>
          </label>
        </div>
        <div className="filter-footer">
          <span aria-live="polite">
            {loading ? 'Actualizando archivo…' : data && data.totalElements > 0
              ? `Mostrando ${query.page * query.size + 1}–${query.page * query.size + data.content.length} de ${data.totalElements}`
              : 'Sin resultados'}
          </span>
          <label className="sort-control">ORDENAR POR
            <select value={query.sort} onChange={(e) => commit({ sort: pickEnum(WANTED_SORTS, e.target.value) ?? DEFAULT_SORT })}>
              {WANTED_SORTS.map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}
            </select>
          </label>
        </div>
      </section>

      {/* Contenedor de altura estable: loading, error y vacío se dibujan aquí dentro. */}
      <div className="results-area" aria-busy={loading}>
        {currentError !== null ? (
          <ErrorState error={currentError} onRetry={() => setAttempt((n) => n + 1)} />
        ) : !data ? (
          <div className="wanted-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="wanted-card skeleton-card" />)}</div>
        ) : isCurrent && data.content.length === 0 ? (
          <EmptyState
            title="No hay objetivos en el radar"
            detail={hasFilters ? 'Ningún cartel cumple estos filtros. Prueba con otra búsqueda o limpia los filtros.' : 'Tu workspace no tiene carteles.'}
            action={hasFilters ? <button className="secondary-btn" onClick={() => { setInput(''); setSearchParams(new URLSearchParams()) }}>Limpiar filtros</button> : undefined}
          />
        ) : (
          <div className={`wanted-grid ${loading && !isCurrent ? 'is-refreshing' : ''}`}>
            {data.content.map((item) => <WantedCard key={item.id} item={item} onOpen={rememberScroll} />)}
          </div>
        )}
        {loading && !isCurrent && data && currentError === null && <div className="refresh-indicator"><span className="spinner dark-spinner" /> Actualizando…</div>}
      </div>

      <div className="pagination">
        <span>PÁGINA <b>{totalPages === 0 ? 0 : query.page + 1}</b> DE <b>{totalPages}</b></span>
        <div>
          <button className="page-arrow" disabled={query.page <= 0 || loading} onClick={() => goToPage(query.page - 1)} aria-label="Página anterior"><ArrowLeft size={16} /></button>
          <button className="page-arrow" disabled={query.page + 1 >= totalPages || loading} onClick={() => goToPage(query.page + 1)} aria-label="Página siguiente"><ArrowRight size={16} /></button>
        </div>
        <label className="page-size">POR PÁGINA
          <select value={query.size} onChange={(e) => commit({ size: pickEnum<PageSize>(PAGE_SIZES, Number(e.target.value)) ?? DEFAULT_SIZE })}>
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
    </div>
  )
}

function ThreatLevel({ level }: { level: number }) {
  return <span className="threat" aria-label={`Amenaza ${level} de 5`}>{'●'.repeat(level)}<span className="threat-off">{'●'.repeat(Math.max(0, 5 - level))}</span></span>
}

function WantedCard({ item, onOpen }: { item: WantedSummary; onOpen: () => void }) {
  return (
    <Link className="wanted-card" to={`/wanted/${encodeURIComponent(item.id)}`} state={{ fromList: true }} onClick={onOpen}>
      <div className="wanted-card-art">
        <div className="wanted-placeholder"><Skull size={54} strokeWidth={1} /><span>WANTED</span></div>
        <span className={`wanted-status ${item.status === 'AT_LARGE' ? 'status-active' : ''}`}>{WANTED_STATUS_LABEL[item.status]}</span>
        <span className="wanted-card-index"><ThreatLevel level={item.threatLevel} /></span>
      </div>
      <div className="wanted-card-info">
        <div className="wanted-epithet">“{item.epithet}”</div>
        <h3>{item.name}</h3>
        <div className="bounty-label">RECOMPENSA</div>
        <div className="bounty-amount">{berries(item.bounty)}</div>
        <div className="wanted-card-meta">
          <span>{item.crew.name} · {item.devilFruit ? FRUIT_LABEL[item.devilFruit.type] : 'Sin fruta'}</span>
          <ArrowRight size={15} />
        </div>
      </div>
    </Link>
  )
}
