# 06 · Next.js: mapa con carga inicial

**Objetivo:** dashboard que pinta en un mapa los autos devueltos por `GET /autos`.
**Depende de:** 03 · **Spec:** §10 (RF-U1, RF-U2, RF-U4) · **Estándares:** `STD-ARCH-001`

## Alcance
- **Incluye:** proyecto Next.js, shadcn, mapcn, axios, feature `autos` con tipos, API y mapa.
- **No incluye:** WebSocket, contadores, popup (07).

## Tareas
- [ ] Crear el proyecto (comandos en spec §10): Next.js 16, TypeScript, Tailwind, App Router; `shadcn init`; `add card badge tooltip @mapcn/map`; `npm i axios`.
- [ ] `.env.local` con `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_WS_URL`.
- [ ] `lib/http.ts`: instancia axios con `baseURL`.
- [ ] `features/autos/types.ts` (tipo `Auto`), `features/autos/api.ts` (`obtenerAutos()`), `features/autos/index.ts`.
- [ ] `features/autos/components/autos-map.tsx` (`"use client"`): mapa centrado en `[-77.0428, -12.0464]` zoom 11; una fuente GeoJSON y una capa `circle` (radio 3–4); color por `engine` con expresión `match`.
- [ ] `app/page.tsx` carga el mapa con `dynamic(..., { ssr: false })`, pantalla completa.

## Archivos
`dashboard-next/**` según la estructura de la spec §13 (`app/`, `features/autos/`, `components/ui/`, `lib/`).

## Verificación
```bash
cd dashboard-next && npm run build && npm run dev
# con Quarkus y datos en ultima-posicion
```
Abrir `http://localhost:3000`. Esperado: mapa de Lima con los autos como puntos verdes/rojos, sin errores de CORS ni de SSR en consola.

## Rama y commit
`feature/inc-06-next-mapa` · `feat(dashboard): agrega mapa con carga inicial de autos`

## Hecho cuando
Con 10.000 autos en el backend, el mapa los muestra todos tras la carga inicial y `npm run build` pasa.
