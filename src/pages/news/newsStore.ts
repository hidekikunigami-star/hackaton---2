import { NEWS_PRIORITIES, NEWS_STATUSES, NEWS_TYPES, pickEnum } from '../../api/types'
import type { NewsDetail, NewsItem, NewsPriority, NewsStatus, NewsType } from '../../api/types'

export interface NewsFilters { type?: NewsType; priority?: NewsPriority; status?: NewsStatus }

export function parseNewsFilters(params: URLSearchParams): NewsFilters {
  return {
    type: pickEnum(NEWS_TYPES, params.get('type')),
    priority: pickEnum(NEWS_PRIORITIES, params.get('priority')),
    status: pickEnum(NEWS_STATUSES, params.get('status')),
  }
}

export function filtersToParams(filters: NewsFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (filters.type) p.set('type', filters.type)
  if (filters.priority) p.set('priority', filters.priority)
  if (filters.status) p.set('status', filters.status)
  return p
}

// Estado guardado de cada feed (por combinación de filtros). Permite volver del detalle
// con las noticias ya cargadas y la misma posición, sin volver a pedir lo que ya se tenía.
export interface FeedSnapshot {
  items: NewsItem[]
  nextCursor: string | null
  hasMore: boolean
  scrollY: number
}

const feeds = new Map<string, FeedSnapshot>()

export function getFeed(key: string): FeedSnapshot | undefined { return feeds.get(key) }
export function saveFeed(key: string, snapshot: FeedSnapshot): void { feeds.set(key, snapshot) }

// Tras verificar un rumor, se actualiza la noticia en todos los feeds guardados.
// Si un feed filtra por un estado que la noticia ya no cumple (p. ej. status=RUMOR), se quita de ese feed.
export function applyNewsUpdate(updated: NewsDetail): void {
  for (const [key, feed] of feeds) {
    const statusFilter = new URLSearchParams(key).get('status')
    const items = feed.items.flatMap((item) => {
      if (item.id !== updated.id) return [item]
      if (statusFilter && statusFilter !== updated.status) return []
      const { body: _body, ...summary } = updated
      return [{ ...item, ...summary }]
    })
    feeds.set(key, { ...feed, items })
  }
}
