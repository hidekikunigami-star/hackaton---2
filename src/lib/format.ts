import type { CrewRole, FruitFilter, NewsPriority, NewsStatus, NewsType, WantedStatus } from '../api/types'

export function berries(value: number): string {
  return `฿ ${value.toLocaleString('es-PE')}`
}

export function compactBerries(value: number): string {
  return `฿ ${new Intl.NumberFormat('es-PE', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
}

export const WANTED_STATUS_LABEL: Record<WantedStatus, string> = {
  AT_LARGE: 'Prófugo',
  CAPTURED: 'Capturado',
  MISSING: 'Desaparecido',
}

export const FRUIT_LABEL: Record<FruitFilter, string> = {
  PARAMECIA: 'Paramecia',
  ZOAN: 'Zoan',
  LOGIA: 'Logia',
  NONE: 'Sin fruta',
}

export const ROLE_LABEL: Record<CrewRole, string> = {
  CAPTAIN: 'Capitán',
  FIRST_MATE: 'Primer oficial',
  NAVIGATOR: 'Navegante',
  SNIPER: 'Francotirador',
  COOK: 'Cocinero',
  DOCTOR: 'Médico',
  SHIPWRIGHT: 'Carpintero',
  MUSICIAN: 'Músico',
  ARCHAEOLOGIST: 'Arqueólogo',
  HELMSMAN: 'Timonel',
  FIGHTER: 'Combatiente',
}

export const NEWS_TYPE_LABEL: Record<NewsType, string> = {
  BOUNTY_UPDATE: 'Recompensas',
  BATTLE: 'Batalla',
  MARINE_OPERATION: 'Operación Marine',
  WORLD_GOVERNMENT: 'Gobierno Mundial',
  DISCOVERY: 'Descubrimiento',
}

export const NEWS_PRIORITY_LABEL: Record<NewsPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

export const NEWS_STATUS_LABEL: Record<NewsStatus, string> = {
  RUMOR: 'Rumor',
  CONFIRMED: 'Confirmada',
  DEBUNKED: 'Desmentida',
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
