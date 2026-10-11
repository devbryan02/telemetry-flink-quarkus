---
okf_version: 0.2
generated: 2026-10-10
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../docker-compose.yml
  - ../../telemetry-api/Dockerfile
  - ../../dashboard-next/Dockerfile
  - ../../telemetry-api/src/main/resources/application.properties
  - ../specs/telemetria.md
c4_level: Container
focus_id: telemetry-api
focus_name: telemetry-api (Quarkus + Flink embebido)
focus_kind: container
focus_highlight: dark-red-700-border
component_path: .
---

# Contenedores (C4 nivel 2)

**Sistema:** Sistema de telemetría de carreras · **Foco:** `telemetry-api` (borde dark red 700), el contenedor que concentra la simulación, el procesamiento en streaming y la entrega en tiempo real.

## Diagrama

```mermaid
flowchart TB
  navegador["Navegador del usuario<br/>ejecuta el bundle del dashboard"]
  dashboard["dashboard<br/>Next.js 16 · React 19 · Node 24<br/>:3000"]
  api["telemetry-api<br/>Quarkus 3.40 · Java 17 · Flink 2.2.1 embebido<br/>:8080 REST y WS · :8081 UI Flink"]
  kafka["kafka<br/>Apache Kafka 4.2.1 KRaft<br/>topics telemetria y ultima-posicion"]
  init["kafka-init<br/>crea los topics y termina"]
  volumen["volumen kafka-datos"]
  carto["CARTO Basemaps"]
  navegador -->|"HTTP · HTML y JS"| dashboard
  navegador -->|"REST JSON con axios<br/>WebSocket /ws/autos"| api
  navegador -->|"HTTPS estilos y teselas"| carto
  api -->|"produce telemetria<br/>Flink lee telemetria y escribe ultima-posicion<br/>consume ultima-posicion · kafka:29092"| kafka
  init -->|"kafka-topics.sh --create --if-not-exists"| kafka
  kafka -->|"datos"| volumen
  classDef other fill:#ECEFF1,stroke:#616161,stroke-width:2px,color:#000
  classDef focus fill:#FFEBEE,stroke:#B71C1C,stroke-width:4px,color:#000
  class navegador,dashboard,kafka,init,volumen,carto other
  class api focus
```

## Contenedores

| Contenedor | Tecnología | Responsabilidad | Puertos | Evidencia |
|---|---|---|---|---|
| **telemetry-api** (foco) | Quarkus 3.40.1 LTS, Java 17, Flink 2.2.1 en MiniCluster, SmallRye Reactive Messaging, websockets-next | Simula la carrera y publica en `telemetria`; el job Flink deja la última posición por auto en `ultima-posicion`; consume ese topic y sirve REST y WebSocket. | 8080 (REST y WS), 8081 (UI de Flink) | [`telemetry-api/Dockerfile`](../../telemetry-api/Dockerfile), `docker-compose.yml` · `EXTRACTED` |
| dashboard | Next.js 16.4 (salida `standalone`), React 19, shadcn/ui, mapcn (MapLibre), axios | Sirve la aplicación web. En el navegador: mapa, panel de carrera, filtros y tema. | 3000 | [`dashboard-next/Dockerfile`](../../dashboard-next/Dockerfile) · `EXTRACTED` |
| kafka | `apache/kafka:4.2.1`, un broker KRaft | Transporte de eventos: `telemetria` (12 particiones, retención 1 h) y `ultima-posicion` (12 particiones, compact), key `carId`. | 9092 (host), 29092 (red interna) | `docker-compose.yml`, spec §6 · `EXTRACTED` |
| kafka-init | `apache/kafka:4.2.1` | Crea los topics de forma idempotente y termina (`Exited (0)`). | — | `docker-compose.yml` · `EXTRACTED` |
| volumen `kafka-datos` | Volumen Docker | Persiste los logs de Kafka entre `down` y `up`. | — | `docker-compose.yml` · `EXTRACTED` |

> El navegador llama a la API directamente (no hay BFF): las URL `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_WS_URL` se incrustan al construir el dashboard y apuntan al puerto publicado `localhost:8080`.

## Relaciones runtime

| Origen → destino | Protocolo y contrato | Notas |
|---|---|---|
| Navegador → telemetry-api | REST JSON (`/rutas`, `/simulacion`, `/autos`), timeout de axios 15 s | CORS limitado a `http://localhost:3000`. Errores según `STD-ERR-001`. |
| Navegador → telemetry-api | WebSocket `/ws/autos`, lote JSON cada 500 ms | Reconexión con backoff 1 s → 10 s (`use-autos-socket.ts`). |
| telemetry-api → kafka | Kafka, JSON de 9 campos (spec §4), key `carId` | Productor de la simulación, `KafkaSource`/`KafkaSink` de Flink y consumidor `quarkus-dash`. |
| kafka-init → kafka | `kafka-topics.sh` | Se ejecuta antes de que arranque la API (`service_completed_successfully`). |

## Despliegue

`docker compose up -d --build`: `kafka` (healthy) → `kafka-init` (exit 0) → `telemetry-api` (healthy, `GET /rutas`) → `dashboard`. Todos con `restart: unless-stopped`, salvo `kafka-init`.

## Traceability

- sources: `docker-compose.yml`, Dockerfiles, `application.properties`, spec §3, §6, §9, §12
- related_artifacts: [context.md](context.md), [component.md](component.md)
- assumptions: ninguna
