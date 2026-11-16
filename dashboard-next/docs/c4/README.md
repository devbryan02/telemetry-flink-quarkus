---
okf_version: 0.2
generated: 2026-11-16
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../CLAUDE.md
  - ../../../docker-compose.yml
  - ../../package.json
  - ../../Dockerfile
  - ../../features/
  - ../../app/
  - ../../../knowledge/adrs/ADR-005-ui-carbon-v12.md
c4_level: Context
focus_id: dashboard-next
focus_name: dashboard-next
focus_kind: system
focus_highlight: dark-red-700-border
component_path: dashboard-next
---

# Documentación C4 · dashboard-next

Pack C4 (**COMPONENT_MODE**) del dashboard: aplicación Next.js 16 con React 19, Carbon Design System con el flag v12 y MapLibre (mapcn). Tiene cuatro pantallas: Carrera (`/`), Viajes (`/viajes`), Repetición (`/viajes/[viajeId]`) y Operación (`/operacion`). Generado desde el código real del 2026-11-16.

**Estado:** `REQUIRES_REVIEW`. Falta la revisión humana y los diagramas no se validaron con Mermaid. Detalle en [documentation-review.md](documentation-review.md).

**Arquitectura descubierta:** frontend **por features** (`STD-ARCH-001`: `app/` → `features/<x>/` por su `index.ts` → `lib/`), con App Router. No hay Application Shell ni micro UI, y tampoco BFF: el navegador llama a `telemetry-api` directamente.

## Cómo leer las vistas

Cada vista tiene **un único foco**, con borde rojo oscuro (dark red 700). El rojo marca el foco, no un error ni un estado.

| Nivel | Documento | Foco | Pregunta que responde |
|---|---|---|---|
| 1 · Context | [context.md](context.md) | `dashboard-next` | Quién lo usa y con qué sistemas habla |
| 2 · Container | [container.md](container.md) | Aplicación en el navegador | Qué se despliega y dónde corre cada parte |
| 3 · Component | [component.md](component.md) | `features/autos` | Cómo se divide por rutas, features y librerías |
| 4 · Code | [code.md](code.md) | `AutosMap` | Qué funciones, hooks y capas la implementan |
| Secuencias | [sequence-e2e.md](sequence-e2e.md) | Componente de cada pantalla | Cómo viaja cada recorrido del usuario hasta `telemetry-api` y de vuelta |

Además: [traceability-report.md](traceability-report.md) y [documentation-review.md](documentation-review.md).

## Fuentes

- Contexto: [`CLAUDE.md`](../../../CLAUDE.md), [`ADR-005`](../../../knowledge/adrs/ADR-005-ui-carbon-v12.md), [`STD-ARCH-001`](../../../knowledge/standards/STD-ARCH-001-arquitectura-por-features.md) y [`README.md`](../../README.md) del dashboard.
- Código: [`app/`](../../app/), [`features/`](../../features/), [`components/`](../../components/), [`lib/`](../../lib/), [`next.config.ts`](../../next.config.ts), [`package.json`](../../package.json).
- Runtime: [`Dockerfile`](../../Dockerfile), [`docker-compose.yml`](../../../docker-compose.yml), [`.env.example`](../../.env.example).
- El backend que consume tiene su propio pack C4 (`telemetry-api/docs/c4/`, en la rama `feature/inc-28-c4-telemetry-api` hasta que se mergee). Aquí `telemetry-api` es un sistema externo.
- No hay DCP ni DTC formales: su papel lo cumplen `CLAUDE.md` y los ADR.

## Diagramas

Fuentes Mermaid en [`diagrams/`](diagrams/). Los flowcharts marcan el foco con `classDef focus`; las secuencias, con el `init` de `themeCSS` y el alias `R`.
