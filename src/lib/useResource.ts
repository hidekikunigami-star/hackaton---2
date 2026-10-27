import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'success'; data: T }

// Carga un recurso con loading / error / reintento.
// Cada cambio de `path` (o reintento) cancela la request anterior con AbortController,
// así una respuesta vieja nunca pisa a la nueva.
export function useResource<T>(path: string) {
  const [state, setState] = useState<{ key: string; value: ResourceState<T> }>({ key: path, value: { status: 'loading' } })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState({ key: path, value: { status: 'loading' } })
    api<T>(path, { signal: controller.signal })
      .then((data) => setState({ key: path, value: { status: 'success', data } }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ key: path, value: { status: 'error', error } })
      })
    return () => controller.abort()
  }, [path, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const setData = useCallback((data: T) => setState({ key: path, value: { status: 'success', data } }), [path])

  // Si el path cambió y el efecto aún no corre, mostramos loading (nunca datos de otro recurso).
  const value: ResourceState<T> = state.key === path ? state.value : { status: 'loading' }
  return { state: value, retry, setData }
}
