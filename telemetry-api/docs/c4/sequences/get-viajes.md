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
endpoint: "GET /viajes"
operation_id: listar
endpoint_provenance: INFERRED
---

# Secuencia · GET /viajes

**Endpoint:** `GET /viajes` · **operación:** `listar` · **procedencia:** `INFERRED` (no hay OpenAPI; se dedujo del código del recurso)

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
  C->>R: GET /viajes con carId, carreraId, desde, hasta, limit y cursor
  R->>R: valida UUID, números y límite
  alt parámetro inválido
    R-->>E: ConsultaViajesInvalidaException
    E-->>C: 400 CONSULTA_VIAJES_INVALIDA con requestId
  else parámetros válidos
    R->>U: listar(filtro, pagina)
    U->>Q: listar(filtro, pagina)
    Q->>K: decodificar(cursor) ligado a filtros y límite
    alt cursor inválido o de otro filtro
      K-->>E: ConsultaViajesInvalidaException
      E-->>C: 400 con requestId
    else cursor ausente o válido
      Q->>PG: HQL sobre ViajeEntity ORDER BY inicio_viaje_ts y viaje_id DESC, limit+1
      PG-->>Q: filas
      Q->>K: codificar(último) si sobra una fila
      Q-->>U: Pagina con items y nextCursor
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
| infrastructure/in (REST) | ViajesResource (parseo y validación) | [`ViajesResource.java`](../../../src/main/java/dev/bryan/infrastructure/in/rest/ViajesResource.java) |
| domain | FiltroViajes, ConsultaPagina, Pagina, ViajeVista | [`FiltroViajes.java`](../../../src/main/java/dev/bryan/domain/model/FiltroViajes.java) |
| application (port/in) | ConsultarViajes → ViajesService | [`ViajesService.java`](../../../src/main/java/dev/bryan/application/service/ViajesService.java) |
| application (port/out) | ViajesConsultaRepositorio | [`ViajesConsultaRepositorio.java`](../../../src/main/java/dev/bryan/application/port/out/ViajesConsultaRepositorio.java) |
| infrastructure/out (persistence) | ViajesConsulta + CursorViajes (HQL, keyset) | [`ViajesConsulta.java`](../../../src/main/java/dev/bryan/infrastructure/out/persistence/viajes/ViajesConsulta.java) |

## Errores relevantes

| Código | Causa | Origen |
|---|---|---|
| 400 `CONSULTA_VIAJES_INVALIDA` | UUID, número, rango, límite (1 a 1000) o cursor inválidos | `ViajesResource`, `ConsultaPagina`, `CursorViajes`, `ViajesConsulta` |
| 500 `INTERNAL_ERROR` | fallo de PostgreSQL | `ViajesConsulta` |

## Pruebas que lo cubren

- [`ViajesResourceTest`](../../../src/test/java/dev/bryan/infrastructure/in/rest/ViajesResourceTest.java)
- [`CursorViajesTest`](../../../src/test/java/dev/bryan/infrastructure/out/persistence/viajes/CursorViajesTest.java)

## Notas

- No existe `correlation ID` de entrada: el `requestId` nace en `GlobalExceptionMapper` y solo viaja en el cuerpo de los errores (`STD-ERR-001`).
- Sin autenticación ni autorización en el servicio (ver [documentation-review.md](../documentation-review.md)).

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`get-viajes.mmd`](../diagrams/sequences/get-viajes.mmd)
