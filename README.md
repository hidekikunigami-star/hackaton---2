# Log Pose Console — One Piece: Rumbo al Grand Line

Frontend de la hackathon en React 18 + TypeScript estricto + Vite + React Router + Tailwind CSS.
Toda la data viene de la API del curso; no incluye backend, seeds ni credenciales.

## Integrantes

| Nombre | Código |
|:-------|:-------|
| _Completar_ | _Completar_ |
| _Completar_ | _Completar_ |
| _Completar_ | _Completar_ |

## Cómo ejecutar

Requisitos: Node.js 24 LTS y npm.

```bash
npm install
cp .env.example .env.local      # PowerShell: Copy-Item .env.example .env.local
npm run dev
```

`.env.local` debe tener:

```txt
VITE_API_BASE_URL=https://logpose-api-jg7f.onrender.com/api/v1
```

Build de producción: `npm run build` y `npm run preview`.

## Estructura

```txt
src/
  api/client.ts        cliente fetch: token Bearer, errores tipados (ApiError), aviso de 401
  api/types.ts         tipos y enums del contrato (Swagger)
  auth/AuthContext.tsx sesión: estados checking | authenticated | anonymous | error
  auth/guards.tsx      PrivateRoute (guarda `from`) y PublicOnlyRoute (redirige a `from`)
  components/          Layout y estados comunes (loading, error con reintento, vacío, 423)
  lib/useResource.ts   carga con AbortController + reintento
  pages/Dashboard.tsx  CP1: /dashboard/summary + /log-pose
  pages/wanted/        CP2: listado con estado en la URL y detalle
  pages/news/          CP4: feed con cursor + infinite scroll y verificación de rumores
  pages/sagas/         CP5: resumen de sagas y scrollytelling
```

## Cómo funciona (resumen por checkpoint)

**CP1 — Zarpar.** Si hay token guardado, la app arranca en estado `checking` y valida con `/auth/me`
mostrando una pantalla de carga (nunca el login). `PrivateRoute` manda al login guardando la ubicación
completa (`pathname + search + hash`) en `state.from`; al iniciar sesión, `PublicOnlyRoute` redirige ahí
con `replace`. Cualquier 401 (o el vencimiento de `expiresAt`) cierra la sesión y vuelve al login.
El registro devuelve la sesión iniciada; los errores 400/409 se muestran junto al campo correspondiente.

**CP2 — Se Busca.** La URL es la única fuente de verdad (`useSearchParams`). Cada valor se valida contra
el contrato y se normaliza con `replace`. Cambiar filtro/búsqueda/orden/tamaño borra `page` en la misma
actualización; si la API indica que la página no existe, se corrige a la última válida. La búsqueda usa
debounce (400 ms). Cada request se cancela con `AbortController` cuando cambia la URL, así una respuesta
vieja nunca pisa la nueva. Se conserva la página anterior mientras carga (sin saltos de layout). El
detalle vuelve con `navigate(-1)`: misma URL, mismo listado y misma posición de scroll.

**CP4 — News Coo.** Feed por cursor con `IntersectionObserver` sobre un sentinel; un `ref` impide más de
una carga en vuelo y un `Set` de ids evita duplicados. Al cambiar filtros se aborta la carga en vuelo y se
descarta cualquier respuesta de otros filtros. Un error en una carga adicional no borra lo cargado. El
feed se guarda en memoria por filtros: al volver del detalle se restaura sin pedir de nuevo y en la misma
posición. La verificación deshabilita los botones en vuelo, muestra confirmación o un error con
reintento, y actualiza el feed guardado.

**CP5 — Poneglyph.** `/sagas/:id?stage=<slug>`: la URL indica la etapa activa y abrirla salta directo a
esa etapa. La etapa activa sale del scroll; el mapa SVG (coordenadas reales de la API) es persistente
(sticky en desktop y mobile), dibuja la ruta recorrida y mueve el barco. Colores y métricas salen de la
etapa activa. Progreso con CSS Scroll-driven Animations (`animation-timeline`) y respaldo en JS. View
Transition API entre el listado y la historia cuando existe. Teclado: `←/→` o `j/k`, y `Tab` recorre las
etapas. Con `prefers-reduced-motion` no hay animaciones y todo el contenido queda visible.

## Antes de entregar

1. Completar `hackathon.json` con el `TEAM_CODE` de la cuenta con la que pidieron la inspección del CP3 y los integrantes.
2. Completar la tabla de integrantes de este README.
3. `npm run build` sin errores.
