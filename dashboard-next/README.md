# Dashboard de telemetría

Next.js 16, React 19, Carbon Design System con flag v12 y mapcn/MapLibre. Las pantallas son Carrera (`/`), Viajes (`/viajes`), Repetición (`/viajes/[viajeId]`) y Operación (`/operacion`).

Copia `.env.example` a `.env.local` y ejecuta `npm ci` y `npm run dev`. La API debe estar disponible en `NEXT_PUBLIC_API_URL`; el WebSocket usa `NEXT_PUBLIC_WS_URL` y el enlace a Flink, `NEXT_PUBLIC_FLINK_UI_URL`. En Docker, estas variables son argumentos del build.

Verificación: `npm test`, `npm run lint` y `npm run build`. Vitest prueba funciones puras de `features/` y `lib/`.

`predev` y `prebuild` compilan `app/carbon.scss` con Sass a `app/carbon.generated.css` (no se versiona). Si editas Sass con el servidor abierto, ejecuta `npm run carbon:css`. `app/carbon.css` coloca Carbon en la capa CSS anterior a las utilidades de Tailwind, que no carga preflight. Las fuentes IBM Plex se sirven localmente con Fontsource.

Desde la raíz: `docker compose up -d --build dashboard`. El contrato y las decisiones están en `docs/specs/telemetria.md` §10 y `knowledge/adrs/ADR-005-ui-carbon-v12.md`.
