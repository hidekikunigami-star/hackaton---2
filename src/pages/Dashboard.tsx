import { Link } from 'react-router-dom'
import { Anchor, ArrowRight, BookOpen, Compass, Flame, Lock, Newspaper, Scale, Target, Users } from 'lucide-react'
import type { DashboardSummary, LogPose } from '../api/types'
import { FRUIT_FILTERS, WANTED_STATUSES } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { EmptyState, ErrorState, PageHeading } from '../components/ui'
import { berries, compactBerries, dateTime, FRUIT_LABEL, WANTED_STATUS_LABEL } from '../lib/format'
import { useResource } from '../lib/useResource'

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando indicadores">
      <div className="stats-grid">
        {[0, 1, 2].map((i) => <div className="stat-card skeleton-block" key={i} style={{ height: 112 }} />)}
      </div>
      <div className="skeleton-block" style={{ height: 120, marginTop: 18, borderRadius: 10 }} />
      <div className="skeleton-block" style={{ height: 220, marginTop: 18, borderRadius: 10 }} />
    </div>
  )
}

function LogPosePanel({ pose }: { pose: LogPose }) {
  const unlocked = pose.status === 'UNLOCKED'
  return (
    <div className="pose-status-panel">
      <div className="pose-emblem">{unlocked ? <Compass size={27} /> : <Lock size={24} />}</div>
      <div className="pose-status-copy">
        <span className="destination-number">REVERSE MOUNTAIN · CP3</span>
        <h3>{unlocked ? 'Log Pose sincronizado' : 'Tu Log Pose espera la inspección'}</h3>
        <p>{pose.message}{unlocked && pose.unlockedAt ? ` · Desde ${dateTime(pose.unlockedAt)}` : ''}</p>
      </div>
      <span className={`pose-badge ${unlocked ? 'unlocked' : ''}`}><span /> {unlocked ? 'UNLOCKED' : 'LOCKED'}</span>
    </div>
  )
}

export function Dashboard() {
  const { session } = useAuth()
  const summary = useResource<DashboardSummary>('/dashboard/summary')
  const pose = useResource<LogPose>('/log-pose')

  const retryAll = () => { summary.retry(); pose.retry() }
  const failed = summary.state.status === 'error' ? summary.state.error : pose.state.status === 'error' ? pose.state.error : null
  const loading = summary.state.status === 'loading' || pose.state.status === 'loading'

  return (
    <div className="page-content dashboard-page">
      <PageHeading
        eyebrow="EAST BLUE · PUESTO DE MANDO"
        title="A la orden,"
        highlight="capitán."
        description={`${session?.team.name ?? 'Tu tripulación'} · ${session?.team.code ?? ''}. Estos son los indicadores de tu workspace.`}
      />

      {failed !== null ? (
        <ErrorState error={failed} onRetry={retryAll} />
      ) : loading || summary.state.status !== 'success' || pose.state.status !== 'success' ? (
        <DashboardSkeleton />
      ) : (
        <DashboardContent data={summary.state.data} pose={pose.state.data} />
      )}
    </div>
  )
}

function DashboardContent({ data, pose }: { data: DashboardSummary; pose: LogPose }) {
  const unlocked = pose.status === 'UNLOCKED'
  const empty = data.wanted.total === 0

  return (
    <>
      <LogPosePanel pose={pose} />

      {empty ? (
        <div style={{ marginTop: 18 }}>
          <EmptyState
            title="Tu workspace aún no tiene carteles"
            detail="Cuando la Guild registre carteles de 'Se Busca' en tu workspace, aquí verás sus indicadores."
          />
        </div>
      ) : (
        <>
          <div className="section-title-row">
            <div><div className="section-kicker"><span className="kicker-line" /> DATOS DE LA GUILD</div><h2>Estado del archivo</h2></div>
            <span className="updated-label">CALCULADO {dateTime(data.generatedAt).toUpperCase()}</span>
          </div>
          <div className="stats-grid">
            <article className="stat-card">
              <div className="stat-card-top"><span>CARTELES</span><span className="stat-icon stat-icon-0"><Target size={18} /></span></div>
              <div className="stat-value">{data.wanted.total.toLocaleString('es-PE')}</div>
              <div className="stat-note"><span className="stat-dot" />{WANTED_STATUSES.map((s) => `${WANTED_STATUS_LABEL[s]}: ${data.wanted.byStatus[s]}`).join(' · ')}</div>
            </article>
            <article className="stat-card">
              <div className="stat-card-top"><span>RECOMPENSA TOTAL</span><span className="stat-icon stat-icon-1"><Flame size={18} /></span></div>
              <div className="stat-value" title={berries(data.wanted.totalBounty)}>{compactBerries(data.wanted.totalBounty)}</div>
              <div className="stat-note"><span className="stat-dot" /><Scale size={12} /> Promedio {compactBerries(data.wanted.averageBounty)}</div>
            </article>
            <article className="stat-card">
              <div className="stat-card-top"><span>TRIPULACIONES</span><span className="stat-icon stat-icon-2"><Users size={18} /></span></div>
              <div className="stat-value">{data.crews.total.toLocaleString('es-PE')}</div>
              <div className="stat-note"><span className="stat-dot" />{data.crews.mostWanted ? `Más buscada: ${data.crews.mostWanted.name}` : 'Sin tripulación destacada'}</div>
            </article>
          </div>

          <div className="fruit-breakdown">
            {FRUIT_FILTERS.map((f) => (
              <Link key={f} to={`/wanted?fruit=${f}`} className="fruit-chip">
                <span>{FRUIT_LABEL[f]}</span><b>{data.wanted.byFruit[f]}</b>
              </Link>
            ))}
          </div>

          <div className="section-title-row lower-title">
            <div><div className="section-kicker"><span className="kicker-line" /> TOP RECOMPENSAS</div><h2>Los más buscados</h2></div>
            <Link to="/wanted" className="text-link">Ver todos <ArrowRight size={14} /></Link>
          </div>
          <ol className="top-bounties">
            {data.topBounties.map((w, i) => (
              <li key={w.id}>
                <Link to={`/wanted/${encodeURIComponent(w.id)}`}>
                  <span className="top-rank">{String(i + 1).padStart(2, '0')}</span>
                  <span className="top-name"><b>{w.name}</b><small>“{w.epithet}” · {w.crew.name}</small></span>
                  <span className="top-bounty">{berries(w.bounty)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="section-title-row lower-title">
        <div><div className="section-kicker"><span className="kicker-line" /> PRÓXIMOS DESTINOS</div><h2>Tu ruta de navegación</h2></div>
      </div>
      <div className="destination-grid">
        <Link to="/wanted" className="destination-card wanted-destination">
          <div className="destination-icon"><Target size={21} /></div>
          <div><span className="destination-number">01 / EAST BLUE</span><h3>Carteles de Se Busca</h3><p>Rastrea objetivos, filtra recompensas y revisa sus expedientes.</p></div>
          <ArrowRight className="destination-arrow" size={18} />
        </Link>
        <Link to="/news" className={`destination-card ${unlocked ? 'news-destination' : 'locked-destination'}`}>
          <div className="destination-icon">{unlocked ? <Newspaper size={21} /> : <Lock size={21} />}</div>
          <div><span className="destination-number">02 / GRAND LINE · {unlocked ? 'ABIERTO' : 'BLOQUEADO'}</span><h3>News Coo</h3><p>{unlocked ? 'Sigue los reportes del mundo y verifica rumores.' : 'Requiere aprobar la inspección de Reverse Mountain.'}</p></div>
          <ArrowRight className="destination-arrow" size={18} />
        </Link>
        <Link to="/sagas" className={`destination-card ${unlocked ? 'saga-destination' : 'locked-destination'}`}>
          <div className="destination-icon">{unlocked ? <BookOpen size={21} /> : <Lock size={21} />}</div>
          <div><span className="destination-number">03 / PONEGLYPH · {unlocked ? 'ABIERTO' : 'BLOQUEADO'}</span><h3>La Gran Saga</h3><p>Recorre las islas etapa por etapa.</p></div>
          <ArrowRight className="destination-arrow" size={18} />
        </Link>
      </div>
      <p className="dashboard-foot"><Anchor size={13} /> Datos en vivo de tu workspace.</p>
    </>
  )
}
