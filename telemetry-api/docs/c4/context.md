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
  - ../../../docker-compose.yml
  - ../../src/main/resources/application.properties
  - ../../../knowledge/adrs/ADR-003-stack-quarkus-flink-embebido-nextjs.md
  - ../../../knowledge/adrs/ADR-004-persistencia-postgresql-jdbc.md
c4_level: Context
focus_id: telemetry-api
focus_name: telemetry-api
focus_kind: system
focus_highlight: dark-red-700-border
component_path: telemetry-api
---

# Contexto (C4 nivel 1)

**Foco:** `telemetry-api`, el sistema bajo documentación (borde dark red 700).

## Diagrama

```mermaid
flowchart TB
  usuario["Usuario<br/>sigue la carrera en el navegador"]
  operador["Desarrollador u operador<br/>levanta el sistema, observa Flink<br/>y consulta salud, métricas e historial"]
  dash["Dashboard Next.js<br/>mapa, clasificación, viajes y operación"]
  api["telemetry-api<br/>simulación, Flink embebido,<br/>ingesta por Kafka, REST y WebSocket"]
  kafka["Apache Kafka 4.2.1<br/>topics telemetria y ultima-posicion"]
  pg["PostgreSQL 17<br/>última posición e historial de viajes"]
  usuario -->|"elige ruta, inicia, ajusta velocidades"| dash
  dash -->|"REST y WebSocket :8080"| api
  operador -->|"UI de Flink :8081, /q/health y /q/metrics"| api
  api -->|"publica y consume eventos v2"| kafka
  api -->|"Hibernate y Panache, Flyway al arrancar"| pg
  classDef other fill:#ECEFF1,stroke:#616161,stroke-width:2px,color:#000
  classDef focus fill:#FFEBEE,stroke:#B71C1C,stroke-width:4px,color:#000
  class usuario,operador,dash,kafka,pg other
  class api focus
```

Fuente: [`diagrams/context.mmd`](diagrams/context.mmd).

## Elementos

| Elemento | Tipo | Rol | Procedencia |
|---|---|---|---|
| Usuario | Persona | Sigue la carrera, elige ruta, inicia y ajusta velocidades desde el dashboard | `EXTRACTED` ([`SimulacionResource`](../../src/main/java/dev/bryan/infrastructure/in/rest/SimulacionResource.java)) |
| Desarrollador u operador | Persona | Levanta el stack, observa Flink en `:8081` y consulta `/q/health/ready`, `/q/metrics` y el historial | `EXTRACTED` ([`docker-compose.yml`](../../../docker-compose.yml), `application.properties`) |
| Dashboard Next.js | Sistema hermano | Cliente REST y WebSocket de `telemetry-api`; no se documenta en este pack | `EXTRACTED` (CORS a `http://localhost:3000`) |
| `telemetry-api` | Sistema foco | Simula la carrera, ejecuta el job de Flink, consume y persiste, expone REST y WebSocket | `EXTRACTED` |
| Apache Kafka | Sistema externo | Bus entre simulación, Flink y los consumidores | `EXTRACTED` (`application.properties`) |
| PostgreSQL | Sistema externo | Última posición e historial de viajes | `EXTRACTED` (`application.properties`, migración `V1`) |

## Límites y supuestos

- El pack cubre solo `telemetry-api`. El dashboard aparece como cliente; sus pantallas y su mapa base no se describen.
- Las rutas salen de archivos GeoJSON dentro del propio servicio (`resources/rutas/`); no hay una llamada externa en runtime.
- No hay autenticación ni autorización (ver [documentation-review.md](documentation-review.md)). CORS solo permite el origen configurado.

## Traceability

- Siguiente nivel: [container.md](container.md) · Resumen: [README.md](README.md)
