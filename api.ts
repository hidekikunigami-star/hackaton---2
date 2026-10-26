const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
  || 'https://logpose-api-jg7f.onrender.com/api/v1'

export class ApiError extends Error {
  status: number
  data: unknown
  constructor(message: string, status: number, data: unknown) { super(message); this.name = 'ApiError'; this.status = status; this.data = data }
}

export function getToken(): string | null { return localStorage.getItem('logpose_token') }
export function saveSession(token: string): void { localStorage.setItem('logpose_token', token) }
export function clearSession(): void { localStorage.removeItem('logpose_token') }

export async function request<T>(path: string, options: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData) && options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: signal ?? options.signal })
  const raw = await response.text()
  let data: unknown = null
  if (raw) { try { data = JSON.parse(raw) as unknown } catch { data = raw } }
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/register') {
      clearSession()
      window.dispatchEvent(new Event('logpose:unauthorized'))
    }
    const record = asRecord(data)
    const detail = record.detail ?? record.message ?? record.error
    const message = typeof detail === 'string' ? detail : `Error ${response.status}: no se pudo completar la solicitud.`
    throw new ApiError(message, response.status, data)
  }
  return data as T
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
export function asArray(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }
export function str(value: unknown, fallback = ''): string { return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback }
export function num(value: unknown, fallback = 0): number { return typeof value === 'number' && Number.isFinite(value) ? value : fallback }
export function prettyError(error: unknown): string { return error instanceof Error ? error.message : 'Ocurrió un error inesperado.' }
export function queryString(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && String(value).trim() !== '') params.set(key, String(value)) })
  const result = params.toString()
  return result ? `?${result}` : ''
}
