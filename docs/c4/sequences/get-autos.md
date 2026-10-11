---
okf_version: 0.2
generated: 2026-10-10
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../telemetry-api/src/main/java/dev/bryan/autos/AutosResource.java
  - ../../specs/telemetria.md
c4_level: Sequence
focus_id: telemetry-api.get-autos
focus_name: GET /autos
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: .
endpoint: "GET /autos"
operation_id: "AutosResource.listar"
provenance_endpoint: INFERRED
---

# Secuencia · `GET /autos`

| Campo | Valor |
|---|---|
| Endpoint | `GET /autos` |
| operationId | `AutosResource.listar` (`INFERRED`: no hay especificación OpenAPI) |
| Implementación | [`AutosResource.java`](../../../telemetry-api/src/main/java/dev/bryan/autos/AutosResource.java) |
| Cliente | `dashboard-next` · api.ts obtenerAutos, carga inicial del mapa |
| Respuestas | 200 lista de Auto · 400 INVALID_BBOX |
| Seguridad | Ninguna (RNF-5). CORS solo para `http://localhost:3000`. |
| Correlación | `requestId` generado en la respuesta de error; no se propaga un correlation ID en las respuestas 2xx ni por Kafka. |
| Criterios | RF-Q4, RF-U10, criterio 7 (ts antiguo no reemplaza) |
| Foco | Participante `R` (borde dark red 700) |

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Dashboard api.ts
  participant R as AutosResource · foco
  participant B as Bbox
  participant ST as AutosStore
  participant E as GlobalExceptionMapper
  Note over ST: alimentado por AutosConsumer desde ultima-posicion
  C->>R: GET /autos con bbox opcional · listar
  alt sin bbox
    R->>ST: todos()
    ST-->>R: copia de los autos
    R-->>C: 200 application/json
  else con bbox
    R->>B: parse(minLon,minLat,maxLon,maxLat)
    alt formato o rango inválido
      B-->>E: ComsatelException 400 INVALID_BBOX
      E-->>C: 400 ErrorResponse con requestId
    else bbox válido
      R->>ST: enBbox(bbox)
      ST-->>R: autos dentro de la caja
      R-->>C: 200 application/json
    end
  end
  C->>C: fusionar por carId si ts es mayor
```
