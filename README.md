# Log Pose Console — One Piece: Rumbo al Grand Line

Frontend para la hackathon, construido con React 18, TypeScript estricto, Vite, React Router y Tailwind CSS. La información se consulta desde la API del curso; no incluye backend, seeds ni credenciales.

## Requisitos

- Node.js 24 LTS
- npm
- Acceso a `https://logpose-api-jg7f.onrender.com`

## Ejecutar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

En Windows PowerShell, si no tienes `cp`, usa `Copy-Item .env.example .env.local`. La variable `VITE_API_BASE_URL` apunta por defecto a la API oficial del curso. Puedes cambiarla en `.env.local`.

## Build de producción

```bash
npm run build
npm run preview
```

## Checkpoints implementados

- **CP1 — Zarpar:** registro, login, sesión persistente, restauración con `/auth/me`, rutas protegidas, logout, dashboard con datos de API, estados de carga/error y página 404.
- **CP2 — Se Busca:** filtros combinables, búsqueda con debounce, paginación real del servidor, ordenamiento y tamaño de página sincronizados con la URL, cancelación de solicitudes anteriores y detalle del objetivo.
- **CP3 — Reverse Mountain:** visualización del estado real del Log Pose y acceso a News Coo / Poneglyph sujeto al control de acceso de la API.
- **CP4 — News Coo:** feed con cursor, carga al acercarse al final, deduplicación, filtros en URL, detalle y verificación de rumores con loading/error.
- **CP5 — Poneglyph:** resumen de sagas y narración por etapas, mapa persistente con ruta recorrida, métricas por etapa, progreso, navegación por teclado, URL por etapa y soporte de `prefers-reduced-motion`.

## Antes de entregar

1. Completar `hackathon.json` con el `TEAM_CODE` de la cuenta usada para CP3 y los nombres/códigos de los tres integrantes.
2. Verificar en Swagger los nombres exactos de campos de respuestas y enums del workspace de la tripulación. Los componentes aceptan variantes comunes, pero el contrato de la API es la fuente de verdad.
3. Registrar la tripulación oficial y probar el flujo completo con las credenciales del equipo; no subir credenciales al repositorio.
4. Ejecutar `npm run build` y subir el `package-lock.json` generado por `npm install`.

## Estructura

- `src/api.ts`: cliente Fetch con JWT, manejo de errores y helpers de tipado seguro.
- `src/App.tsx`: rutas, autenticación y páginas de los cinco checkpoints.
- `src/styles.css`: sistema visual adaptable a escritorio y móvil.
