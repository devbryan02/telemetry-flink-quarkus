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
  - ../../Dockerfile
  - ../../pom.xml
  - ../../src/main/resources/application.properties
c4_level: Container
focus_id: telemetry-api
focus_name: telemetry-api
focus_kind: container
focus_highlight: dark-red-700-border
component_path: telemetry-api
---

# Contenedores (C4 nivel 2)

**Foco:** `telemetry-api` (borde dark red 700). Contiene el MiniCluster de Flink en la misma JVM.

## Diagrama

```mermaid
flowchart TB
  navegador["Navegador del usuario"]
  dash["dashboard<br/>Next.js 16 standalone :3000"]
  subgraph apiBox["telemetry-api · Quarkus 3.40.1, Java 17, :8080 y :8081"]
    api["telemetry-api<br/>REST, WebSocket, simulación,<br/>consumidores Kafka"]
    flink["Flink 2.2.1 MiniCluster<br/>job ultima-posicion, UI :8081"]
  end
  kafka["kafka<br/>apache/kafka:4.2.1 KRaft<br/>9092 host · kafka:29092 interno"]
  init["kafka-init<br/>crea los topics y termina"]
  pg["postgres<br/>postgres:17 · :5432 · volumen postgres-datos"]
  navegador --> dash
  navegador -->|"REST y WS /ws/autos"| api
  dash -.->|"NEXT_PUBLIC_* incrustadas al construir"| api
  api -->|"publica telemetria key carId"| kafka
  kafka -->|"KafkaSource"| flink
  flink -->|"KafkaSink ultima-posicion"| kafka
  kafka -->|"lotes de ultima-posicion<br/>grupo quarkus-dash-postgres"| api
  kafka -->|"lotes de telemetria<br/>grupo quarkus-viajes-postgres"| api
  api -->|"Hibernate ORM y Panache sobre Agroal<br/>Flyway migrate-at-start"| pg
  init -->|"kafka-topics.sh"| kafka
  classDef other fill:#ECEFF1,stroke:#616161,stroke-width:2px,color:#000
  classDef focus fill:#FFEBEE,stroke:#B71C1C,stroke-width:4px,color:#000
  class navegador,dash,flink,kafka,init,pg other
  class api focus
```

Fuente: [`diagrams/container.mmd`](diagrams/container.mmd).

## Contenedores

| Contenedor | Tecnología | Puertos | Notas |
|---|---|---|---|
| `telemetry-api` | Quarkus 3.40.1 LTS, Java 17, Flink 2.2.1 embebido, SmallRye Reactive Messaging, websockets-next, Hibernate ORM con Panache, Flyway, SmallRye Health, Micrometer | 8080 (REST y WS), 8081 (UI de Flink) | Imagen multietapa con el fast-jar por capas, usuario no root, `mem_limit: 2g`, healthcheck `GET /q/health/ready` ([`Dockerfile`](../../Dockerfile)) |
| `postgres` | `postgres:17` | 5432 | Volumen `postgres-datos`; el esquema lo crea Flyway y Hibernate lo valida |
| `kafka` | `apache/kafka:4.2.1` (KRaft) | 9092 host, `kafka:29092` interno | Volumen `kafka-datos`; la 4.0.x se evita por KAFKA-19888 |
| `kafka-init` | `apache/kafka:4.2.1` | — | Crea `telemetria` (12 particiones, retención 1 h) y `ultima-posicion` (12 particiones, compact) y termina |
| `dashboard` | Next.js 16 | 3000 | Fuera del foco |

## Relaciones en runtime

| Relación | Mecanismo | Detalle |
|---|---|---|
| `telemetry-api` → `kafka` | Emitter `telemetria-out`, clave `carId` | Contrato v2 del evento; publicación por auto en orden |
| `kafka` → Flink → `kafka` | `KafkaSource` → `keyBy(carId)` → `KafkaSink` | Grupo `flink-ultima-pos`; solo emite si el `ts` es mayor; arranca en `latest` y sin checkpoints |
| `kafka` → `telemetry-api` | `@Incoming` por lotes | `ultima-posicion` (grupo `quarkus-dash-postgres`) y `telemetria` (grupo `quarkus-viajes-postgres`); `failure-strategy=fail` |
| `telemetry-api` → `postgres` | Hibernate/Panache sobre Agroal | Flyway `migrate-at-start`; `clean-disabled=true` |
| Navegador → `telemetry-api` | REST y WebSocket `/ws/autos` | CORS al origen del dashboard |

## Traceability

- Anterior: [context.md](context.md) · Siguiente: [component.md](component.md)
