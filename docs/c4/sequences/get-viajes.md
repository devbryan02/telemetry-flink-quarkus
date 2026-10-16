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
focus_id: telemetry-api.get-viajes
focus_name: GET /viajes
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: .
endpoint: "GET /viajes"
operation_id: "ViajesResource.listar"
provenance_endpoint: INFERRED
---

# Secuencia · `GET /viajes`

| Campo | Valor |
|---|---|
| Endpoint | `GET /viajes?carId=&carreraId=&desde=&hasta=&limit=&cursor=` (todos opcionales) |
| operationId | `ViajesResource.listar` (`INFERRED`: no hay especificación OpenAPI) |
| Implementación | [`ViajesResource.java`](../../../telemetry-api/src/main/java/dev/bryan/viajes/ViajesResource.java) (`@Blocking`), [`ViajesConsulta.java`](../../../telemetry-api/src/main/java/dev/bryan/viajes/ViajesConsulta.java), [`CursorViajes.java`](../../../telemetry-api/src/main/java/dev/bryan/viajes/CursorViajes.java) |
| Cliente | Ninguno en el dashboard; operador o cliente REST (`curl`, `scripts/probar-persistencia.ps1`) |
| Respuestas | 200 `{items: ViajeVista[], nextCursor}` (página vacía si no hay resultados) · 400 CONSULTA_VIAJES_INVALIDA (UUID, número, `limit` fuera de 1–1000, rango invertido o cursor inválido) · 500 INTERNAL_ERROR |
| Seguridad | Ninguna (RNF-5). CORS solo para `http://localhost:3000`. |
| Correlación | `requestId` generado en la respuesta de error; no se propaga un correlation ID en las respuestas 2xx. |
| Criterios | Spec de persistencia §6 y criterios 1 y 9 |
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
  C->>R: GET /viajes con filtros, limit y cursor · listar
  alt carreraId no es UUID, desde o hasta no son números, o limit fuera de 1 a 1000
    R-->>E: ConsultaViajesInvalidaException
    E-->>C: 400 CONSULTA_VIAJES_INVALIDA con requestId
  else parámetros válidos, limit 100 por defecto
    R->>Q: listar(FiltroViajes, ConsultaPagina)
    Q->>Q: rango desde menor o igual que hasta
    Q->>CU: decodificar(cursor, viajes, filtro, limit)
    alt rango invertido o cursor de otra consulta
      CU-->>E: ConsultaViajesInvalidaException
      E-->>C: 400 CONSULTA_VIAJES_INVALIDA
    else válido
      Q->>PG: SELECT tb_viaje con filtros, inicio en desde hasta, después del cursor, ORDER BY inicio_viaje_ts DESC, viaje_id DESC LIMIT limit+1
      PG-->>Q: hasta limit+1 filas
      opt sobra una fila
        Q->>CU: codificar con el último viaje de la página
      end
      Q-->>R: Pagina items y nextCursor
      R-->>C: 200 application/json
    end
  end
  alt PostgreSQL no responde
    Q-->>E: IllegalStateException
    E-->>C: 500 INTERNAL_ERROR sin detalles de BD
  end
```
