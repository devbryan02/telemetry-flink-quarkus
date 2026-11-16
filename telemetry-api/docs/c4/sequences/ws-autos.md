---
okf_version: 0.2
generated: 2026-11-16
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../src/main/java/dev/bryan/infrastructure/in/messaging/autos/AutosConsumer.java
  - ../../../src/main/java/dev/bryan/application/service/IngestaAutosService.java
  - ../../../src/main/java/dev/bryan/infrastructure/out/persistence/autos/AutosStore.java
  - ../../../src/main/java/dev/bryan/infrastructure/out/ws/AutosCambios.java
  - ../../../src/main/java/dev/bryan/infrastructure/out/ws/AutosBroadcaster.java
  - ../../../src/main/java/dev/bryan/infrastructure/in/ws/AutosWs.java
c4_level: Sequence
focus_id: autos-consumer
focus_name: AutosConsumer
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: telemetry-api
endpoint: "WS /ws/autos"
operation_id: ws-autos
endpoint_provenance: EXTRACTED
---

# Secuencia · WebSocket /ws/autos y difusión de posiciones

**Endpoint:** `WS /ws/autos` · **operación:** `ws-autos` · **procedencia:** `EXTRACTED`

**Foco:** `AutosConsumer` (borde dark red 700).

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant W as Navegador WebSocket
  participant WS as AutosWs
  participant KF as Kafka ultima-posicion
  participant R as AutosConsumer · foco
  participant U as IngestaAutosService
  participant A as AutosStore
  participant PG as PostgreSQL
  participant D as AutosCambios
  participant B as AutosBroadcaster
  participant M as MetricasMicrometer
  W->>WS: abre /ws/autos
  KF->>R: lote de AutoEvento
  R->>U: ingestar(lote)
  U->>A: guardarLote(lote)
  A->>PG: BEGIN, upsert nativo por auto solo si ts mayor, RETURNING
  PG-->>A: filas que cambiaron
  A->>PG: COMMIT
  A-->>U: autos que cambiaron
  U->>D: registrar(cambios)
  R-->>KF: confirma el offset tras el commit
  loop cada 500 ms
    B->>D: drenar()
    alt hay cambios y conexiones abiertas
      B-->>W: un mensaje con el arreglo de autos
    end
  end
  alt falla la persistencia
    A-->>U: IllegalStateException
    U->>M: autosFalloPersistencia()
    U-->>R: propaga el error
    R-->>KF: failure-strategy fail: el canal se detiene y readiness queda en DOWN
  end
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| infrastructure/in (messaging) | AutosConsumer, `@Incoming("ultima-posicion")`, `@Blocking`, `POST_PROCESSING` | [`AutosConsumer.java`](../../../src/main/java/dev/bryan/infrastructure/in/messaging/autos/AutosConsumer.java) |
| application (port/in) | IngestarUltimasPosiciones → IngestaAutosService | [`IngestaAutosService.java`](../../../src/main/java/dev/bryan/application/service/IngestaAutosService.java) |
| application (port/out) | AutosRepositorio, DifusionAutos, MetricasIngesta | [`DifusionAutos.java`](../../../src/main/java/dev/bryan/application/port/out/DifusionAutos.java) |
| infrastructure/out | AutosStore, AutosCambios, AutosBroadcaster (timer Vert.x) | [`AutosBroadcaster.java`](../../../src/main/java/dev/bryan/infrastructure/out/ws/AutosBroadcaster.java) |
| infrastructure/in (ws) | AutosWs solo registra la apertura; no recibe mensajes | [`AutosWs.java`](../../../src/main/java/dev/bryan/infrastructure/in/ws/AutosWs.java) |

## Errores relevantes

| Efecto | Causa | Origen |
|---|---|---|
| canal detenido y readiness DOWN | fallo de BD o evento inválido | `failure-strategy=fail`; se recupera reiniciando la API |
| mensaje no entregado | la API cae entre el commit y el envío | el WebSocket no es durable; el cliente se recupera con `GET /autos` |

## Pruebas que lo cubren

- [`AutosWsTest`](../../../src/test/java/dev/bryan/infrastructure/in/ws/AutosWsTest.java)
- [`AutosConsumerTest`](../../../src/test/java/dev/bryan/infrastructure/in/messaging/autos/AutosConsumerTest.java)
- [`AutosCambiosTest`](../../../src/test/java/dev/bryan/infrastructure/out/ws/AutosCambiosTest.java)
- [`AutosStoreTest`](../../../src/test/java/dev/bryan/infrastructure/out/persistence/autos/AutosStoreTest.java)

## Notas

- No existe `correlation ID` de entrada: el `requestId` nace en `GlobalExceptionMapper` y solo viaja en el cuerpo de los errores (`STD-ERR-001`).
- Sin autenticación ni autorización en el servicio (ver [documentation-review.md](../documentation-review.md)).

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`ws-autos.mmd`](../diagrams/sequences/ws-autos.mmd)
