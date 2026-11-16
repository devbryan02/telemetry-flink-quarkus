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
  - ../../../src/main/java/dev/bryan/infrastructure/in/messaging/viajes/ViajesConsumer.java
  - ../../../src/main/java/dev/bryan/infrastructure/in/messaging/viajes/EventoViajeDeserializer.java
  - ../../../src/main/java/dev/bryan/infrastructure/in/messaging/viajes/EventoViajeFailureHandler.java
  - ../../../src/main/java/dev/bryan/application/service/IngestaViajesService.java
  - ../../../src/main/java/dev/bryan/infrastructure/out/persistence/viajes/ViajesStore.java
  - ../../../src/main/java/dev/bryan/infrastructure/out/metrics/MetricasMicrometer.java
c4_level: Sequence
focus_id: viajes-consumer
focus_name: ViajesConsumer
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: telemetry-api
endpoint: "KAFKA telemetria (grupo quarkus-viajes-postgres)"
operation_id: ingestar-historial
endpoint_provenance: EXTRACTED
---

# Secuencia · Ingesta del historial de viajes desde Kafka

**Endpoint:** `KAFKA telemetria (grupo quarkus-viajes-postgres)` · **operación:** `ingestar-historial` · **procedencia:** `EXTRACTED`

**Foco:** `ViajesConsumer` (borde dark red 700).

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant KF as Kafka telemetria
  participant DS as EventoViajeDeserializer
  participant R as ViajesConsumer · foco
  participant U as IngestaViajesService
  participant S as ViajesStore
  participant PG as PostgreSQL
  participant M as MetricasMicrometer
  KF->>DS: bytes del evento
  alt evento inválido
    DS-->>M: EventoViajeFailureHandler cuenta viajeInvalido
    DS-->>KF: SerializationException y el canal se detiene
  else evento válido
    DS-->>R: lote de EventoViaje
    R->>U: ingestar(eventos)
    U->>S: guardarLote(eventos)
    S->>PG: BEGIN
    loop cada evento nuevo, ordenado por viajeId
      S->>PG: INSERT tb_viaje ON CONFLICT DO NOTHING
      S->>PG: SELECT del viaje con bloqueo de escritura
      S->>PG: busca el eventId
      alt eventId repetido con el mismo contenido
        S->>S: cuenta duplicado
      else eventId repetido con otro contenido o cierre incoherente
        S-->>U: IllegalStateException con eventId y viajeId
      else evento nuevo
        S->>PG: INSERT tb_posicion_historial ON CONFLICT DO NOTHING
        S->>PG: actualiza ultimo_ts y, si es FIN, estado, fin_ts y motivo_fin
      end
    end
    S->>PG: COMMIT
    S-->>U: ResultadoIngesta
    U->>M: viajesIngestados(resultado)
    U-->>R: ResultadoIngesta
    R-->>KF: confirma el offset tras el commit
  end
  alt falla la persistencia
    S-->>U: IllegalStateException
    U->>M: viajesFalloPersistencia()
    U-->>R: propaga el error
    R-->>KF: failure-strategy fail: canal detenido y readiness DOWN
  end
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| infrastructure/in (messaging) | ViajesConsumer, EventoViajeDeserializer, EventoJson (validación) | [`ViajesConsumer.java`](../../../src/main/java/dev/bryan/infrastructure/in/messaging/viajes/ViajesConsumer.java) |
| application (port/in) | IngestarHistorialViajes → IngestaViajesService | [`IngestaViajesService.java`](../../../src/main/java/dev/bryan/application/service/IngestaViajesService.java) |
| application (port/out) | ViajesRepositorio, MetricasIngesta | [`ViajesRepositorio.java`](../../../src/main/java/dev/bryan/application/port/out/ViajesRepositorio.java) |
| infrastructure/out (persistence) | ViajesStore (idempotencia por eventId, bloqueo por viaje) | [`ViajesStore.java`](../../../src/main/java/dev/bryan/infrastructure/out/persistence/viajes/ViajesStore.java) |
| infrastructure/out (metrics) | MetricasMicrometer | [`MetricasMicrometer.java`](../../../src/main/java/dev/bryan/infrastructure/out/metrics/MetricasMicrometer.java) |

## Errores relevantes

| Efecto | Causa | Origen |
|---|---|---|
| canal detenido y readiness DOWN | evento inválido, conflicto de integridad o fallo de BD | `failure-strategy=fail`; `eventId` hace idempotente la reentrega tras reiniciar |
| evento legado excluido | `schemaVersion` nulo o 1 | cuenta en `viajes.eventos.legados` y no crea viaje |

## Pruebas que lo cubren

- [`ViajesConsumerTest`](../../../src/test/java/dev/bryan/infrastructure/in/messaging/viajes/ViajesConsumerTest.java)
- [`ViajesStoreTest`](../../../src/test/java/dev/bryan/infrastructure/out/persistence/viajes/ViajesStoreTest.java)
- [`RecuperacionTest`](../../../src/test/java/dev/bryan/infrastructure/in/messaging/viajes/RecuperacionTest.java)
- [`ViajesMetricasTest`](../../../src/test/java/dev/bryan/infrastructure/in/messaging/viajes/ViajesMetricasTest.java)

## Notas

- No existe `correlation ID` de entrada: el `requestId` nace en `GlobalExceptionMapper` y solo viaja en el cuerpo de los errores (`STD-ERR-001`).
- Sin autenticación ni autorización en el servicio (ver [documentation-review.md](../documentation-review.md)).

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`consumo-historial-viajes.mmd`](../diagrams/sequences/consumo-historial-viajes.mmd)
