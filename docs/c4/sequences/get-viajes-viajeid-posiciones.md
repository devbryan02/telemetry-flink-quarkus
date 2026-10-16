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
  - ../../../telemetry-api/src/main/java/dev/bryan/viajes/CursorViajes.java
  - ../../specs/persistencia-posiciones-viajes.md
c4_level: Sequence
focus_id: telemetry-api.get-viajes-viajeid-posiciones
focus_name: GET /viajes/{viajeId}/posiciones
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: .
endpoint: "GET /viajes/{viajeId}/posiciones"
operation_id: "ViajesResource.posiciones"
provenance_endpoint: INFERRED
---

# Secuencia · `GET /viajes/{viajeId}/posiciones`

| Campo | Valor |
|---|---|
| Endpoint | `GET /viajes/{viajeId}/posiciones?desde=&hasta=&limit=&cursor=` (parámetros opcionales) |
| operationId | `ViajesResource.posiciones` (`INFERRED`: no hay especificación OpenAPI) |
| Implementación | [`ViajesResource.java`](../../../telemetry-api/src/main/java/dev/bryan/viajes/ViajesResource.java) (`@Blocking`), [`ViajesConsulta.java`](../../../telemetry-api/src/main/java/dev/bryan/viajes/ViajesConsulta.java), [`CursorViajes.java`](../../../telemetry-api/src/main/java/dev/bryan/viajes/CursorViajes.java) |
| Cliente | Ninguno en el dashboard; operador o cliente REST |
| Respuestas | 200 `{items: PosicionVista[], nextCursor}` con `eventId`, `viajeId`, `tipoEvento`, `receivedAt` y los campos de telemetría · 400 CONSULTA_VIAJES_INVALIDA · 404 VIAJE_NO_ENCONTRADO · 500 INTERNAL_ERROR |
| Seguridad | Ninguna (RNF-5). CORS solo para `http://localhost:3000`. |
| Correlación | `requestId` generado en la respuesta de error; no se propaga un correlation ID en las respuestas 2xx. |
| Criterios | Spec de persistencia §6, §7 y criterios 3, 4 y 9 |
| Foco | Participante `R` (borde dark red 700) |

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Cliente REST
  participant R as ViajesResource · foco
  participant Q as ViajesConsulta
  participant CU as CursorViajes
  participant PG as PostgreSQL
  participant E as GlobalExceptionMapper
  C->>R: GET /viajes/viajeId/posiciones · posiciones
  alt viajeId no es UUID, desde o hasta no son números, o limit fuera de 1 a 1000
    R-->>E: ConsultaViajesInvalidaException
    E-->>C: 400 CONSULTA_VIAJES_INVALIDA con requestId
  else parámetros válidos, limit 100 por defecto
    R->>Q: posiciones(viajeId, FiltroPosiciones, ConsultaPagina)
    Q->>CU: decodificar(cursor, posiciones, filtro, viajeId, limit)
    alt rango invertido o cursor de otra consulta
      CU-->>E: ConsultaViajesInvalidaException
      E-->>C: 400 CONSULTA_VIAJES_INVALIDA
    else válido
      Q->>PG: SELECT tb_viaje WHERE viaje_id
      alt el viaje no existe
        Q-->>E: ViajeNoEncontradoException
        E-->>C: 404 VIAJE_NO_ENCONTRADO
      else existe
        Q->>PG: SELECT tb_posicion_historial, ts en desde hasta, después del cursor, ORDER BY ts, event_id LIMIT limit+1
        PG-->>Q: muestras, incluidas las de igual ts
        opt sobra una fila
          Q->>CU: codificar con ts y eventId de la última muestra
        end
        Q-->>R: Pagina items y nextCursor
        R-->>C: 200 application/json
      end
    end
  end
```
