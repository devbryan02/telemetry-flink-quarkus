---
okf_version: 0.2
generated: 2026-10-15
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java
  - ../../specs/telemetria.md
c4_level: Sequence
focus_id: telemetry-api.get-simulacion
focus_name: GET /simulacion
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: .
endpoint: "GET /simulacion"
operation_id: "SimulacionResource.estado"
provenance_endpoint: INFERRED
---

# Secuencia · `GET /simulacion`

| Campo | Valor |
|---|---|
| Endpoint | `GET /simulacion` |
| operationId | `SimulacionResource.estado` (`INFERRED`: no hay especificación OpenAPI) |
| Implementación | [`SimulacionResource.java`](../../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java) |
| Cliente | `dashboard-next` · api.ts obtenerSimulacion, al cargar y en sondeo |
| Respuestas | 200 Estado · 500 INTERNAL_ERROR |
| Seguridad | Ninguna (RNF-5). CORS solo para `http://localhost:3000`. |
| Correlación | `requestId` generado en la respuesta de error; no se propaga un correlation ID en las respuestas 2xx ni por Kafka. |
| Criterios | Criterio 3 (clasificación en vivo), RF-S6, RF-U4; spec de persistencia §4.2 (`carreraId` y `viajeId` en la respuesta) |
| Foco | Participante `R` (borde dark red 700) |

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Dashboard autos-map
  participant R as SimulacionResource · foco
  participant S as Simulador
  participant CAT as CatalogoRutas
  participant E as GlobalExceptionMapper
  loop cada 1 s en curso o cada 5 s en reposo
    C->>R: GET /simulacion · estado
    R->>S: estado() synchronized
    S->>S: ordenar con ordenDeCarrera
    opt antes de la primera carrera
      S->>CAT: escenario(carrera)
      CAT-->>S: autos en la salida con su velocidad
    end
    alt sin error
      S-->>R: Estado con estado, ruta, inicio, longitudM, autos con viajeId y carreraId
      R-->>C: 200 application/json
      C->>C: setSimulacion y repinta el panel
    else escenario ilegible
      S-->>E: excepción no clasificada
      E-->>C: 500 INTERNAL_ERROR
    end
  end
```
