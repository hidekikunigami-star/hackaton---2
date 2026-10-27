import { flushSync } from 'react-dom'
import { prefersReducedMotion } from './format'

// Usa la View Transition API cuando existe (y el usuario no pidió menos movimiento).
// Si no existe, simplemente navega: comportamiento normal.
export function withViewTransition(update: () => void): void {
  if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    update()
    return
  }
  // flushSync obliga a React a pintar la nueva ruta dentro del callback,
  // así el navegador puede capturar el "antes" y el "después".
  document.startViewTransition(() => {
    flushSync(update)
  })
}
