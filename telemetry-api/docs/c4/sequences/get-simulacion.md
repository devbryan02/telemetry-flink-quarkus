---
okf_version: 0.2
generated: 2026-11-16
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../src/main/java/dev/bryan/infrastructure/in/rest/SimulacionResource.java
  - ../../../src/main/java/dev/bryan/application/service/SimulacionService.java
  - ../../../src/main/java/dev/bryan/domain/service/AutoCorredor.java
c4_level: Sequence
focus_id: simulacion-resource
focus_name: SimulacionResource
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: telemetry-api
endpoint: "GET /simulacion"
operation_id: estado
endpoint_provenance: INFERRED
---

# Secuencia · GET /simulacion

**Endpoint:** `GET /simulacion` · **operación:** `estado` · **procedencia:** `INFERRED` (no hay OpenAPI; se dedujo del código del recurso)

**Foco:** `SimulacionResource` (borde dark red 700).

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Cliente REST
  participant R as SimulacionResource · foco
  participant S as SimulacionService
  participant D as AutoCorredor (domain)
  participant K as CatalogoRutasClasspath
  participant E as GlobalExceptionMapper
  C->>R: GET /simulacion
  R->>S: estado()
  alt hay autos de una carrera
    S->>D: lee recorrido, velocidad y llegada de cada auto
    D-->>S: valores
    S->>S: ordena llegados por tiempo y el resto por distancia
  else aún no hubo carrera
    S->>K: escenario(simulacion.escenario)
    K-->>S: autos iniciales del escenario
  end
  S-->>R: EstadoSimulacion
  R-->>C: 200 application/json
  alt escenario ausente
    K-->>E: NegocioException RUTA_NO_ENCONTRADA
    E-->>C: 404 con requestId
  else lectura fallida
    K-->>E: UncheckedIOException
    E-->>C: 500 INTERNAL_ERROR
  end
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| infrastructure/in (REST) | SimulacionResource | [`SimulacionResource.java`](../../../src/main/java/dev/bryan/infrastructure/in/rest/SimulacionResource.java) |
| application (port/in) | GestionarSimulacion → SimulacionService | [`SimulacionService.java`](../../../src/main/java/dev/bryan/application/service/SimulacionService.java) |
| domain | AutoCorredor, Clasificado, EstadoSimulacion | [`AutoCorredor.java`](../../../src/main/java/dev/bryan/domain/service/AutoCorredor.java) |
| application (port/out) | CatalogoRutas | [`CatalogoRutas.java`](../../../src/main/java/dev/bryan/application/port/out/CatalogoRutas.java) |

## Errores relevantes

| Código | Causa | Origen |
|---|---|---|
| 404 `RUTA_NO_ENCONTRADA` | `escenarios/carrera.json` ausente | `CatalogoRutasClasspath` |
| 500 `INTERNAL_ERROR` | fallo de lectura del escenario | `CatalogoRutasClasspath` |

## Pruebas que lo cubren

- [`SimulacionResourceTest`](../../../src/test/java/dev/bryan/infrastructure/in/rest/SimulacionResourceTest.java)
- [`SimuladorViajesTest`](../../../src/test/java/dev/bryan/application/service/SimuladorViajesTest.java)

## Notas

- No existe `correlation ID` de entrada: el `requestId` nace en `GlobalExceptionMapper` y solo viaja en el cuerpo de los errores (`STD-ERR-001`).
- Sin autenticación ni autorización en el servicio (ver [documentation-review.md](../documentation-review.md)).

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`get-simulacion.mmd`](../diagrams/sequences/get-simulacion.mmd)
