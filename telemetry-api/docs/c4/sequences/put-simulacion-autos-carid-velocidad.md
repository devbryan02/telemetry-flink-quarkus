---
okf_version: 0.2
generated: 2026-11-16
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../src/main/java/dev/bryan/infrastructure/in/rest/SimulacionResource.java
  - ../../../src/main/java/dev/bryan/application/service/SimulacionService.java
  - ../../../src/main/java/dev/bryan/domain/service/AutoCorredor.java
c4_level: Sequence
focus_id: simulacion-service
focus_name: SimulacionService
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: telemetry-api
endpoint: "PUT /simulacion/autos/{carId}/velocidad"
operation_id: velocidad
endpoint_provenance: INFERRED
---

# Secuencia · PUT /simulacion/autos/{carId}/velocidad

**Endpoint:** `PUT /simulacion/autos/{carId}/velocidad` · **operación:** `velocidad` · **procedencia:** `INFERRED` (no hay OpenAPI; se dedujo del código del recurso)

**Foco:** `SimulacionService` (borde dark red 700).

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Cliente REST
  participant X as SimulacionResource
  participant R as SimulacionService · foco
  participant D as AutoCorredor (domain)
  participant K as CatalogoRutasClasspath
  participant E as GlobalExceptionMapper
  C->>X: PUT /simulacion/autos/carId/velocidad con kmh
  alt cuerpo o kmh ausente
    X-->>E: NegocioException VELOCIDAD_INVALIDA
    E-->>C: 400 con requestId
  else kmh informado
    X->>R: velocidad(carId, kmh)
    R->>D: velocidadValida(kmh)
    alt fuera de 10 a 500 km/h
      R-->>E: NegocioException VELOCIDAD_INVALIDA
      E-->>C: 400 con requestId
    else en rango
      R->>K: escenario(nombre)
      alt el auto no está en el escenario
        R-->>E: NegocioException AUTO_NO_ENCONTRADO
        E-->>C: 404 con requestId
      else existe
        R->>D: velocidad(kmh) del auto en carrera
        R-->>X: EstadoSimulacion
        X-->>C: 200 application/json
      end
    end
  end
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| infrastructure/in (REST) | SimulacionResource valida que exista `kmh` | [`SimulacionResource.java`](../../../src/main/java/dev/bryan/infrastructure/in/rest/SimulacionResource.java) |
| application (port/in) | GestionarSimulacion → SimulacionService (foco) | [`SimulacionService.java`](../../../src/main/java/dev/bryan/application/service/SimulacionService.java) |
| domain | AutoCorredor.velocidadValida y velocidad | [`AutoCorredor.java`](../../../src/main/java/dev/bryan/domain/service/AutoCorredor.java) |
| application (port/out) | CatalogoRutas (escenario) | [`CatalogoRutas.java`](../../../src/main/java/dev/bryan/application/port/out/CatalogoRutas.java) |

## Errores relevantes

| Código | Causa | Origen |
|---|---|---|
| 400 `VELOCIDAD_INVALIDA` | `kmh` ausente o fuera de 10 a 500 | `SimulacionResource`, `SimulacionService` |
| 404 `AUTO_NO_ENCONTRADO` | `carId` fuera del escenario | `SimulacionService` |

## Pruebas que lo cubren

- [`SimulacionResourceTest`](../../../src/test/java/dev/bryan/infrastructure/in/rest/SimulacionResourceTest.java)
- [`AutoCorredorTest`](../../../src/test/java/dev/bryan/domain/service/AutoCorredorTest.java)

## Notas

- No existe `correlation ID` de entrada: el `requestId` nace en `GlobalExceptionMapper` y solo viaja en el cuerpo de los errores (`STD-ERR-001`).
- Sin autenticación ni autorización en el servicio (ver [documentation-review.md](../documentation-review.md)).

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`put-simulacion-autos-carid-velocidad.mmd`](../diagrams/sequences/put-simulacion-autos-carid-velocidad.mmd)
