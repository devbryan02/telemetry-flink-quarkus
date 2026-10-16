---
okf_version: 0.2
generated: 2026-10-15
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java
  - ../../../telemetry-api/src/main/java/dev/bryan/simulacion/Simulador.java
  - ../../specs/telemetria.md
  - ../../specs/persistencia-posiciones-viajes.md
c4_level: Sequence
focus_id: telemetry-api.post-simulacion-detener
focus_name: POST /simulacion/detener
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: .
endpoint: "POST /simulacion/detener"
operation_id: "SimulacionResource.detener"
provenance_endpoint: INFERRED
---

# Secuencia · `POST /simulacion/detener`

| Campo | Valor |
|---|---|
| Endpoint | `POST /simulacion/detener` |
| operationId | `SimulacionResource.detener` (`INFERRED`: no hay especificación OpenAPI) |
| Implementación | [`SimulacionResource.java`](../../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java), [`Simulador.java`](../../../telemetry-api/src/main/java/dev/bryan/simulacion/Simulador.java) |
| Cliente | `dashboard-next` · api.ts detenerCarrera, botón Detener |
| Respuestas | 200 Estado · 500 INTERNAL_ERROR |
| Seguridad | Ninguna (RNF-5). CORS solo para `http://localhost:3000`. |
| Correlación | `requestId` generado en la respuesta de error; no se propaga un correlation ID en las respuestas 2xx. Los eventos `FIN` llevan `eventId` y `viajeId`. |
| Criterios | RF-S5, RF-U3; spec de persistencia §4.2 y criterio 5 (cierre `DETENIDO`) |
| Foco | Participante `R` (borde dark red 700) |

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Dashboard api.ts
  participant R as SimulacionResource · foco
  participant S as Simulador
  participant V as Vert.x timer
  participant P as PublicadorTelemetria
  participant E as GlobalExceptionMapper
  C->>R: POST /simulacion/detener · detener
  R->>S: detener()
  alt carrera EN_CURSO
    S->>P: FIN motivo DETENIDO de cada viaje abierto, con su posición final
    S->>V: cancelTimer
    S->>S: estado LISTA, autos quedan donde están
  else LISTA o TERMINADA
    S->>S: sin cambios ni eventos
  end
  alt sin error
    S-->>R: Estado
    R-->>C: 200 application/json
  else error inesperado
    S-->>E: excepción
    E-->>C: 500 INTERNAL_ERROR
  end
```
