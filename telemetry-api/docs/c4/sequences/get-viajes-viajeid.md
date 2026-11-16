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
  - ../../../src/main/java/dev/bryan/domain/service/ResumenViajeCalculador.java
c4_level: Sequence
focus_id: viajes-resource
focus_name: ViajesResource
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: telemetry-api
endpoint: "GET /viajes/{viajeId}"
operation_id: detalle
endpoint_provenance: INFERRED
---

# Secuencia · GET /viajes/{viajeId}

**Endpoint:** `GET /viajes/{viajeId}` · **operación:** `detalle` · **procedencia:** `INFERRED` (no hay OpenAPI; se dedujo del código del recurso)

**Foco:** `ViajesResource` (borde dark red 700).

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Cliente REST
  participant R as ViajesResource · foco
  participant U as ViajesService
  participant Q as ViajesConsulta
  participant RC as ResumenViajeCalculador
  participant PG as PostgreSQL
  participant E as GlobalExceptionMapper
  C->>R: GET /viajes/viajeId
  alt viajeId no es UUID
    R-->>E: ConsultaViajesInvalidaException
    E-->>C: 400 CONSULTA_VIAJES_INVALIDA con requestId
  else UUID válido
    R->>U: detalle(viajeId)
    U->>Q: detalle(viajeId)
    Q->>PG: BEGIN, SET TRANSACTION REPEATABLE READ, READ ONLY
    Q->>PG: SELECT ViajeEntity por viaje_id
    alt el viaje no existe
      Q-->>E: ViajeNoEncontradoException
      E-->>C: 404 VIAJE_NO_ENCONTRADO con requestId
    else existe
      Q->>PG: SELECT tb_posicion_historial ORDER BY ts, event_id con fetchSize 1000
      PG-->>Q: cursor de filas
      Q->>RC: calcular(viaje, iterador de muestras)
      RC-->>Q: ResumenViaje
      Q->>PG: COMMIT
      Q-->>U: ViajeDetalle
      U-->>R: ViajeDetalle
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
| application (port/in) | ConsultarViajes → ViajesService | [`ViajesService.java`](../../../src/main/java/dev/bryan/application/service/ViajesService.java) |
| application (port/out) | ViajesConsultaRepositorio | [`ViajesConsultaRepositorio.java`](../../../src/main/java/dev/bryan/application/port/out/ViajesConsultaRepositorio.java) |
| infrastructure/out (persistence) | ViajesConsulta (snapshot REPEATABLE READ de solo lectura) | [`ViajesConsulta.java`](../../../src/main/java/dev/bryan/infrastructure/out/persistence/viajes/ViajesConsulta.java) |
| domain | ResumenViajeCalculador, ViajeDetalle, ResumenViaje | [`ResumenViajeCalculador.java`](../../../src/main/java/dev/bryan/domain/service/ResumenViajeCalculador.java) |

## Errores relevantes

| Código | Causa | Origen |
|---|---|---|
| 400 `CONSULTA_VIAJES_INVALIDA` | `viajeId` no es un UUID | `ViajesResource` |
| 404 `VIAJE_NO_ENCONTRADO` | el viaje no existe | `ViajesConsulta` |
| 500 `INTERNAL_ERROR` | fallo de PostgreSQL | `ViajesConsulta` |

## Pruebas que lo cubren

- [`ViajeDetalleTest`](../../../src/test/java/dev/bryan/infrastructure/out/persistence/viajes/ViajeDetalleTest.java)
- [`ResumenViajeTest`](../../../src/test/java/dev/bryan/domain/service/ResumenViajeTest.java)

## Notas

- No existe `correlation ID` de entrada: el `requestId` nace en `GlobalExceptionMapper` y solo viaja en el cuerpo de los errores (`STD-ERR-001`).
- Sin autenticación ni autorización en el servicio (ver [documentation-review.md](../documentation-review.md)).

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`get-viajes-viajeid.mmd`](../diagrams/sequences/get-viajes-viajeid.mmd)
