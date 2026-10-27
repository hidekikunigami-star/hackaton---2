import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Newspaper, RotateCw, Shield, X } from 'lucide-react'
import { api, ApiError, errorMessage } from '../../api/client'
import type { NewsDetail } from '../../api/types'
import { ErrorState, isLogPoseRequired, LoadingState, LogPoseRequired, NotFoundState } from '../../components/ui'
import { dateTime, NEWS_PRIORITY_LABEL, NEWS_STATUS_LABEL, NEWS_TYPE_LABEL } from '../../lib/format'
import { useResource } from '../../lib/useResource'
import { applyNewsUpdate } from './newsStore'

type Verdict = 'CONFIRMED' | 'DEBUNKED'

export function NewsDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { state, retry, setData } = useResource<NewsDetail>(`/news/${encodeURIComponent(id)}`)

  const [pending, setPending] = useState<Verdict | null>(null)          // request en vuelo
  const [failed, setFailed] = useState<{ verdict: Verdict; error: unknown } | null>(null)
  const [notice, setNotice] = useState('')

  const cameFromFeed = Boolean((location.state as { fromFeed?: boolean } | null)?.fromFeed)
  function goBack() {
    // Volver a la misma entrada del historial: el feed se reconstruye desde lo guardado, sin volver a pedirlo.
    if (cameFromFeed) navigate(-1)
    else navigate('/news')
  }

  async function verify(verdict: Verdict) {
    if (pending) return
    setPending(verdict)
    setFailed(null)
    setNotice('')
    try {
      const updated = await api<NewsDetail>(`/news/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status: verdict } })
      setData(updated)
      applyNewsUpdate(updated) // el feed reflejará el nuevo estado al volver
      setNotice(verdict === 'CONFIRMED' ? 'Listo: la noticia quedó CONFIRMADA.' : 'Listo: la noticia quedó DESMENTIDA.')
    } catch (error) {
      // 409: otra persona ya la verificó con el otro estado → mostramos el estado real que devuelve el servidor.
      if (error instanceof ApiError && error.code === 'NEWS_ALREADY_VERIFIED' && error.body?.current) {
        setData(error.body.current)
        applyNewsUpdate(error.body.current)
        setNotice(`Esta noticia ya había sido verificada como ${NEWS_STATUS_LABEL[error.body.current.status].toUpperCase()}.`)
      } else {
        // El estado anterior se conserva (no tocamos los datos) y se permite reintentar.
        setFailed({ verdict, error })
      }
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="page-content detail-page">
      <button className="back-link" onClick={goBack}><ArrowLeft size={16} /> Volver a News Coo</button>

      {state.status === 'loading' && <LoadingState text="Abriendo el reporte…" />}
      {state.status === 'error' && (
        isLogPoseRequired(state.error) ? <LogPoseRequired />
          : state.error instanceof ApiError && state.error.status === 404
            ? <NotFoundState title="Noticia no encontrada" detail="Esta noticia no existe en tu workspace." backTo="/news" backLabel="Ir al feed" />
            : <ErrorState error={state.error} onRetry={retry} />
      )}

      {state.status === 'success' && (() => {
        const n = state.data
        return (
          <article className="news-detail">
            <div className="section-kicker"><span className="kicker-line" /> NEWS COO · {n.source.toUpperCase()}</div>
            <div className="news-detail-tags">
              <span className="news-type">{NEWS_TYPE_LABEL[n.type]}</span>
              <span className={`news-status status-${n.status.toLowerCase()}`}>{NEWS_STATUS_LABEL[n.status]}</span>
              <span className="news-date">{dateTime(n.publishedAt)}</span>
            </div>
            <h1>{n.title}</h1>
            <p className="news-detail-lede">{n.summary}</p>
            <div className="news-detail-byline">
              <span className="byline-icon"><Newspaper size={17} /></span>
              <div><b>{n.source}</b><small>{n.island}</small></div>
              <span className={`priority-label priority-text-${n.priority.toLowerCase()}`}>PRIORIDAD {NEWS_PRIORITY_LABEL[n.priority].toUpperCase()}</span>
            </div>
            <div className="news-article-body">{n.body.map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>
            {n.relatedWanted && (
              <p className="related-wanted">Cartel relacionado: <Link to={`/wanted/${encodeURIComponent(n.relatedWanted.id)}`}>{n.relatedWanted.name}</Link></p>
            )}

            {notice && <div className="success-box" role="status"><Check size={16} /><span>{notice}</span></div>}
            {failed && (
              <div className="error-box" role="alert">
                <X size={16} />
                <span>No se pudo guardar la verificación: {errorMessage(failed.error)} La noticia sigue como {NEWS_STATUS_LABEL[n.status].toUpperCase()}.</span>
                <button className="secondary-btn" onClick={() => void verify(failed.verdict)} disabled={pending !== null}><RotateCw size={14} /> Reintentar</button>
              </div>
            )}

            {n.status === 'RUMOR' ? (
              <div className="verify-panel">
                <div>
                  <div className="section-kicker"><span className="kicker-line" /> VERIFICACIÓN DE LA GUILD</div>
                  <h3>¿Este rumor es cierto?</h3>
                  <p>Solo los rumores se pueden verificar. El cambio es permanente en tu workspace.</p>
                </div>
                <div className="verify-actions">
                  <button className="confirm-btn" disabled={pending !== null} onClick={() => void verify('CONFIRMED')}>
                    {pending === 'CONFIRMED' ? <span className="spinner" /> : <Check size={16} />} Confirmar
                  </button>
                  <button className="debunk-btn" disabled={pending !== null} onClick={() => void verify('DEBUNKED')}>
                    {pending === 'DEBUNKED' ? <span className="spinner" /> : <X size={16} />} Desmentir
                  </button>
                </div>
              </div>
            ) : (
              <div className="verified-panel">
                <Shield size={19} />
                <span>Reporte {NEWS_STATUS_LABEL[n.status].toUpperCase()}{n.verifiedAt ? ` el ${dateTime(n.verifiedAt)}` : ''}.</span>
              </div>
            )}
          </article>
        )
      })()}
    </div>
  )
}
