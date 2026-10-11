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
focus_id: telemetry-api.post-simulacion-iniciar
focus_name: POST /simulacion/iniciar
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: .
endpoint: "POST /simulacion/iniciar"
operation_id: "SimulacionResource.iniciar"
provenance_endpoint: INFERRED
---

# Secuencia · `POST /simulacion/iniciar`

| Campo | Valor |
|---|---|
| Endpoint | `POST /simulacion/iniciar` |
| operationId | `SimulacionResource.iniciar` (`INFERRED`: no hay especificación OpenAPI) |
| Implementación | [`SimulacionResource.java`](../../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java) |
| Cliente | `dashboard-next` · api.ts iniciarCarrera, botón Iniciar carrera |
| Respuestas | 200 Estado EN_CURSO · 400 RUTA_REQUERIDA · 404 RUTA_NO_ENCONTRADA · 400 HTTP_400 si el JSON es inválido |
| Seguridad | Ninguna (RNF-5). CORS solo para `http://localhost:3000`. |
| Correlación | `requestId` generado en la respuesta de error; no se propaga un correlation ID en las respuestas 2xx ni por Kafka. |
| Criterios | Criterio 2 (salida conjunta, llegada y fin), RF-S1, RF-S3, RF-S4, RF-S5 |
| Foco | Participante `R` (borde dark red 700) |

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant C as Dashboard api.ts
  participant R as SimulacionResource · foco
  participant S as Simulador
  participant CAT as CatalogoRutas
  participant A as AutoCorredor
  participant V as Vert.x timer
  participant K as Kafka telemetria
  participant E as GlobalExceptionMapper
  C->>R: POST /simulacion/iniciar · iniciar · body ruta
  alt ruta vacía o ausente
    R-->>E: ComsatelException 400 RUTA_REQUERIDA
    E-->>C: 400 ErrorResponse con requestId
  else ruta indicada
    R->>S: iniciar(ruta)
    S->>CAT: ruta(id)
    alt ruta inexistente
      CAT-->>E: ComsatelException 404 RUTA_NO_ENCONTRADA
      E-->>C: 404 ErrorResponse con requestId
    else ruta encontrada
      CAT-->>S: Ruta con longitud
      S->>V: cancelar temporizador previo
      S->>A: crear uno por auto del escenario
      S->>K: publicar salida, key carId, JSON de 9 campos
      S->>V: setPeriodic intervalo-ms
      S-->>R: Estado EN_CURSO
      R-->>C: 200 application/json
      loop cada 1 s hasta que todos lleguen
        V->>S: avanzar()
        S->>A: avanzar(segundos, tiempo)
        S->>K: publicar autos en pista
        opt todos llegaron
          S->>V: cancelar temporizador, estado TERMINADA
        end
      end
    end
  end
```
