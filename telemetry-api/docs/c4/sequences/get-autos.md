---
okf_version: 0.2
generated: 2026-11-16
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../src/main/java/dev/bryan/infrastructure/in/rest/AutosResource.java
  - ../../../src/main/java/dev/bryan/application/service/AutosService.java
  - ../../../src/main/java/dev/bryan/infrastructure/out/persistence/autos/AutosStore.java
  - ../../../src/main/java/dev/bryan/domain/model/Bbox.java
c4_level: Sequence
focus_id: autos-resource
focus_name: AutosResource
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: telemetry-api
endpoint: "GET /autos"
operation_id: listar
endpoint_provenance: INFERRED
---

# Secuencia · GET /autos

**Endpoint:** `GET /autos` · **operación:** `listar` · **procedencia:** `INFERRED` (no hay OpenAPI; se dedujo del código del recurso)

**Foco:** `AutosResource` (borde dark red 700).

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Cliente REST
  participant R as AutosResource · foco
  participant B as Bbox (domain)
  participant U as AutosService
  participant A as AutosStore
  participant PG as PostgreSQL
  participant E as GlobalExceptionMapper
  C->>R: GET /autos con bbox opcional
  alt bbox ausente o vacío
    R->>U: todos()
    U->>A: todos()
    A->>PG: SELECT tb_ultima_posicion ORDER BY car_id
    PG-->>A: filas
    A-->>U: lista de Auto
    U-->>R: lista de Auto
    R-->>C: 200 application/json
  else bbox presente
    R->>B: Bbox.parse(texto)
    alt formato o rango inválido
      B-->>E: NegocioException INVALID_BBOX
      E-->>C: 400 con requestId
    else bbox válido
      R->>U: enBbox(bbox)
      U->>A: enBbox(bbox)
      A->>PG: SELECT con lon y lat dentro de la caja
      PG-->>A: filas
      A-->>R: lista de Auto
      R-->>C: 200 application/json
    end
  end
  alt PostgreSQL falla
    A-->>E: IllegalStateException
    E-->>C: 500 INTERNAL_ERROR sin detalles de BD
  end
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| infrastructure/in (REST) | AutosResource, `@Blocking` | [`AutosResource.java`](../../../src/main/java/dev/bryan/infrastructure/in/rest/AutosResource.java) |
| domain | Bbox.parse | [`Bbox.java`](../../../src/main/java/dev/bryan/domain/model/Bbox.java) |
| application (port/in) | ConsultarAutos → AutosService | [`AutosService.java`](../../../src/main/java/dev/bryan/application/service/AutosService.java) |
| application (port/out) | AutosRepositorio | [`AutosRepositorio.java`](../../../src/main/java/dev/bryan/application/port/out/AutosRepositorio.java) |
| infrastructure/out (persistence) | AutosStore + UltimaPosicionRepository (Panache) | [`AutosStore.java`](../../../src/main/java/dev/bryan/infrastructure/out/persistence/autos/AutosStore.java) |

## Errores relevantes

| Código | Causa | Origen |
|---|---|---|
| 400 `INVALID_BBOX` | `bbox` con formato o rango inválido | `Bbox.parse` |
| 500 `INTERNAL_ERROR` | fallo de PostgreSQL (`IllegalStateException`) | `AutosStore`, `GlobalExceptionMapper` |

## Pruebas que lo cubren

- [`AutosResourceTest`](../../../src/test/java/dev/bryan/infrastructure/in/rest/AutosResourceTest.java)
- [`AutosStoreTest`](../../../src/test/java/dev/bryan/infrastructure/out/persistence/autos/AutosStoreTest.java)
- [`BboxTest`](../../../src/test/java/dev/bryan/domain/model/BboxTest.java)

## Notas

- No existe `correlation ID` de entrada: el `requestId` nace en `GlobalExceptionMapper` y solo viaja en el cuerpo de los errores (`STD-ERR-001`).
- Sin autenticación ni autorización en el servicio (ver [documentation-review.md](../documentation-review.md)).

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`get-autos.mmd`](../diagrams/sequences/get-autos.mmd)
