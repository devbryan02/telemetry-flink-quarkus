---
okf_version: 0.2
generated: 2026-10-10
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../telemetry-api/src/main/java/dev/bryan/simulacion/
  - ../../telemetry-api/src/main/java/dev/bryan/flink/
  - ../../telemetry-api/src/main/java/dev/bryan/autos/
  - ../../dashboard-next/features/autos/
  - ../../docker-compose.yml
  - ../specs/telemetria.md
c4_level: Sequence
focus_id: telemetry-api
focus_name: telemetry-api
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: .
---

# Secuencias E2E

## Journeys críticos

### J1 · Carrera en vivo: del botón al mapa

Atraviesa todo el sistema: dashboard → REST → `Simulador` → `telemetria` → Flink → `ultima-posicion` → `AutosStore` → WebSocket → mapa. **Foco:** `Simulador` (`S`). Cubre los criterios 2, 3 y 6 de la spec §13.

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="S"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant U as Usuario
  participant D as Dashboard
  participant R as SimulacionResource
  participant S as Simulador · foco
  participant K1 as Kafka telemetria
  participant F as Job Flink
  participant K2 as Kafka ultima-posicion
  participant AC as AutosConsumer
  participant ST as AutosStore
  participant B as AutosBroadcaster
  U->>D: elige ruta y pulsa Iniciar carrera
  D->>R: POST /simulacion/iniciar con ruta
  R->>S: iniciar(ruta)
  S->>K1: posición de salida de cada auto, key carId
  S-->>R: Estado EN_CURSO
  R-->>D: 200 Estado
  loop cada 1 s
    S->>K1: TelemetriaEvento por auto en pista
    K1->>F: KafkaSource, grupo flink-ultima-pos
    F->>F: keyBy carId y emitir solo si ts es mayor
    F->>K2: KafkaSink, key carId
    K2->>AC: lote de Auto
    AC->>ST: actualizar y marcar sucio
  end
  loop cada 500 ms
    B->>ST: drenarSucios()
    B->>D: WS /ws/autos lote JSON
    D->>U: autos interpolados en el mapa
  end
  loop cada 1 s
    D->>R: GET /simulacion
    R-->>D: clasificación
  end
  U->>D: mueve el slider de un auto
  D->>R: PUT /simulacion/autos/carId/velocidad
  R->>S: velocidad(carId, kmh)
  alt API caída o error
    R-->>D: ErrorResponse o timeout de 15 s
    D->>U: mensaje de error en el panel
  end
```

### J2 · Arranque y reconstrucción del estado

**Foco:** `FlinkJobRunner` (`FR`). Cubre RF-F0 y RF-Q5 y el arranque ordenado de `docker-compose.yml`.

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="FR"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant O as Operador
  participant DC as docker compose
  participant KI as kafka-init
  participant Q as Quarkus
  participant FR as FlinkJobRunner · foco
  participant L as ReconstruirEstadoListener
  participant AC as AutosConsumer
  participant K as Kafka
  O->>DC: docker compose up -d
  DC->>K: arranca kafka y espera healthy
  DC->>KI: crea topics con if-not-exists
  KI-->>DC: Exited 0
  DC->>Q: arranca telemetry-api
  Q->>FR: StartupEvent
  FR->>FR: MiniCluster, classpaths, parent-first, restart exponential-delay
  FR->>K: KafkaSource telemetria desde latest
  Q->>AC: suscripción a ultima-posicion
  K->>L: particiones asignadas
  L->>K: seekToBeginning
  K-->>AC: última posición de cada auto
  AC->>AC: AutosStore reconstruido
  DC->>Q: healthcheck GET /rutas
  Q-->>DC: 200, healthy
  alt el job Flink falla
    FR->>FR: reinicio con espera de 1 s a 30 s
  end
```

## API REST: una secuencia por endpoint

`REQUIRES_REVIEW`: no existe especificación OpenAPI/Swagger. Se buscaron `*.yaml` y `*.yml` en `telemetry-api/src/main/resources/**` y `telemetry-api/src/**`, sin resultados con `openapi:` o `swagger:`. Los endpoints se derivan de las anotaciones JAX-RS y websockets-next de los controllers reales (`INFERRED`).

| # | Endpoint | operationId (inferido) | Implementación | Secuencia | Diagrama |
|---|---|---|---|---|---|
| 1 | `GET /rutas` | `RutasResource.listar` | [`RutasResource.java`](../../telemetry-api/src/main/java/dev/bryan/simulacion/RutasResource.java) | [get-rutas.md](sequences/get-rutas.md) | [get-rutas.mmd](diagrams/sequences/get-rutas.mmd) |
| 2 | `GET /rutas/{id}` | `RutasResource.ruta` | [`RutasResource.java`](../../telemetry-api/src/main/java/dev/bryan/simulacion/RutasResource.java) | [get-rutas-id.md](sequences/get-rutas-id.md) | [get-rutas-id.mmd](diagrams/sequences/get-rutas-id.mmd) |
| 3 | `GET /simulacion` | `SimulacionResource.estado` | [`SimulacionResource.java`](../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java) | [get-simulacion.md](sequences/get-simulacion.md) | [get-simulacion.mmd](diagrams/sequences/get-simulacion.mmd) |
| 4 | `POST /simulacion/iniciar` | `SimulacionResource.iniciar` | [`SimulacionResource.java`](../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java) | [post-simulacion-iniciar.md](sequences/post-simulacion-iniciar.md) | [post-simulacion-iniciar.mmd](diagrams/sequences/post-simulacion-iniciar.mmd) |
| 5 | `POST /simulacion/detener` | `SimulacionResource.detener` | [`SimulacionResource.java`](../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java) | [post-simulacion-detener.md](sequences/post-simulacion-detener.md) | [post-simulacion-detener.mmd](diagrams/sequences/post-simulacion-detener.mmd) |
| 6 | `PUT /simulacion/autos/{carId}/velocidad` | `SimulacionResource.velocidad` | [`SimulacionResource.java`](../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java) | [put-simulacion-autos-carid-velocidad.md](sequences/put-simulacion-autos-carid-velocidad.md) | [put-simulacion-autos-carid-velocidad.mmd](diagrams/sequences/put-simulacion-autos-carid-velocidad.mmd) |
| 7 | `GET /autos` | `AutosResource.listar` | [`AutosResource.java`](../../telemetry-api/src/main/java/dev/bryan/autos/AutosResource.java) | [get-autos.md](sequences/get-autos.md) | [get-autos.mmd](diagrams/sequences/get-autos.mmd) |
| 8 | `WS /ws/autos` | `AutosWs y AutosBroadcaster.emitir` | [`AutosWs.java`](../../telemetry-api/src/main/java/dev/bryan/autos/AutosWs.java) | [ws-autos.md](sequences/ws-autos.md) | [ws-autos.mmd](diagrams/sequences/ws-autos.mmd) |

**Cobertura:** 7 operaciones REST encontradas en los controllers → 7 secuencias (100 %). Además hay 1 endpoint WebSocket con su secuencia.

## Traceability

- sources: controllers `RutasResource`, `SimulacionResource`, `AutosResource` y `AutosWs`; `docker-compose.yml`; spec §7–§10 y §13
- related_artifacts: [code.md](code.md), [traceability-report.md](traceability-report.md)
- assumptions: los `operationId` son `Clase.método` porque no hay especificación
