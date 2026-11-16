---
okf_version: 0.2
generated: 2026-11-16
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../features/autos/components/carrera-panel.tsx
  - ../../../features/autos/components/autos-map.tsx
  - ../../../features/autos/api.ts
c4_level: Sequence
focus_id: autos-map
focus_name: AutosMap
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: dashboard-next
ui_route: "/"
journey_provenance: EXTRACTED
---

# Secuencia · Carrera: iniciar y detener

**Pantalla o ruta:** `/` · **Foco:** `AutosMap` (borde dark red 700) · **procedencia:** `EXTRACTED` del código de `features/`.

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant U as Usuario
  participant P as CarreraPanel
  participant R as AutosMap · foco
  participant A as autos/api
  participant API as telemetry-api
  participant Z as Notificación de error
  alt el usuario pulsa Iniciar o Nueva carrera
    U->>P: clic en el botón
    P->>R: onIniciar()
    R->>R: ejecutar con ocupado=true
    R->>A: iniciarCarrera(rutaSeleccionada)
    A->>API: POST /simulacion/iniciar con ruta
    alt 200
      API-->>A: EstadoSimulacion EN_CURSO
      A-->>R: setSimulacion y error=null
      R-->>P: estado En curso, ruta bloqueada y cronómetro
    else 400 o 404
      API-->>A: error con code y requestId
      A-->>R: excepción de axios
      R->>Z: No se pudo iniciar la carrera
    end
  else el usuario pulsa Detener carrera
    U->>P: clic en Detener
    P->>R: onDetener()
    R->>A: detenerCarrera()
    A->>API: POST /simulacion/detener
    API-->>A: EstadoSimulacion LISTA
    A-->>R: setSimulacion
    R-->>P: estado Lista
  end
  R->>R: ocupado=false
  Note over R,API: con la carrera en curso el sondeo de GET /simulacion pasa a 1 s
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| features/autos (componente) | CarreraPanel: botones, ruta y estado | [`carrera-panel.tsx`](../../../features/autos/components/carrera-panel.tsx) |
| features/autos (orquestador) | AutosMap.iniciar, detener y ejecutar | [`autos-map.tsx`](../../../features/autos/components/autos-map.tsx) |
| features/autos (cliente HTTP) | iniciarCarrera, detenerCarrera | [`api.ts`](../../../features/autos/api.ts) |
| lib | cliente `axios` | [`http.ts`](../../../lib/http.ts) |

## Llamadas a telemetry-api

| Método | Path | Función del cliente |
|---|---|---|
| POST | `/simulacion/iniciar` | `iniciarCarrera` |
| POST | `/simulacion/detener` | `detenerCarrera` |
| GET | `/simulacion` | `obtenerSimulacion` (sondeo cada 1 s) |

## Errores y estados relevantes

| Situación | Qué ve el usuario |
|---|---|
| 400 `RUTA_REQUERIDA` o 404 `RUTA_NO_ENCONTRADA` | `No se pudo iniciar la carrera: …` en una `InlineNotification` |
| error al detener | `No se pudo detener la carrera: …` |
| mientras la petición está en curso | los botones quedan deshabilitados (`ocupado`) |

## Pruebas que lo cubren

- Sin prueba automatizada (ver [documentation-review.md](../documentation-review.md)).

## Notas

- No hay BFF: el navegador llama a `telemetry-api` directamente con `axios` (`NEXT_PUBLIC_API_URL`) y al WebSocket con `WebSocket` nativo (`NEXT_PUBLIC_WS_URL`); no se envía ningún `correlation ID`.
- Sin autenticación ni sesión.

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`carrera-iniciar-detener.mmd`](../diagrams/sequences/carrera-iniciar-detener.mmd)
