---
okf_version: 0.2
generated: 2026-11-16
verified: true
human-reviewed: true
review_date: 2026-11-16
review_evidence: confirmacion expresa del responsable del repositorio en la sesion de Claude Code
status: READY_FOR_DEV
provenance: agent-generated
sources:
  - ../../../CLAUDE.md
  - ../../../docker-compose.yml
  - ../../pom.xml
  - ../../src/main/resources/application.properties
  - ../../src/main/java/dev/bryan/
  - ../../../knowledge/adrs/ADR-006-arquitectura-hexagonal-backend.md
  - ../../../knowledge/adrs/ADR-007-persistencia-hibernate-panache.md
c4_level: Context
focus_id: telemetry-api
focus_name: telemetry-api
focus_kind: system
focus_highlight: dark-red-700-border
component_path: telemetry-api
---

# Documentación C4 · telemetry-api

Pack C4 (**COMPONENT_MODE**) del microservicio `telemetry-api`: Quarkus 3.40.1 con Flink 2.2.1 embebido, arquitectura hexagonal ([`ADR-006`](../../../knowledge/adrs/ADR-006-arquitectura-hexagonal-backend.md)) y persistencia con Hibernate ORM y Panache ([`ADR-007`](../../../knowledge/adrs/ADR-007-persistencia-hibernate-panache.md)). Generado desde el código real del 2026-11-16 (rama `develop` con `inc-26`).

**Estado:** `READY_FOR_DEV`. El responsable del repositorio revisó el pack y confirmó marcarlo como verificado y revisado el 2026-11-16 (`human-reviewed: true`, con la confirmación expresa como evidencia). Quedan abiertos los puntos de [documentation-review.md](documentation-review.md), entre ellos que los diagramas no se validaron con Mermaid.

## Cómo leer las vistas

Cada vista tiene **un único foco**, con borde rojo oscuro (dark red 700). El rojo marca el foco, no un error ni un estado.

| Nivel | Documento | Foco | Pregunta que responde |
|---|---|---|---|
| 1 · Context | [context.md](context.md) | `telemetry-api` | Quién lo usa y con qué sistemas habla |
| 2 · Container | [container.md](container.md) | `telemetry-api` (contenedor) | Qué se despliega y cómo se comunica |
| 3 · Component | [component.md](component.md) | Servicios de `application` | Cómo se divide por capas hexagonales |
| 4 · Code | [code.md](code.md) | Clase `SimulacionService` | Qué clases y puertos la implementan |
| Secuencias | [sequence-e2e.md](sequence-e2e.md) | Participante del componente | Cómo viaja cada endpoint y cada flujo de eventos |

Además: [traceability-report.md](traceability-report.md) (comportamiento → código → pruebas → vistas) y [documentation-review.md](documentation-review.md) (gates de calidad y divergencias).

## Fuentes

- Contexto: [`CLAUDE.md`](../../../CLAUDE.md), [`ADR-003`](../../../knowledge/adrs/ADR-003-stack-quarkus-flink-embebido-nextjs.md), [`ADR-004`](../../../knowledge/adrs/ADR-004-persistencia-postgresql-jdbc.md), [`ADR-006`](../../../knowledge/adrs/ADR-006-arquitectura-hexagonal-backend.md), [`ADR-007`](../../../knowledge/adrs/ADR-007-persistencia-hibernate-panache.md).
- Código: [`src/main/java/dev/bryan/`](../../src/main/java/dev/bryan/), [`application.properties`](../../src/main/resources/application.properties), [`db/migration/`](../../src/main/resources/db/migration/), [`pom.xml`](../../pom.xml).
- Runtime: [`docker-compose.yml`](../../../docker-compose.yml), [`Dockerfile`](../../Dockerfile).
- No hay DCP ni DTC formales: su papel lo cumplen `CLAUDE.md` y los ADR. Las specs y los planes que existieron en `docs/` se eliminaron del repositorio.

## Diagramas

Fuentes Mermaid en [`diagrams/`](diagrams/). Los flowcharts marcan el foco con `classDef focus`; las secuencias, con el `init` de `themeCSS` y el alias `R`.
