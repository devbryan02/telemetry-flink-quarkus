---
okf_version: 0.2
generated: 2026-10-15
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../telemetry-api/src/main/java/dev/bryan/viajes/ViajesResource.java
  - ../../../telemetry-api/src/main/java/dev/bryan/viajes/ViajesConsulta.java
  - ../../../telemetry-api/src/main/java/dev/bryan/viajes/ResumenViajeCalculador.java
  - ../../specs/persistencia-posiciones-viajes.md
c4_level: Sequence
focus_id: telemetry-api.get-viajes-viajeid
focus_name: GET /viajes/{viajeId}
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: .
endpoint: "GET /viajes/{viajeId}"
operation_id: "ViajesResource.detalle"
provenance_endpoint: INFERRED
---

# Secuencia · `GET /viajes/{viajeId}`

| Campo | Valor |
|---|---|
| Endpoint | `GET /viajes/{viajeId}` |
| operationId | `ViajesResource.detalle` (`INFERRED`: no hay especificación OpenAPI) |
| Implementación | [`ViajesResource.java`](../../../telemetry-api/src/main/java/dev/bryan/viajes/ViajesResource.java) (`@Blocking`), [`ViajesConsulta.java`](../../../telemetry-api/src/main/java/dev/bryan/viajes/ViajesConsulta.java), [`ResumenViajeCalculador.java`](../../../telemetry-api/src/main/java/dev/bryan/viajes/ResumenViajeCalculador.java) |
| Cliente | Ninguno en el dashboard; operador o cliente REST |
| Respuestas | 200 `ViajeDetalle {viaje, resumen}` · 400 CONSULTA_VIAJES_INVALIDA (UUID mal formado) · 404 VIAJE_NO_ENCONTRADO · 500 INTERNAL_ERROR |
| Seguridad | Ninguna (RNF-5). CORS solo para `http://localhost:3000`. |
| Correlación | `requestId` generado en la respuesta de error; no se propaga un correlation ID en las respuestas 2xx. |
| Criterios | Spec de persistencia §6, §7 y criterios 5, 6, 7 y 10 |
| Foco | Participante `R` (borde dark red 700) |

El resumen se calcula sobre **todas** las muestras confirmadas, leídas en streaming (`fetchSize` 1000) dentro de una transacción de solo lectura `REPEATABLE READ`, para que viaje y muestras sean coherentes. Con varias muestras en el mismo `ts`, solo la primera en orden `event_id` cuenta para distancia y velocidad.

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Cliente REST
  participant R as ViajesResource · foco
  participant Q as ViajesConsulta
  participant PG as PostgreSQL
  participant RC as ResumenViajeCalculador
  participant E as GlobalExceptionMapper
  C->>R: GET /viajes/viajeId · detalle
  alt viajeId no es UUID
    R-->>E: ConsultaViajesInvalidaException
    E-->>C: 400 CONSULTA_VIAJES_INVALIDA con requestId
  else UUID válido
    R->>Q: detalle(viajeId)
    Q->>PG: BEGIN read only, REPEATABLE READ
    Q->>PG: SELECT tb_viaje WHERE viaje_id
    alt el viaje no existe
      Q->>PG: ROLLBACK
      Q-->>E: ViajeNoEncontradoException
      E-->>C: 404 VIAJE_NO_ENCONTRADO
    else existe
      Q->>PG: SELECT tb_posicion_historial ORDER BY ts, event_id
      PG-->>Q: cursor de filas
      Q->>RC: calcular(viaje, iterador de muestras)
      RC-->>Q: cantidadMuestras, ultimoTs, duraciones, distancia Haversine, velocidad media, maxIntervalo
      Q->>PG: COMMIT
      Q-->>R: ViajeDetalle
      R-->>C: 200 application/json
    end
  end
  alt PostgreSQL no responde
    Q-->>E: IllegalStateException
    E-->>C: 500 INTERNAL_ERROR sin detalles de BD
  end
```
