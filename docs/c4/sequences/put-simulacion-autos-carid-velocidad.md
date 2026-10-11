---
okf_version: 0.2
generated: 2026-10-10
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java
  - ../../specs/telemetria.md
c4_level: Sequence
focus_id: telemetry-api.put-simulacion-autos-carid-velocidad
focus_name: PUT /simulacion/autos/{carId}/velocidad
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: .
endpoint: "PUT /simulacion/autos/{carId}/velocidad"
operation_id: "SimulacionResource.velocidad"
provenance_endpoint: INFERRED
---

# Secuencia · `PUT /simulacion/autos/{carId}/velocidad`

| Campo | Valor |
|---|---|
| Endpoint | `PUT /simulacion/autos/{carId}/velocidad` |
| operationId | `SimulacionResource.velocidad` (`INFERRED`: no hay especificación OpenAPI) |
| Implementación | [`SimulacionResource.java`](../../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java) |
| Cliente | `dashboard-next` · api.ts cambiarVelocidad, slider de cada auto |
| Respuestas | 200 Estado · 400 VELOCIDAD_INVALIDA · 404 AUTO_NO_ENCONTRADO |
| Seguridad | Ninguna (RNF-5). CORS solo para `http://localhost:3000`. |
| Correlación | `requestId` generado en la respuesta de error; no se propaga un correlation ID en las respuestas 2xx ni por Kafka. |
| Criterios | Criterio 3 (el slider cambia el ritmo y el orden), RF-S2, RF-U5 |
| Foco | Participante `R` (borde dark red 700) |

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Dashboard api.ts
  participant R as SimulacionResource · foco
  participant S as Simulador
  participant CAT as CatalogoRutas
  participant A as AutoCorredor
  participant E as GlobalExceptionMapper
  C->>R: PUT /simulacion/autos/auto-2/velocidad · velocidad · body kmh
  alt kmh ausente
    R-->>E: ComsatelException 400 VELOCIDAD_INVALIDA
    E-->>C: 400 ErrorResponse
  else kmh presente
    R->>S: velocidad(carId, kmh)
    alt fuera de 10 a 500 km/h
      S-->>E: ComsatelException 400 VELOCIDAD_INVALIDA
      E-->>C: 400 ErrorResponse
    else rango válido
      S->>CAT: escenario(carrera)
      alt carId no está en el escenario
        S-->>E: ComsatelException 404 AUTO_NO_ENCONTRADO
        E-->>C: 404 ErrorResponse
      else auto existente
        S->>S: guardar velocidad para próximas carreras
        S->>A: velocidad(kmh) si está en pista
        S-->>R: Estado
        R-->>C: 200 application/json
      end
    end
  end
```
