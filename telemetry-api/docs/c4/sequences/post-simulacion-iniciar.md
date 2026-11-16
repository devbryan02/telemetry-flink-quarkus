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
  - ../../../src/main/java/dev/bryan/infrastructure/out/classpath/CatalogoRutasClasspath.java
c4_level: Sequence
focus_id: simulacion-service
focus_name: SimulacionService
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: telemetry-api
endpoint: "POST /simulacion/iniciar"
operation_id: iniciar
endpoint_provenance: INFERRED
---

# Secuencia · POST /simulacion/iniciar

**Endpoint:** `POST /simulacion/iniciar` · **operación:** `iniciar` · **procedencia:** `INFERRED` (no hay OpenAPI; se dedujo del código del recurso)

**Foco:** `SimulacionService` (borde dark red 700).

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Cliente REST
  participant X as SimulacionResource
  participant R as SimulacionService · foco
  participant K as CatalogoRutasClasspath
  participant D as AutoCorredor y RelojEventos
  participant P as PublicadorTelemetriaKafka
  participant KF as Kafka telemetria
  participant T as TemporizadorVertx
  participant E as GlobalExceptionMapper
  C->>X: POST /simulacion/iniciar con ruta
  alt ruta ausente o en blanco
    X-->>E: NegocioException RUTA_REQUERIDA
    E-->>C: 400 con requestId
  else ruta informada
    X->>R: iniciar(idRuta)
    R->>K: ruta(idRuta)
    alt la ruta no existe
      K-->>E: NegocioException RUTA_NO_ENCONTRADA
      E-->>C: 404 con requestId
    else existe
      K-->>R: Ruta con distancias acumuladas
      R->>P: publicar FIN con motivo REEMPLAZADO de los viajes abiertos
      P->>KF: send con key carId
      R->>T: cancelar temporizador previo
      R->>D: crea un AutoCorredor por auto y pide el primer ts
      R->>P: publicar INICIO de cada auto con viajeId nuevo
      P->>KF: send con key carId
      R->>T: cadaMs(intervalo-ms, avanzar)
      R-->>X: EstadoSimulacion EN_CURSO
      X-->>C: 200 application/json
    end
  end
  alt el broker no confirma una publicación
    P-->>R: CompletionStage fallido, solo se registra en el log
  end
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| infrastructure/in (REST) | SimulacionResource valida el cuerpo | [`SimulacionResource.java`](../../../src/main/java/dev/bryan/infrastructure/in/rest/SimulacionResource.java) |
| application (port/in) | GestionarSimulacion → SimulacionService (foco) | [`SimulacionService.java`](../../../src/main/java/dev/bryan/application/service/SimulacionService.java) |
| domain | AutoCorredor, RelojEventos, Ruta, TelemetriaEvento | [`AutoCorredor.java`](../../../src/main/java/dev/bryan/domain/service/AutoCorredor.java) |
| application (port/out) | CatalogoRutas, PublicadorTelemetria, Temporizador | [`PublicadorTelemetria.java`](../../../src/main/java/dev/bryan/application/port/out/PublicadorTelemetria.java) |
| infrastructure/out | CatalogoRutasClasspath, PublicadorTelemetriaKafka (Emitter `telemetria-out`), TemporizadorVertx | [`PublicadorTelemetriaKafka.java`](../../../src/main/java/dev/bryan/infrastructure/out/kafka/PublicadorTelemetriaKafka.java) |

## Errores relevantes

| Código | Causa | Origen |
|---|---|---|
| 400 `RUTA_REQUERIDA` | cuerpo vacío o `ruta` en blanco | `SimulacionResource` |
| 404 `RUTA_NO_ENCONTRADA` | ruta fuera del catálogo | `CatalogoRutasClasspath` |
| (sin código HTTP) | fallo de publicación en Kafka | `PublicadorTelemetriaKafka` registra el error; la respuesta ya fue 200 |

## Pruebas que lo cubren

- [`SimulacionResourceTest`](../../../src/test/java/dev/bryan/infrastructure/in/rest/SimulacionResourceTest.java)
- [`SimuladorViajesTest`](../../../src/test/java/dev/bryan/application/service/SimuladorViajesTest.java)
- [`PublicadorTelemetriaTest`](../../../src/test/java/dev/bryan/infrastructure/out/kafka/PublicadorTelemetriaTest.java)

## Notas

- No existe `correlation ID` de entrada: el `requestId` nace en `GlobalExceptionMapper` y solo viaja en el cuerpo de los errores (`STD-ERR-001`).
- Sin autenticación ni autorización en el servicio (ver [documentation-review.md](../documentation-review.md)).

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`post-simulacion-iniciar.mmd`](../diagrams/sequences/post-simulacion-iniciar.mmd)
