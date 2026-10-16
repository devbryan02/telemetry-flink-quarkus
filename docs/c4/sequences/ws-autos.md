---
okf_version: 0.2
generated: 2026-10-15
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../telemetry-api/src/main/java/dev/bryan/autos/AutosWs.java
  - ../../../telemetry-api/src/main/java/dev/bryan/autos/AutosBroadcaster.java
  - ../../../telemetry-api/src/main/java/dev/bryan/autos/AutosCambios.java
  - ../../specs/telemetria.md
  - ../../specs/persistencia-posiciones-viajes.md
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
| Implementación | [`AutosWs.java`](../../../telemetry-api/src/main/java/dev/bryan/autos/AutosWs.java), [`AutosBroadcaster.java`](../../../telemetry-api/src/main/java/dev/bryan/autos/AutosBroadcaster.java), [`AutosCambios.java`](../../../telemetry-api/src/main/java/dev/bryan/autos/AutosCambios.java) |
| Cliente | `dashboard-next` · use-autos-socket.ts |
| Respuestas | Mensajes de texto con un arreglo JSON de Auto (9 campos) · sin códigos de error: el cliente reconecta |
| Seguridad | Ninguna (RNF-5). CORS solo para `http://localhost:3000`. |
| Correlación | `requestId` generado en la respuesta de error; no se propaga un correlation ID en las respuestas 2xx ni por Kafka. |
| Criterios | RF-Q3, RF-U9, RF-U10, RF-U11, criterio 6 (p95 menor a 2 s); spec de persistencia §5.3 y criterio 8 (solo cambios confirmados) |
| Foco | Participante `WS` (borde dark red 700) |

El búfer `AutosCambios` solo recibe las filas que el upsert cambió y después del commit. No es durable: si la API cae entre el commit y el envío, el cambio no se difunde y el cliente se recupera con `GET /autos`.

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="WS"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as use-autos-socket
  participant WS as AutosWs · foco
  participant B as AutosBroadcaster
  participant CB as AutosCambios
  participant AC as AutosConsumer
  participant M as autos-map
  C->>WS: WebSocket /ws/autos
  WS-->>C: abierta, OnOpen registra la conexión
  AC->>CB: registrar filas cambiadas tras el commit en PostgreSQL
  loop cada 500 ms en el event loop de Vert.x
    B->>CB: drenar()
    CB-->>B: autos cambiados, uno por carId con el ts mayor
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
