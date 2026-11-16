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
  - ../../../src/main/java/dev/bryan/infrastructure/in/rest/RutasResource.java
  - ../../../src/main/java/dev/bryan/application/service/RutasService.java
  - ../../../src/main/java/dev/bryan/infrastructure/out/classpath/CatalogoRutasClasspath.java
c4_level: Sequence
focus_id: rutas-resource
focus_name: RutasResource
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: telemetry-api
endpoint: "GET /rutas"
operation_id: listar
endpoint_provenance: INFERRED
---

# Secuencia · GET /rutas

**Endpoint:** `GET /rutas` · **operación:** `listar` · **procedencia:** `INFERRED` (no hay OpenAPI; se dedujo del código del recurso)

**Foco:** `RutasResource` (borde dark red 700).

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Cliente REST
  participant R as RutasResource · foco
  participant U as RutasService
  participant K as CatalogoRutasClasspath
  participant FS as Recurso rutas/indice.json
  participant E as GlobalExceptionMapper
  C->>R: GET /rutas
  R->>U: listar()
  U->>K: listar()
  K->>FS: abre rutas/indice.json del classpath
  alt el recurso no existe
    K-->>E: NegocioException RUTA_NO_ENCONTRADA
    E-->>C: 404 con requestId
  else existe
    FS-->>K: JSON con id, nombre, desde, hasta y km
    K-->>U: lista de ResumenRuta
    U-->>R: lista de ResumenRuta
    R-->>C: 200 application/json
  end
  alt la lectura falla
    K-->>E: UncheckedIOException
    E-->>C: 500 INTERNAL_ERROR
  end
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| infrastructure/in (REST) | RutasResource | [`RutasResource.java`](../../../src/main/java/dev/bryan/infrastructure/in/rest/RutasResource.java) |
| application (port/in) | ConsultarRutas → RutasService | [`RutasService.java`](../../../src/main/java/dev/bryan/application/service/RutasService.java) |
| application (port/out) | CatalogoRutas | [`CatalogoRutas.java`](../../../src/main/java/dev/bryan/application/port/out/CatalogoRutas.java) |
| infrastructure/out (classpath) | CatalogoRutasClasspath | [`CatalogoRutasClasspath.java`](../../../src/main/java/dev/bryan/infrastructure/out/classpath/CatalogoRutasClasspath.java) |

## Errores relevantes

| Código | Causa | Origen |
|---|---|---|
| 404 `RUTA_NO_ENCONTRADA` | `rutas/indice.json` ausente (el catálogo reutiliza el error de ruta) | `CatalogoRutasClasspath` |
| 500 `INTERNAL_ERROR` | fallo de lectura (`UncheckedIOException`) | `CatalogoRutasClasspath` |

## Pruebas que lo cubren

- [`SimulacionResourceTest`](../../../src/test/java/dev/bryan/infrastructure/in/rest/SimulacionResourceTest.java)

## Notas

- No existe `correlation ID` de entrada: el `requestId` nace en `GlobalExceptionMapper` y solo viaja en el cuerpo de los errores (`STD-ERR-001`).
- Sin autenticación ni autorización en el servicio (ver [documentation-review.md](../documentation-review.md)).

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`get-rutas.mmd`](../diagrams/sequences/get-rutas.mmd)
