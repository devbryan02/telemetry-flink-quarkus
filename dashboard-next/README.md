# dashboard-next

Interfaz web de la demo de telemetría en tiempo real: sigue la carrera de tres autos sobre un mapa, revisa los viajes guardados y muestra la salud del sistema. La arquitectura completa está en [`docs/c4/`](docs/c4/README.md).

## Pantallas

| Ruta | Qué muestra |
|---|---|
| `/` | **Carrera:** mapa con los autos en vivo, clasificación, control de velocidad por auto, filtro por empresa y flota, y modo claro u oscuro |
| `/viajes` | **Viajes:** carreras del día agrupadas, con filtros por estado, ruta y fecha |
| `/viajes/[viajeId]` | **Repetición:** recorrido de un viaje con reproductor (1x, 4x, 16x) y gráfico de velocidad |
| `/operacion` | **Operación:** salud de la API, flujo de eventos y métricas de ingesta |

## Tecnología

Next.js 16 · React 19 · TypeScript · Carbon Design System v12 · MapLibre (mapcn) · axios · Vitest.

Qué tiene de particular:

- **Organización por features** (`features/autos`, `features/viajes`, `features/operacion`): cada una con su cliente HTTP y su lógica, y comunicadas solo por su `index.ts`.
- **Mapa fluido:** el estado de los autos vive fuera de React y el movimiento se interpola entre eventos del WebSocket.
- **Lógica en funciones puras** con pruebas (interpolación, filtros, agrupación de carreras, parseo de métricas).
- **Reconexión automática** del WebSocket con espera creciente.

## Cómo ejecutarlo

Requiere **Node.js** y la API en marcha (`telemetry-api`).

```bash
cp .env.example .env.local     # URL de la API, del WebSocket y de la UI de Flink
npm install
npm run dev                    # http://localhost:3000
```

| Variable | Para qué sirve |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL de la API REST (por defecto `http://localhost:8080`) |
| `NEXT_PUBLIC_WS_URL` | URL del WebSocket de posiciones |
| `NEXT_PUBLIC_FLINK_UI_URL` | Enlace a la UI de Flink en la pantalla Operación |

En Docker estas variables son argumentos del build, porque las usa el navegador. Desde la raíz del repositorio: `docker compose up -d --build dashboard`.

## Verificación

```bash
npm test          # Vitest
npm run lint
npm run build
```

## Notas

- `app/carbon.generated.css` se genera con Sass (`npm run carbon:css`, que corre solo antes de `dev` y `build`) y no se versiona.
- `components/ui/map.tsx` lo genera mapcn; no se edita.
- Esta versión de Next.js tiene cambios incompatibles: consulta `node_modules/next/dist/docs/` antes de modificar la configuración (ver [`AGENTS.md`](AGENTS.md)).
- Decisión de interfaz: [`ADR-005`](../knowledge/adrs/ADR-005-ui-carbon-v12.md).

## Documentación

[Arquitectura C4](docs/c4/README.md): contexto, contenedores, componentes, código y siete recorridos de usuario.
