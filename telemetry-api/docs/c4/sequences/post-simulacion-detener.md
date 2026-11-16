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
  - ../../../src/main/java/dev/bryan/infrastructure/in/rest/SimulacionResource.java
  - ../../../src/main/java/dev/bryan/application/service/SimulacionService.java
  - ../../../src/main/java/dev/bryan/infrastructure/out/kafka/PublicadorTelemetriaKafka.java
  - ../../../src/main/java/dev/bryan/infrastructure/out/vertx/TemporizadorVertx.java
c4_level: Sequence
focus_id: simulacion-service
focus_name: SimulacionService
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: telemetry-api
endpoint: "POST /simulacion/detener"
operation_id: detener
endpoint_provenance: INFERRED
---

# Secuencia · POST /simulacion/detener

**Endpoint:** `POST /simulacion/detener` · **operación:** `detener` · **procedencia:** `INFERRED` (no hay OpenAPI; se dedujo del código del recurso)

**Foco:** `SimulacionService` (borde dark red 700).

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Cliente REST
  participant X as SimulacionResource
  participant R as SimulacionService · foco
  participant P as PublicadorTelemetriaKafka
  participant KF as Kafka telemetria
  participant T as TemporizadorVertx
  C->>X: POST /simulacion/detener
  X->>R: detener()
  alt la carrera está EN_CURSO
    R->>P: publicar FIN con motivo DETENIDO de los viajes abiertos
    P->>KF: send con key carId
    R->>T: cancelar(temporizador)
    R->>R: estado = LISTA
  else no hay carrera en curso
    R->>R: no hace nada
  end
  R-->>X: EstadoSimulacion
  X-->>C: 200 application/json
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| infrastructure/in (REST) | SimulacionResource | [`SimulacionResource.java`](../../../src/main/java/dev/bryan/infrastructure/in/rest/SimulacionResource.java) |
| application (port/in) | GestionarSimulacion → SimulacionService (foco) | [`SimulacionService.java`](../../../src/main/java/dev/bryan/application/service/SimulacionService.java) |
| application (port/out) | PublicadorTelemetria, Temporizador | [`Temporizador.java`](../../../src/main/java/dev/bryan/application/port/out/Temporizador.java) |
| infrastructure/out | PublicadorTelemetriaKafka, TemporizadorVertx | [`TemporizadorVertx.java`](../../../src/main/java/dev/bryan/infrastructure/out/vertx/TemporizadorVertx.java) |

## Errores relevantes

No declara errores propios: es idempotente. Un fallo de Kafka al publicar los `FIN` solo se registra en el log del publicador.

## Pruebas que lo cubren

- [`SimulacionResourceTest`](../../../src/test/java/dev/bryan/infrastructure/in/rest/SimulacionResourceTest.java)
- [`SimuladorViajesTest`](../../../src/test/java/dev/bryan/application/service/SimuladorViajesTest.java)

## Notas

- No existe `correlation ID` de entrada: el `requestId` nace en `GlobalExceptionMapper` y solo viaja en el cuerpo de los errores (`STD-ERR-001`).
- Sin autenticación ni autorización en el servicio (ver [documentation-review.md](../documentation-review.md)).

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`post-simulacion-detener.mmd`](../diagrams/sequences/post-simulacion-detener.mmd)
