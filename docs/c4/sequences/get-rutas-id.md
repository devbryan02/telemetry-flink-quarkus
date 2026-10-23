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
focus_id: telemetry-api.get-rutas-id
focus_name: GET /rutas/{id}
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: .
endpoint: "GET /rutas/{id}"
operation_id: "RutasResource.ruta"
provenance_endpoint: INFERRED
---

# Secuencia · `GET /rutas/{id}`

| Campo | Valor |
|---|---|
| Endpoint | `GET /rutas/{id}` |
| operationId | `RutasResource.ruta` (`INFERRED`: no hay especificación OpenAPI) |
| Implementación | [`RutasResource.java`](../../../telemetry-api/src/main/java/dev/bryan/simulacion/RutasResource.java) |
| Cliente | `dashboard-next` · api.ts obtenerRuta, al elegir una ruta |
| Respuestas | 200 application/geo+json · 404 RUTA_NO_ENCONTRADA |
| Seguridad | Ninguna (RNF-5). CORS solo para `http://localhost:3000`. |
| Correlación | `requestId` generado en la respuesta de error; no se propaga un correlation ID en las respuestas 2xx ni por Kafka. |
| Criterios | Criterio 1 (ruta dibujada con Salida y Meta), RF-U2 |
| Foco | Participante `R` (borde dark red 700) |

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Dashboard api.ts
  participant R as RutasResource · foco
  participant CAT as CatalogoRutas
  participant CP as Classpath rutas
  participant E as GlobalExceptionMapper
  C->>R: GET /rutas/av-brasil · ruta
  R->>CAT: geojson(id)
  CAT->>CAT: validar id con a-z 0-9 y guion, hasta 40
  alt id válido y archivo presente
    CAT->>CP: abrir rutas/id.geojson
    CP-->>CAT: bytes
    CAT-->>R: GeoJSON tal cual
    R-->>C: 200 application/geo+json
    C->>C: RutaLayer y SalidaMeta, fitBounds
  else id inválido o ruta inexistente
    CAT-->>E: NegocioException 404 RUTA_NO_ENCONTRADA
    E-->>C: 404 ErrorResponse con requestId
  end
```
