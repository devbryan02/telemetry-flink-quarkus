---
okf_version: 0.2
generated: 2026-11-16
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../src/main/java/dev/bryan/infrastructure/in/rest/ViajesResource.java
  - ../../../src/main/java/dev/bryan/application/service/ViajesService.java
  - ../../../src/main/java/dev/bryan/infrastructure/out/persistence/viajes/ViajesConsulta.java
  - ../../../src/main/java/dev/bryan/infrastructure/out/persistence/viajes/CursorViajes.java
c4_level: Sequence
focus_id: viajes-resource
focus_name: ViajesResource
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: telemetry-api
endpoint: "GET /viajes/{viajeId}/posiciones"
operation_id: posiciones
endpoint_provenance: INFERRED
---

# Secuencia · GET /viajes/{viajeId}/posiciones

**Endpoint:** `GET /viajes/{viajeId}/posiciones` · **operación:** `posiciones` · **procedencia:** `INFERRED` (no hay OpenAPI; se dedujo del código del recurso)

**Foco:** `ViajesResource` (borde dark red 700).

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Cliente REST
  participant R as ViajesResource · foco
  participant U as ViajesService
  participant Q as ViajesConsulta
  participant K as CursorViajes
  participant PG as PostgreSQL
  participant E as GlobalExceptionMapper
  C->>R: GET /viajes/viajeId/posiciones con desde, hasta, limit y cursor
  R->>R: valida UUID, números y límite
  alt parámetro inválido
    R-->>E: ConsultaViajesInvalidaException
    E-->>C: 400 CONSULTA_VIAJES_INVALIDA con requestId
  else parámetros válidos
    R->>U: posiciones(viajeId, filtro, pagina)
    U->>Q: posiciones(viajeId, filtro, pagina)
    Q->>K: decodificar(cursor) ligado a viaje, filtros y límite
    Q->>PG: SELECT ViajeEntity por viaje_id
    alt el viaje no existe
      Q-->>E: ViajeNoEncontradoException
      E-->>C: 404 VIAJE_NO_ENCONTRADO con requestId
    else existe
      Q->>PG: HQL sobre PosicionHistorialEntity ORDER BY ts y event_id, limit+1
      PG-->>Q: filas
      Q->>K: codificar(última) si sobra una fila
      Q-->>U: Pagina de PosicionVista
      U-->>R: Pagina
      R-->>C: 200 application/json
    end
  end
  alt PostgreSQL falla
    Q-->>E: IllegalStateException
    E-->>C: 500 INTERNAL_ERROR sin detalles de BD
  end
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| infrastructure/in (REST) | ViajesResource | [`ViajesResource.java`](../../../src/main/java/dev/bryan/infrastructure/in/rest/ViajesResource.java) |
| domain | FiltroPosiciones, ConsultaPagina, PosicionVista | [`FiltroPosiciones.java`](../../../src/main/java/dev/bryan/domain/model/FiltroPosiciones.java) |
| application (port/in) | ConsultarViajes → ViajesService | [`ViajesService.java`](../../../src/main/java/dev/bryan/application/service/ViajesService.java) |
| application (port/out) | ViajesConsultaRepositorio | [`ViajesConsultaRepositorio.java`](../../../src/main/java/dev/bryan/application/port/out/ViajesConsultaRepositorio.java) |
| infrastructure/out (persistence) | ViajesConsulta + CursorViajes (keyset por ts y event_id) | [`ViajesConsulta.java`](../../../src/main/java/dev/bryan/infrastructure/out/persistence/viajes/ViajesConsulta.java) |

## Errores relevantes

| Código | Causa | Origen |
|---|---|---|
| 400 `CONSULTA_VIAJES_INVALIDA` | UUID, número, rango, límite o cursor inválidos | `ViajesResource`, `CursorViajes`, `ViajesConsulta` |
| 404 `VIAJE_NO_ENCONTRADO` | el viaje no existe | `ViajesConsulta` |
| 500 `INTERNAL_ERROR` | fallo de PostgreSQL | `ViajesConsulta` |

## Pruebas que lo cubren

- [`ViajesResourceTest`](../../../src/test/java/dev/bryan/infrastructure/in/rest/ViajesResourceTest.java)
- [`CursorViajesTest`](../../../src/test/java/dev/bryan/infrastructure/out/persistence/viajes/CursorViajesTest.java)

## Notas

- No existe `correlation ID` de entrada: el `requestId` nace en `GlobalExceptionMapper` y solo viaja en el cuerpo de los errores (`STD-ERR-001`).
- Sin autenticación ni autorización en el servicio (ver [documentation-review.md](../documentation-review.md)).

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`get-viajes-viajeid-posiciones.mmd`](../diagrams/sequences/get-viajes-viajeid-posiciones.mmd)
