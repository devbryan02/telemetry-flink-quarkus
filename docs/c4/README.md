---
okf_version: 0.2
generated: 2026-10-10
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../specs/telemetria.md
  - ../../README.md
  - ../../CLAUDE.md
  - ../../knowledge/adrs/ADR-003-stack-quarkus-flink-embebido-nextjs.md
c4_level: Context
focus_id: sistema-telemetria
focus_name: Sistema de telemetría de carreras
focus_kind: system
focus_highlight: dark-red-700-border
component_path: .
---

# Documentación C4 · Telemetría de carreras

Pack C4 (**PRODUCT_MODE**) del sistema completo, generado desde el código, la spec y `docker-compose.yml`. La fuente de verdad funcional sigue siendo [`docs/specs/telemetria.md`](../specs/telemetria.md).

**Estado:** `REQUIRES_REVIEW`: falta revisión humana y la API no tiene especificación OpenAPI (ver [documentation-review.md](documentation-review.md)).

## Cómo leer las vistas

Cada vista tiene **un único foco**, con borde rojo oscuro (dark red 700). El rojo marca el foco, no un error ni un estado.

| Nivel | Documento | Foco | Pregunta que responde |
|---|---|---|---|
| 1 · Context | [context.md](context.md) | Sistema de telemetría de carreras | Quién lo usa y con qué sistemas externos habla |
| 2 · Container | [container.md](container.md) | `telemetry-api` | Qué se despliega y cómo se comunica |
| 3 · Component | [component.md](component.md) | Feature `simulacion` (y un foco por vista de detalle) | Cómo se divide cada contenedor |
| 4 · Code | [code.md](code.md) | Clase `Simulador` | Qué clases y módulos lo implementan |
| Secuencias | [sequence-e2e.md](sequence-e2e.md) | Participante del componente | Cómo viaja una interacción de punta a punta, endpoint por endpoint |

Además: [traceability-report.md](traceability-report.md) (requisitos → código → pruebas → vistas) y [documentation-review.md](documentation-review.md) (gates de calidad).

## Fuentes

- Spec: [`docs/specs/telemetria.md`](../specs/telemetria.md) v3.1 · Planes: [`docs/plans/`](../plans/README.md)
- Decisiones: [`ADR-003`](../../knowledge/adrs/ADR-003-stack-quarkus-flink-embebido-nextjs.md) (stack), [`STD-ARCH-001`](../../knowledge/standards/STD-ARCH-001-arquitectura-por-features.md) (features), [`STD-ERR-001`](../../knowledge/standards/STD-ERR-001-manejo-de-errores-http.md) (errores)
- Código: [`telemetry-api/src/main/java/dev/bryan/`](../../telemetry-api/src/main/java/dev/bryan/), [`dashboard-next/features/autos/`](../../dashboard-next/features/autos/)
- Runtime: [`docker-compose.yml`](../../docker-compose.yml)
- No hay DCP ni DTC formales: su papel lo cumplen la spec y los planes.

## Diagramas

Fuentes Mermaid en [`diagrams/`](diagrams/), compatibles con Mermaid 8.10.2 (GitLab) y legibles en tema claro y oscuro.
