import type { ApiErrorBody } from './types'

// La URL base SIEMPRE viene de la variable de entorno (nada escrito en el código).
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const TOKEN_KEY = 'logpose_token'

export class ApiError extends Error {
  status: number
  code: string
  details: { field: string; message: string }[]
  body: ApiErrorBody | null

  constructor(status: number, code: string, message: string, body: ApiErrorBody | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = body?.details ?? []
    this.body = body
  }
}

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* almacenamiento no disponible: la sesión dura solo en memoria */ }
}

// Quien maneja la sesión (AuthProvider) se suscribe para enterarse de un 401.
type Listener = () => void
const unauthorizedListeners = new Set<Listener>()
export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener)
  return () => { unauthorizedListeners.delete(listener) }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'code' in value && 'message' in value
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
  signal?: AbortSignal
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers({ Accept: 'application/json' })
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', null)
  }

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try { data = JSON.parse(text) } catch { data = null }
  }

  if (!response.ok) {
    const body = isErrorBody(data) ? data : null
    // Sesión inválida o vencida: solo si mandamos un token (un login fallido también es 401).
    if (response.status === 401 && token) unauthorizedListeners.forEach((listener) => listener())
    const message = body?.message ?? `Error ${response.status}: no se pudo completar la solicitud.`
    throw new ApiError(response.status, body?.code ?? 'UNKNOWN', message, body)
  }

  return data as T
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'RATE_LIMITED') {
      const wait = error.body?.retryAfterSeconds
      return `Demasiadas solicitudes seguidas. Espera ${wait ?? 'unos'} segundos y reintenta.`
    }
    return error.message
  }
  return 'Ocurrió un error inesperado.'
}
