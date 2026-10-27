// Tipos tomados del contrato público de la API (Swagger: /docs).

export const WANTED_STATUSES = ['AT_LARGE', 'CAPTURED', 'MISSING'] as const
export type WantedStatus = (typeof WANTED_STATUSES)[number]

export const FRUIT_FILTERS = ['PARAMECIA', 'ZOAN', 'LOGIA', 'NONE'] as const
export type FruitFilter = (typeof FRUIT_FILTERS)[number]
export type FruitType = Exclude<FruitFilter, 'NONE'>

export const WANTED_SORTS = ['bounty,desc', 'name,asc', 'updatedAt,desc'] as const
export type WantedSort = (typeof WANTED_SORTS)[number]

export const PAGE_SIZES = [10, 20, 50] as const
export type PageSize = (typeof PAGE_SIZES)[number]

export const NEWS_TYPES = ['BOUNTY_UPDATE', 'BATTLE', 'MARINE_OPERATION', 'WORLD_GOVERNMENT', 'DISCOVERY'] as const
export type NewsType = (typeof NEWS_TYPES)[number]

export const NEWS_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export type NewsPriority = (typeof NEWS_PRIORITIES)[number]

export const NEWS_STATUSES = ['RUMOR', 'CONFIRMED', 'DEBUNKED'] as const
export type NewsStatus = (typeof NEWS_STATUSES)[number]

export type CrewRole =
  | 'CAPTAIN' | 'FIRST_MATE' | 'NAVIGATOR' | 'SNIPER' | 'COOK' | 'DOCTOR'
  | 'SHIPWRIGHT' | 'MUSICIAN' | 'ARCHAEOLOGIST' | 'HELMSMAN' | 'FIGHTER'

export interface User { id: string; name: string; email: string }
export interface Team { code: string; name: string }

export interface LoginResponse {
  token: string
  tokenType: 'Bearer'
  expiresAt: string
  user: User
  team: Team
}

export interface MeResponse { user: User; team: Team; expiresAt: string }

export interface CrewRef { id: string; name: string }

export interface Crew {
  id: string
  name: string
  shipName: string
  jollyRogerColor: string
  memberCount: number
  totalBounty: number
}

export interface DevilFruit { name: string; type: FruitType }

export interface WantedSummary {
  id: string
  name: string
  epithet: string
  bounty: number
  status: WantedStatus
  crew: CrewRef
  role: CrewRole
  devilFruit: DevilFruit | null
  threatLevel: number
  lastSeenIsland: string
  updatedAt: string
}

export interface WantedDetail extends WantedSummary {
  age: number
  heightCm: number
  bio: string
  lastSeen: { island: string; seenAt: string }
  bountyHistory: { amount: number; issuedAt: string }[]
}

export interface WantedPage {
  content: WantedSummary[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

export interface DashboardSummary {
  team: Team
  wanted: {
    total: number
    totalBounty: number
    averageBounty: number
    byStatus: Record<WantedStatus, number>
    byFruit: Record<FruitFilter, number>
  }
  crews: { total: number; mostWanted: Crew | null }
  topBounties: WantedSummary[]
  generatedAt: string
}

export interface LogPose {
  status: 'LOCKED' | 'UNLOCKED'
  grandLineUnlocked: boolean
  unlockedAt: string | null
  message: string
}

export interface NewsItem {
  id: string
  type: NewsType
  priority: NewsPriority
  status: NewsStatus
  title: string
  summary: string
  source: string
  island: string
  relatedWanted: { id: string; name: string } | null
  publishedAt: string
  updatedAt: string
  verifiedAt: string | null
}

export interface NewsDetail extends NewsItem { body: string[] }

export interface NewsFeed { items: NewsItem[]; nextCursor: string | null; hasMore: boolean }

export interface Palette { background: string; surface: string; primary: string; accent: string; text: string }

export interface SagaSummary {
  id: string
  order: number
  title: string
  subtitle: string
  synopsis: string
  stageCount: number
  totalDistanceNm: number
  firstIsland: string
  lastIsland: string
  palette: Palette
}

export interface StageMetric {
  key: 'distanceNm' | 'crewMorale' | 'bountyPool' | 'marineThreat'
  label: string
  value: number
  unit: string
}

export interface SagaStage {
  id: string
  order: number
  slug: string
  title: string
  narrative: string[]
  island: { id: string; name: string; x: number; y: number }
  palette: Palette
  metrics: StageMetric[]
}

export interface SagaStory {
  saga: SagaSummary & { intro: string }
  map: { width: number; height: number }
  stages: SagaStage[]
}

export interface ApiErrorBody {
  status: number
  code: string
  message: string
  traceId?: string
  details?: { field: string; message: string }[]
  retryAfterSeconds?: number
  current?: NewsDetail
}

// Helper para validar valores que vienen de la URL contra una lista cerrada.
export function pickEnum<T extends string | number>(list: readonly T[], value: unknown): T | undefined {
  return list.find((item) => String(item) === String(value))
}
