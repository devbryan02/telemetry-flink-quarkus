---
okf_version: 0.2
generated: 2026-10-10
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../telemetry-api/src/main/java/dev/bryan/autos/AutosWs.java
  - ../../specs/telemetria.md
c4_level: Sequence
focus_id: telemetry-api.ws-autos
focus_name: WS /ws/autos
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: .
endpoint: "WS /ws/autos"
operation_id: "AutosWs y AutosBroadcaster.emitir"
provenance_endpoint: INFERRED
---

# Secuencia · `WS /ws/autos`

| Campo | Valor |
|---|---|
| Endpoint | `WS /ws/autos` |
| operationId | `AutosWs y AutosBroadcaster.emitir` (`INFERRED`: no hay especificación OpenAPI) |
| Implementación | [`AutosWs.java`](../../../telemetry-api/src/main/java/dev/bryan/autos/AutosWs.java) |
| Cliente | `dashboard-next` · use-autos-socket.ts |
| Respuestas | Mensajes de texto con un arreglo JSON de Auto · sin códigos de error: el cliente reconecta |
| Seguridad | Ninguna (RNF-5). CORS solo para `http://localhost:3000`. |
| Correlación | `requestId` generado en la respuesta de error; no se propaga un correlation ID en las respuestas 2xx ni por Kafka. |
| Criterios | RF-Q3, RF-U9, RF-U10, RF-U11, criterio 6 (p95 menor a 2 s) |
| Foco | Participante `WS` (borde dark red 700) |

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="WS"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as use-autos-socket
  participant WS as AutosWs · foco
  participant B as AutosBroadcaster
  participant ST as AutosStore
  participant M as autos-map
  C->>WS: WebSocket /ws/autos
  WS-->>C: abierta, OnOpen registra la conexión
  loop cada 500 ms en el event loop de Vert.x
    B->>ST: drenarSucios()
    ST-->>B: autos cambiados
    opt hay autos y conexiones
      B->>C: sendText arreglo JSON a cada conexión
      C->>M: alRecibirLote
      M->>M: Metricas.registrarLote y fusionar si ts es mayor
      M->>M: Animador interpola y repinta la capa
    end
  end
  alt la conexión se cae
    C->>C: estado reconectando
    C->>WS: reintento con backoff de 1 s a 10 s
  end
```
