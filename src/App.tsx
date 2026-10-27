import { useLayoutEffect } from 'react'
import { Link, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { ArrowRight, Compass } from 'lucide-react'
import { PrivateRoute, PublicOnlyRoute } from './auth/guards'
import { Layout } from './components/Layout'
import { AuthPage } from './pages/AuthPage'
import { Dashboard } from './pages/Dashboard'
import { NewsDetailPage } from './pages/news/NewsDetailPage'
import { NewsFeedPage } from './pages/news/NewsFeedPage'
import { SagaStory } from './pages/sagas/SagaStory'
import { SagasPage } from './pages/sagas/SagasPage'
import { WantedDetail } from './pages/wanted/WantedDetail'
import { WantedList } from './pages/wanted/WantedList'

// Al entrar a una pantalla nueva se empieza arriba. Con atrás/adelante (POP) no:
// cada listado restaura su propia posición.
function ScrollToTop() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  useLayoutEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])
  return null
}

function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found-mark"><Compass size={46} /><span>404</span></div>
      <div className="section-kicker"><span className="kicker-line" /> COORDENADAS DESCONOCIDAS</div>
      <h1>Te saliste del <em>mapa.</em></h1>
      <p>Esta ruta no aparece en los registros de la Guild.</p>
      <Link className="primary-btn" to="/">Volver al puente de mando <ArrowRight size={16} /></Link>
    </div>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
        </Route>
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/wanted" element={<WantedList />} />
            <Route path="/wanted/:id" element={<WantedDetail />} />
            <Route path="/news" element={<NewsFeedPage />} />
            <Route path="/news/:id" element={<NewsDetailPage />} />
            <Route path="/sagas" element={<SagasPage />} />
            <Route path="/sagas/:id" element={<SagaStory />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
