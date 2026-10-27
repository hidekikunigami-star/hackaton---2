import { FRUIT_FILTERS, PAGE_SIZES, pickEnum, WANTED_SORTS, WANTED_STATUSES } from '../../api/types'
import type { FruitFilter, PageSize, WantedPage, WantedSort, WantedStatus } from '../../api/types'

// Estado completo del listado. Vive en la URL (fuente única de verdad).
export interface WantedQuery {
  page: number
  size: PageSize
  sort: WantedSort
  status?: WantedStatus
  crewId?: string
  fruit?: FruitFilter
  q: string
}

export const DEFAULT_SIZE: PageSize = 20
export const DEFAULT_SORT: WantedSort = 'bounty,desc'

// Lee la URL y valida cada valor: lo que no cumple el contrato se reemplaza por el valor por defecto,
// así una URL inválida (?page=-3&size=999&status=X) nunca rompe la vista ni llega al backend.
export function parseWantedQuery(params: URLSearchParams): WantedQuery {
  const pageRaw = params.get('page')
  const page = pageRaw !== null && /^\d{1,6}$/.test(pageRaw) ? Number(pageRaw) : 0
  const crewRaw = (params.get('crewId') ?? '').trim()
  const qRaw = (params.get('q') ?? '').trim().slice(0, 100)
  return {
    page,
    size: pickEnum(PAGE_SIZES, params.get('size')) ?? DEFAULT_SIZE,
    sort: pickEnum(WANTED_SORTS, params.get('sort')) ?? DEFAULT_SORT,
    status: pickEnum(WANTED_STATUSES, params.get('status')),
    fruit: pickEnum(FRUIT_FILTERS, params.get('fruit')),
    crewId: crewRaw && crewRaw.length <= 200 ? crewRaw : undefined,
    q: qRaw,
  }
}

// Forma canónica para la URL: solo lo que difiere del valor por defecto, siempre en el mismo orden.
export function toUrlParams(query: WantedQuery): URLSearchParams {
  const p = new URLSearchParams()
  if (query.q) p.set('q', query.q)
  if (query.status) p.set('status', query.status)
  if (query.crewId) p.set('crewId', query.crewId)
  if (query.fruit) p.set('fruit', query.fruit)
  if (query.sort !== DEFAULT_SORT) p.set('sort', query.sort)
  if (query.size !== DEFAULT_SIZE) p.set('size', String(query.size))
  if (query.page > 0) p.set('page', String(query.page))
  return p
}

// Parámetros completos para la API (siempre explícitos).
export function toApiParams(query: WantedQuery): string {
  const p = new URLSearchParams({ page: String(query.page), size: String(query.size), sort: query.sort })
  if (query.status) p.set('status', query.status)
  if (query.crewId) p.set('crewId', query.crewId)
  if (query.fruit) p.set('fruit', query.fruit)
  if (query.q) p.set('q', query.q)
  return p.toString()
}

// Caché en memoria de las últimas páginas vistas: al volver del detalle el listado aparece
// al instante, idéntico a como se dejó (y se revalida en segundo plano).
const pageCache = new Map<string, WantedPage>()
export function getCachedPage(key: string): WantedPage | undefined { return pageCache.get(key) }
export function setCachedPage(key: string, page: WantedPage): void {
  pageCache.delete(key)
  pageCache.set(key, page)
  if (pageCache.size > 30) {
    const oldest = pageCache.keys().next().value
    if (oldest !== undefined) pageCache.delete(oldest)
  }
}
