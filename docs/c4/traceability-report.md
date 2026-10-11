---
okf_version: 0.2
generated: 2026-10-10
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../specs/telemetria.md
  - ../../telemetry-api/src/main/java/dev/bryan/
  - ../../telemetry-api/src/test/java/dev/bryan/
  - ../../dashboard-next/features/autos/
c4_level: Code
focus_id: telemetry-api.simulacion.Simulador
focus_name: Simulador
focus_kind: code
focus_highlight: dark-red-700-border
component_path: .
---

# Reporte de trazabilidad

Del requisito (spec v3.1) al código, a las pruebas y a la vista C4 que lo muestra. El foco de las vistas sigue la regla del pack (borde dark red 700). Este reporte no tiene diagramas.

## Criterios de aceptación (spec §13)

| # | Criterio | Código | Pruebas | Vistas |
|---|---|---|---|---|
| 1 | El selector ofrece las 4 rutas y dibuja la elegida con Salida y Meta | `RutasResource`, `CatalogoRutas`, `carrera-panel.tsx`, `ruta-layer.tsx`, `salida-meta.tsx` | `SimulacionResourceTest` | [get-rutas](sequences/get-rutas.md), [get-rutas-id](sequences/get-rutas-id.md) |
| 2 | Salida conjunta en un solo sentido, llegada con tiempo y fin de carrera | `Simulador.iniciar/avanzar`, `AutoCorredor.avanzar` | `AutoCorredorTest`, `SimulacionResourceTest` | [post-simulacion-iniciar](sequences/post-simulacion-iniciar.md), J1 en [sequence-e2e](sequence-e2e.md) |
| 3 | Clasificación en vivo; el slider cambia el ritmo y el orden | `Simulador.estado/velocidad`, `ordenDeCarrera`, `carrera-panel.tsx` | `SimulacionResourceTest` | [get-simulacion](sequences/get-simulacion.md), [put-…-velocidad](sequences/put-simulacion-autos-carid-velocidad.md) |
| 4 | "Seguir al líder" mantiene en pantalla al primero | `autos-map.tsx` (efecto `seguirLider`, `Animador.posicionDe`) | Verificación manual con Edge headless (plan 12) | [component.md](component.md) · detalle dashboard |
| 5 | Filtro empresa → flota (Empresa 01: 2, Empresa 02: 1, todas: 3) | `filtros.ts`, `autos-layer.tsx` (`setFilter`) | Verificación manual (plan 10) | [component.md](component.md) · detalle dashboard |
| 6 | Latencia extremo a extremo p95 < 2 s | `AutosConsumer` por lotes y `@NonBlocking`, `AutosBroadcaster` 500 ms, `metricas.ts` | Medición en el panel (0,1–0,6 s observados) | [ws-autos](sequences/ws-autos.md), J1 |
| 7 | Un evento con `ts` antiguo no reemplaza a uno más reciente | `UltimaPosicionFunction`, `AutosStore.actualizar`, `fusionar` en `autos-map.tsx` | `UltimaPosicionJobTest`, `AutosStoreTest` | [component.md](component.md) · flink y autos |

## Requisitos funcionales

| Requisito | Código | Pruebas | Vistas |
|---|---|---|---|
| RF-S1 a RF-S6 (carrera) | `simulacion/*` | `AutoCorredorTest`, `RutaTest`, `SimulacionResourceTest` | [code.md](code.md), secuencias `/simulacion` |
| RF-F0 a RF-F4 (Flink) | `flink/*` | `UltimaPosicionJobTest`, `PosicionJsonTest` | [component.md](component.md) · flink, J2 |
| RF-Q1 a RF-Q2 (consumo y store) | `AutosConsumer`, `AutosStore` | `AutosStoreTest`, `AutoDeserializerTest` | [component.md](component.md) · autos |
| RF-Q3 (WebSocket por lotes) | `AutosBroadcaster`, `AutosWs` | `AutosWsTest` | [ws-autos](sequences/ws-autos.md) |
| RF-Q4 (`GET /autos` y `bbox`) | `AutosResource`, `Bbox` | `AutosResourceTest`, `BboxTest` | [get-autos](sequences/get-autos.md) |
| RF-Q5 (reconstrucción al arrancar) | `ReconstruirEstadoListener` | Verificación manual (`down`/`up`, plan 14) | J2 en [sequence-e2e](sequence-e2e.md) |
| RF-Q6 (errores `STD-ERR-001`) | `shared/error/*` | `AutosResourceTest`, `SimulacionResourceTest` (casos 400/404) | Ramas `alt` de cada secuencia |
| RF-U1 a RF-U12 (dashboard) | `dashboard-next/features/autos/**`, `components/{theme-provider,selector-tema}.tsx` | `npm run lint && npm run build` y verificación con Edge headless (planes 05–13) | [component.md](component.md) · detalle dashboard |

## Requisitos no funcionales

| RNF | Cómo se cumple | Evidencia |
|---|---|---|
| RNF-1 latencia p95 < 2 s | Lotes de 500 ms, consumidor por lotes en el event loop | Métrica del panel |
| RNF-2 orden por auto | Key `carId` en ambos topics; `keyBy(carId)` en Flink | `UltimaPosicionJob`, `Simulador.publicar` |
| RNF-3 movimiento continuo | Interpolación en `animacion.ts` con `requestAnimationFrame` | `autos-map.tsx` |
| RNF-4 100 % local | `docker-compose.yml` | [container.md](container.md) |
| RNF-5 sin seguridad ni HA | Sin autenticación; CORS limitado a `localhost:3000` | `application.properties` |

## Endpoints → secuencias

7 operaciones REST y 1 WebSocket; cobertura del 100 %, detallada en [sequence-e2e.md](sequence-e2e.md#api-rest-una-secuencia-por-endpoint). Origen `INFERRED` (controllers), sin especificación OpenAPI.
