---
okf_version: 0.2
generated: 2026-10-15
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java
  - ../../../telemetry-api/src/main/java/dev/bryan/simulacion/Simulador.java
  - ../../../telemetry-api/src/main/java/dev/bryan/simulacion/PublicadorTelemetria.java
  - ../../specs/telemetria.md
  - ../../specs/persistencia-posiciones-viajes.md
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
| Implementación | [`SimulacionResource.java`](../../../telemetry-api/src/main/java/dev/bryan/simulacion/SimulacionResource.java), [`Simulador.java`](../../../telemetry-api/src/main/java/dev/bryan/simulacion/Simulador.java), [`PublicadorTelemetria.java`](../../../telemetry-api/src/main/java/dev/bryan/simulacion/PublicadorTelemetria.java) |
| Cliente | `dashboard-next` · api.ts iniciarCarrera, botón Iniciar carrera |
| Respuestas | 200 Estado EN_CURSO con `carreraId` y `viajeId` por auto · 400 RUTA_REQUERIDA · 404 RUTA_NO_ENCONTRADA · 400 HTTP_400 si el JSON es inválido |
| Seguridad | Ninguna (RNF-5). CORS solo para `http://localhost:3000`. |
| Correlación | `requestId` generado en la respuesta de error. En Kafka, cada evento lleva `eventId`, `carreraId` y `viajeId`, que también aparecen en los logs de fallo de publicación; no hay correlation ID HTTP. |
| Criterios | Criterio 2 (salida conjunta, llegada y fin), RF-S1, RF-S3, RF-S4, RF-S5; spec de persistencia §4.2 y criterios 1 y 5 |
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
  participant P as PublicadorTelemetria
  participant K as Kafka telemetria
  participant E as GlobalExceptionMapper
  C->>R: POST /simulacion/iniciar · iniciar · body ruta
  alt ruta vacía o ausente
    R-->>E: NegocioException 400 RUTA_REQUERIDA
    E-->>C: 400 ErrorResponse con requestId
  else ruta indicada
    R->>S: iniciar(ruta)
    S->>CAT: ruta(id)
    alt ruta inexistente
      CAT-->>E: NegocioException 404 RUTA_NO_ENCONTRADA
      E-->>C: 404 ErrorResponse con requestId
    else ruta encontrada
      CAT-->>S: Ruta con longitud
      opt había viajes abiertos de otra carrera
        S->>P: FIN motivo REEMPLAZADO por auto abierto
      end
      S->>V: cancelar temporizador previo
      S->>A: crear uno por auto del escenario, cada uno con su viajeId
      S->>S: carreraId nuevo y ts de RelojEventos
      S->>P: INICIO v2 de cada auto, ts igual a inicioViajeTs
      P->>K: Record key carId, en orden por auto
      S->>V: setPeriodic intervalo-ms
      S-->>R: Estado EN_CURSO
      R-->>C: 200 application/json
      loop cada 1 s hasta que todos lleguen
        V->>S: avanzar()
        S->>A: avanzar(segundos, tiempo)
        S->>P: POSICION de los autos en pista, FIN META de quien llegó
        P->>K: Record key carId
        opt todos llegaron
          S->>V: cancelar temporizador, estado TERMINADA
        end
      end
      opt Kafka no confirma un envío
        P->>P: log con eventId y viajeId
      end
    end
  end
```
