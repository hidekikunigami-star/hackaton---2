import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Skull } from 'lucide-react'
import { ApiError } from '../../api/client'
import type { WantedDetail as WantedDetailData } from '../../api/types'
import { ErrorState, LoadingState, NotFoundState, PageHeading } from '../../components/ui'
import { berries, dateTime, FRUIT_LABEL, ROLE_LABEL, WANTED_STATUS_LABEL } from '../../lib/format'
import { useResource } from '../../lib/useResource'

export function WantedDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { state, retry } = useResource<WantedDetailData>(`/wanted/${encodeURIComponent(id)}`)

  // Si venimos del listado, "volver" regresa a esa misma entrada del historial:
  // la URL del listado (filtros, página, orden) es idéntica, así que se ve exactamente igual.
  const cameFromList = Boolean((location.state as { fromList?: boolean } | null)?.fromList)
  function goBack() {
    if (cameFromList) navigate(-1)
    else navigate('/wanted')
  }

  return (
    <div className="page-content detail-page">
      <button className="back-link" onClick={goBack}><ArrowLeft size={16} /> Volver al archivo</button>

      {state.status === 'loading' && <LoadingState text="Abriendo el expediente…" />}
      {state.status === 'error' && (state.error instanceof ApiError && state.error.status === 404
        ? <NotFoundState title="Cartel no encontrado" detail="Este cartel no existe en el workspace de tu tripulación." backTo="/wanted" backLabel="Ir al archivo" />
        : <ErrorState error={state.error} onRetry={retry} />)}

      {state.status === 'success' && (() => {
        const w = state.data
        const history = w.bountyHistory
        const maxAmount = Math.max(1, ...history.map((h) => h.amount))
        return (
          <>
            <PageHeading eyebrow="ARCHIVO · FICHA DE OBJETIVO" title={w.name} highlight={`“${w.epithet}”`} description={w.bio} />
            <div className="wanted-detail-layout">
              <div className="wanted-detail-poster">
                <div className="wanted-card">
                  <div className="wanted-card-art">
                    <div className="wanted-placeholder"><Skull size={64} strokeWidth={1} /><span>WANTED</span></div>
                    <span className={`wanted-status ${w.status === 'AT_LARGE' ? 'status-active' : ''}`}>{WANTED_STATUS_LABEL[w.status]}</span>
                  </div>
                  <div className="wanted-card-info">
                    <div className="bounty-label">RECOMPENSA ACTUAL</div>
                    <div className="bounty-amount">{berries(w.bounty)}</div>
                  </div>
                </div>
              </div>
              <div className="detail-info-panel">
                <div className="section-kicker"><span className="kicker-line" /> DATOS DEL OBJETIVO</div>
                <dl className="detail-list">
                  {([
                    ['Tripulación', <Link key="crew" to={`/wanted?crewId=${encodeURIComponent(w.crew.id)}`}>{w.crew.name}</Link>],
                    ['Puesto', ROLE_LABEL[w.role]],
                    ['Fruta del diablo', w.devilFruit ? `${w.devilFruit.name} (${FRUIT_LABEL[w.devilFruit.type]})` : 'Ninguna'],
                    ['Nivel de amenaza', `${w.threatLevel} / 5`],
                    ['Edad', `${w.age} años`],
                    ['Estatura', `${w.heightCm} cm`],
                    ['Visto por última vez', `${w.lastSeen.island} · ${dateTime(w.lastSeen.seenAt)}`],
                    ['Última actualización', dateTime(w.updatedAt)],
                  ] as const).map(([label, value]) => (
                    <div className="detail-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>
                  ))}
                </dl>

                <div className="section-kicker" style={{ marginTop: 24 }}><span className="kicker-line" /> HISTORIAL DE RECOMPENSAS</div>
                <ol className="bounty-history">
                  {history.map((h, i) => (
                    <li key={`${h.issuedAt}-${i}`}>
                      <span>{dateTime(h.issuedAt)}</span>
                      <span className="bounty-bar"><span style={{ width: `${(h.amount / maxAmount) * 100}%` }} /></span>
                      <b>{berries(h.amount)}</b>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}
