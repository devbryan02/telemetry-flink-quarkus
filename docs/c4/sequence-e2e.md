---
okf_version: 0.2
generated: 2026-10-15
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../telemetry-api/src/main/java/dev/bryan/simulacion/
  - ../../telemetry-api/src/main/java/dev/bryan/flink/
  - ../../telemetry-api/src/main/java/dev/bryan/autos/
  - ../../telemetry-api/src/main/java/dev/bryan/viajes/
  - ../../telemetry-api/src/main/resources/application.properties
  - ../../dashboard-next/features/autos/
  - ../../docker-compose.yml
  - ../specs/telemetria.md
  - ../specs/persistencia-posiciones-viajes.md
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

Atraviesa todo el sistema: dashboard → REST → `Simulador` → `telemetria` → Flink → `ultima-posicion` → `AutosConsumer` → PostgreSQL → `AutosCambios` → WebSocket → mapa. **Foco:** `Simulador` (`S`). Cubre los criterios 2, 3 y 6 de la spec §13 y el criterio 2 de la spec de persistencia §9. En paralelo, la feature `viajes` guarda el historial desde el mismo topic `telemetria` (J3).

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
  participant PG as PostgreSQL
  participant CB as AutosCambios
  participant B as AutosBroadcaster
  U->>D: elige ruta y pulsa Iniciar carrera
  D->>R: POST /simulacion/iniciar con ruta
  R->>S: iniciar(ruta)
  S->>K1: INICIO v2 de cada auto, key carId
  S-->>R: Estado EN_CURSO con carreraId y viajeId
  R-->>D: 200 Estado
  loop cada 1 s
    S->>K1: POSICION por auto en pista, o FIN META al llegar
    K1->>F: KafkaSource, grupo flink-ultima-pos
    F->>F: keyBy carId y emitir solo si ts es mayor
    F->>K2: KafkaSink, key carId, contexto v2
    K2->>AC: lote de AutoEvento, grupo quarkus-dash-postgres
    AC->>ST: guardarLote en un hilo worker
    ST->>PG: upsert si ts es mayor, RETURNING
    PG-->>ST: filas cambiadas, commit
    AC->>CB: registrar cambios confirmados
    AC-->>K2: ack y commit de offsets
  end
  loop cada 500 ms
    B->>CB: drenar()
    B->>D: WS /ws/autos lote JSON de 9 campos
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
  alt falla PostgreSQL al guardar el lote
    ST-->>AC: rollback, sin cambios para el WebSocket
    AC-->>K2: sin ack, canal detenido y readiness DOWN
  end
```

### J2 · Arranque y recuperación del estado

**Foco:** `FlinkJobRunner` (`FR`). Cubre RF-F0, el arranque ordenado de `docker-compose.yml` y la spec de persistencia §8 (criterio 7). El estado ya no se reconstruye releyendo `ultima-posicion` desde el principio: la última posición está en PostgreSQL y cada grupo de la API retoma sus offsets confirmados (`earliest` solo la primera vez).

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="FR"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant O as Operador
  participant DC as docker compose
  participant PG as PostgreSQL
  participant KI as kafka-init
  participant Q as Quarkus
  participant FR as FlinkJobRunner · foco
  participant AC as AutosConsumer
  participant VC as ViajesConsumer
  participant K as Kafka
  O->>DC: docker compose up -d con .env
  DC->>PG: arranca postgres y espera healthy, pg_isready
  DC->>K: arranca kafka y espera healthy
  DC->>KI: crea topics con if-not-exists
  KI-->>DC: Exited 0
  DC->>Q: arranca telemetry-api
  Q->>PG: Flyway migrate-at-start, V1 si falta
  Q->>FR: StartupEvent
  FR->>FR: MiniCluster, classpaths, parent-first, restart exponential-delay
  FR->>K: KafkaSource telemetria desde latest, sin checkpoints
  Q->>AC: suscripción a ultima-posicion, grupo quarkus-dash-postgres
  K-->>AC: desde el último offset confirmado
  Q->>VC: suscripción a telemetria, grupo quarkus-viajes-postgres
  K-->>VC: desde el último offset confirmado
  DC->>Q: healthcheck GET /q/health/ready
  Q-->>DC: 200 UP si el datasource y los canales están bien
  Note over Q,PG: GET /autos y GET /viajes responden desde PostgreSQL sin iniciar otra carrera
  alt el job Flink falla
    FR->>FR: reinicio con espera de 1 s a 30 s
  end
  alt un canal falla por BD o evento inválido
    Q-->>DC: readiness DOWN hasta corregir la causa y reiniciar la API
  end
```

### J3 · Historial de un viaje

**Foco:** `ViajesStore` (`VS`). Cubre los criterios 1, 3, 4, 5, 8 y 12 de la spec de persistencia §9. La feature `viajes` lee `telemetria` directamente, así que también guarda las muestras atrasadas que Flink descarta.

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="VS"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant S as Simulador
  participant K as Kafka telemetria
  participant VC as ViajesConsumer
  participant VS as ViajesStore · foco
  participant PG as PostgreSQL
  participant M as ViajesMetricas
  participant C as Cliente REST
  participant VR as ViajesResource
  S->>K: INICIO, POSICION y FIN con eventId, carreraId y viajeId
  K->>VC: lote de EventoViaje, grupo quarkus-viajes-postgres
  VC->>VS: guardarLote en un hilo worker
  VS->>VS: validar y separar legados v1
  VS->>PG: BEGIN
  loop por evento v2, ordenado por viajeId
    VS->>PG: crear tb_viaje si falta y SELECT FOR UPDATE
    alt eventId nuevo
      VS->>PG: INSERT tb_posicion_historial y UPDATE ultimo_ts, fin_ts, estado
    else eventId repetido con el mismo contenido
      VS->>VS: cuenta como duplicado
    end
  end
  alt lote coherente
    VS->>PG: COMMIT
    VS-->>VC: ResultadoIngesta
    VC->>M: insertados, duplicados y legados
    VC-->>K: ack y commit de offsets
  else contenido, identidad, intervalo o cierre contradictorios
    VS->>PG: ROLLBACK del lote
    VS-->>VC: conflicto con eventId y viajeId
    VC->>M: viajes_persistencia_fallos_total
    VC-->>K: sin ack, canal detenido y readiness DOWN
  end
  C->>VR: GET /viajes?carreraId=...
  VR-->>C: página de viajes con nextCursor
  C->>VR: GET /viajes/viajeId
  VR-->>C: viaje, estado y resumen
  C->>VR: GET /viajes/viajeId/posiciones
  VR-->>C: muestras en orden ts, eventId
```

## API REST: una secuencia por endpoint

`REQUIRES_REVIEW`: no existe especificación OpenAPI/Swagger. Se buscaron `*.yaml` y `*.yml` en `telemetry-api/src/main/resources/**` y `telemetry-api/src/**`, sin resultados con `openapi:` o `swagger:`. Los endpoints se derivan de las anotaciones JAX-RS y websockets-next de los controllers reales (`INFERRED`). Los endpoints de operación `/q/health/*` y `/q/metrics` los aportan las extensiones de Quarkus y no tienen secuencia propia.

| # | Endpoint | operationId (inferido) | Implementación | Secuencia | Diagrama |
|---|---|---|---|---|---|
| 1 | `GET /rutas` | `RutasResource.listar` | [`RutasResource.java`](../../telemetry-api/src/main/java/dev/bryan/simulacion/RutasResource.java) | [get-rutas.md](sequences/get-rutas.md) | [get-rutas.mmd](diagrams/sequences/get-rutas.mmd) |
| 2 | `GET /rutas/{id}` | `RutasResource.ruta` | [`RutasResource.java`](../../telemetry-api/src/main/java/dev/bryan/simulacion/RutasResource.java) | [get-rutas-id.md](sequences/get-rutas-id.md) | [get-rutas-id.mmd](diagrams/sequences/get-rutas-id.mmd) |
| 3 | `GET /simulacion` | `SimulacionResource.estado` | [`SimulacionResource.java`](../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java) | [get-simulacion.md](sequences/get-simulacion.md) | [get-simulacion.mmd](diagrams/sequences/get-simulacion.mmd) |
| 4 | `POST /simulacion/iniciar` | `SimulacionResource.iniciar` | [`SimulacionResource.java`](../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java) | [post-simulacion-iniciar.md](sequences/post-simulacion-iniciar.md) | [post-simulacion-iniciar.mmd](diagrams/sequences/post-simulacion-iniciar.mmd) |
| 5 | `POST /simulacion/detener` | `SimulacionResource.detener` | [`SimulacionResource.java`](../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java) | [post-simulacion-detener.md](sequences/post-simulacion-detener.md) | [post-simulacion-detener.mmd](diagrams/sequences/post-simulacion-detener.mmd) |
| 6 | `PUT /simulacion/autos/{carId}/velocidad` | `SimulacionResource.velocidad` | [`SimulacionResource.java`](../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java) | [put-simulacion-autos-carid-velocidad.md](sequences/put-simulacion-autos-carid-velocidad.md) | [put-simulacion-autos-carid-velocidad.mmd](diagrams/sequences/put-simulacion-autos-carid-velocidad.mmd) |
| 7 | `GET /autos` | `AutosResource.listar` | [`AutosResource.java`](../../telemetry-api/src/main/java/dev/bryan/autos/AutosResource.java) | [get-autos.md](sequences/get-autos.md) | [get-autos.mmd](diagrams/sequences/get-autos.mmd) |
| 8 | `GET /viajes` | `ViajesResource.listar` | [`ViajesResource.java`](../../telemetry-api/src/main/java/dev/bryan/viajes/ViajesResource.java) | [get-viajes.md](sequences/get-viajes.md) | [get-viajes.mmd](diagrams/sequences/get-viajes.mmd) |
| 9 | `GET /viajes/{viajeId}` | `ViajesResource.detalle` | [`ViajesResource.java`](../../telemetry-api/src/main/java/dev/bryan/viajes/ViajesResource.java) | [get-viajes-viajeid.md](sequences/get-viajes-viajeid.md) | [get-viajes-viajeid.mmd](diagrams/sequences/get-viajes-viajeid.mmd) |
| 10 | `GET /viajes/{viajeId}/posiciones` | `ViajesResource.posiciones` | [`ViajesResource.java`](../../telemetry-api/src/main/java/dev/bryan/viajes/ViajesResource.java) | [get-viajes-viajeid-posiciones.md](sequences/get-viajes-viajeid-posiciones.md) | [get-viajes-viajeid-posiciones.mmd](diagrams/sequences/get-viajes-viajeid-posiciones.mmd) |
| 11 | `WS /ws/autos` | `AutosWs y AutosBroadcaster.emitir` | [`AutosWs.java`](../../telemetry-api/src/main/java/dev/bryan/autos/AutosWs.java) | [ws-autos.md](sequences/ws-autos.md) | [ws-autos.mmd](diagrams/sequences/ws-autos.mmd) |

**Cobertura:** 10 operaciones REST encontradas en los controllers → 10 secuencias (100 %). Además hay 1 endpoint WebSocket con su secuencia.

## Traceability

- sources: controllers `RutasResource`, `SimulacionResource`, `AutosResource`, `ViajesResource` y `AutosWs`; consumidores `AutosConsumer` y `ViajesConsumer`; `application.properties`; `docker-compose.yml`; spec §7–§10 y §13; spec de persistencia §4–§9
- related_artifacts: [code.md](code.md), [traceability-report.md](traceability-report.md)
- assumptions: los `operationId` son `Clase.método` porque no hay especificación
