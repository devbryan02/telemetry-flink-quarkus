---
okf_version: 0.2
generated: 2026-11-16
verified: true
human-reviewed: true
review_date: 2026-11-16
review_evidence: confirmacion expresa del responsable del repositorio en la sesion de Claude Code
status: READY_FOR_DEV
provenance: agent-generated
sources:
  - ../../../features/autos/components/fila-corredor.tsx
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

# Secuencia · Carrera: cambiar la velocidad de un auto

**Pantalla o ruta:** `/` · **Foco:** `AutosMap` (borde dark red 700) · **procedencia:** `EXTRACTED` del código de `features/`.

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant U as Usuario
  participant F as FilaCorredor
  participant R as AutosMap · foco
  participant A as autos/api
  participant API as telemetry-api
  participant Z as Notificación de error
  U->>F: arrastra el slider
  F->>F: guarda el borrador local sin llamar a la API
  U->>F: suelta el slider
  F->>F: acota el valor entre 10 y 500 km/h
  F->>R: onVelocidad(carId, kmh)
  R->>R: ejecutar con ocupado=true
  R->>A: cambiarVelocidad(carId, kmh)
  A->>API: PUT /simulacion/autos/carId/velocidad con kmh
  alt 200
    API-->>A: EstadoSimulacion con la nueva velocidad
    A-->>R: setSimulacion
    R-->>F: la clasificación muestra la velocidad confirmada
  else 400 VELOCIDAD_INVALIDA o 404 AUTO_NO_ENCONTRADO
    API-->>A: error con requestId
    A-->>R: excepción de axios
    R->>Z: No se pudo cambiar la velocidad
  end
  R->>R: ocupado=false
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| features/autos (componente) | FilaCorredor: Slider de Carbon, `onRelease` envía | [`fila-corredor.tsx`](../../../features/autos/components/fila-corredor.tsx) |
| features/autos (orquestador) | AutosMap.velocidad y ejecutar | [`autos-map.tsx`](../../../features/autos/components/autos-map.tsx) |
| features/autos (cliente HTTP) | cambiarVelocidad | [`api.ts`](../../../features/autos/api.ts) |

## Llamadas a telemetry-api

| Método | Path | Función del cliente |
|---|---|---|
| PUT | `/simulacion/autos/{carId}/velocidad` | `cambiarVelocidad` |

## Errores y estados relevantes

| Situación | Qué ve el usuario |
|---|---|
| 400 `VELOCIDAD_INVALIDA` | `No se pudo cambiar la velocidad: …` |
| 404 `AUTO_NO_ENCONTRADO` | el mismo mensaje con el detalle del backend |
| eco del sondeo | Carbon llama `onChange` cuando cambia la prop `value`; el componente lo ignora si coincide con la velocidad confirmada |

## Pruebas que lo cubren

- Sin prueba automatizada (ver [documentation-review.md](../documentation-review.md)).

## Notas

- No hay BFF: el navegador llama a `telemetry-api` directamente con `axios` (`NEXT_PUBLIC_API_URL`) y al WebSocket con `WebSocket` nativo (`NEXT_PUBLIC_WS_URL`); no se envía ningún `correlation ID`.
- Sin autenticación ni sesión.

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`carrera-cambiar-velocidad.mmd`](../diagrams/sequences/carrera-cambiar-velocidad.mmd)
