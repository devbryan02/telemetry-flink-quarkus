---
okf_version: 0.2
generated: 2026-10-10
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../telemetry-api/src/main/java/dev/bryan/simulacion/RutasResource.java
  - ../../specs/telemetria.md
c4_level: Sequence
focus_id: telemetry-api.get-rutas
focus_name: GET /rutas
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: .
endpoint: "GET /rutas"
operation_id: "RutasResource.listar"
provenance_endpoint: INFERRED
---

# Secuencia · `GET /rutas`

| Campo | Valor |
|---|---|
| Endpoint | `GET /rutas` |
| operationId | `RutasResource.listar` (`INFERRED`: no hay especificación OpenAPI) |
| Implementación | [`RutasResource.java`](../../../telemetry-api/src/main/java/dev/bryan/simulacion/RutasResource.java) |
| Cliente | `dashboard-next` · api.ts listarRutas, al cargar el mapa |
| Respuestas | 200 lista de rutas · 404 RUTA_NO_ENCONTRADA si falta el índice · 500 INTERNAL_ERROR |
| Seguridad | Ninguna (RNF-5). CORS solo para `http://localhost:3000`. |
| Correlación | `requestId` generado en la respuesta de error; no se propaga un correlation ID en las respuestas 2xx ni por Kafka. |
| Criterios | Criterio 1 (selector de rutas), RF-U2 |
| Foco | Participante `R` (borde dark red 700) |

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Dashboard api.ts
  participant R as RutasResource · foco
  participant CAT as CatalogoRutas
  participant CP as Classpath rutas
  participant E as GlobalExceptionMapper
  C->>R: GET /rutas · listar · timeout axios 15 s
  R->>CAT: listar()
  CAT->>CP: abrir rutas/indice.json
  alt recurso presente
    CP-->>CAT: InputStream
    CAT->>CAT: ObjectMapper a List de Resumen
    CAT-->>R: id, nombre, desde, hasta, km
    R-->>C: 200 application/json
  else falta el índice
    CAT-->>E: ComsatelException 404 RUTA_NO_ENCONTRADA
    E-->>C: 404 ErrorResponse con requestId
  else JSON ilegible
    CAT-->>E: UncheckedIOException
    E-->>C: 500 INTERNAL_ERROR con requestId
  end
```
