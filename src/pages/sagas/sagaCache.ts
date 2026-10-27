import type { SagaSummary } from '../../api/types'

// Resúmenes ya recibidos de /sagas: la historia puede mostrar el título al instante
// (y animarlo con View Transitions) mientras carga /sagas/{id}/story.
const summaries = new Map<string, SagaSummary>()

export function rememberSagas(list: SagaSummary[]): void {
  for (const saga of list) summaries.set(saga.id, saga)
}

export function getSagaSummary(id: string): SagaSummary | undefined {
  return summaries.get(id)
}

export function transitionName(id: string): string {
  return `saga-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`
}
