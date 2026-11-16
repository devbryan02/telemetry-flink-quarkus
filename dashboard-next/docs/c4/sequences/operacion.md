---
okf_version: 0.2
generated: 2026-11-16
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../features/operacion/components/operacion-pantalla.tsx
  - ../../../features/operacion/api.ts
  - ../../../features/operacion/salud.ts
  - ../../../features/operacion/prometheus.ts
c4_level: Sequence
focus_id: operacion-pantalla
focus_name: OperacionPantalla
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: dashboard-next
ui_route: "/operacion"
journey_provenance: EXTRACTED
---

# Secuencia · Operación: salud y métricas de la API

**Pantalla o ruta:** `/operacion` · **Foco:** `OperacionPantalla` (borde dark red 700) · **procedencia:** `EXTRACTED` del código de `features/`.

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant U as Usuario
  participant R as OperacionPantalla · foco
  participant A as operacion/api
  participant API as telemetry-api
  participant S as interpretarSalud
  participant PR as parsearPrometheus
  U->>R: abre /operacion
  loop al montar y cada 5 s
    R->>A: obtenerSalud() y obtenerMetricas() en paralelo
    A->>API: GET /q/health/ready aceptando 200 y 503
    A->>API: GET /q/metrics como texto
    API-->>A: JSON de salud y texto de Prometheus
    A->>S: interpretarSalud(status, cuerpo)
    A->>PR: parsearPrometheus(texto)
    A-->>R: Salud y muestras
    R->>R: tasaPorSegundo con el contador de eventos insertados
    R-->>U: salud por componente y canal, indicadores y lag por canal
  end
  alt la API no responde
    A-->>R: excepción
    R-->>U: No se pudo leer la API
  else 503 con cuerpo de salud
    S-->>R: Salud DOWN
    R-->>U: Readiness DOWN con el canal afectado
  else cuerpo inesperado
    S-->>R: Salud DOWN con error
  end
  U->>R: clic en Abrir Flink UI
  Note over U,R: enlace externo a NEXT_PUBLIC_FLINK_UI_URL, no pasa por el cliente HTTP
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| app (ruta) | app/operacion/page.tsx | [`page.tsx`](../../../app/operacion/page.tsx) |
| features/operacion (componente) | OperacionPantalla: sondeo cada 5 s | [`operacion-pantalla.tsx`](../../../features/operacion/components/operacion-pantalla.tsx) |
| features/operacion (cliente HTTP) | obtenerSalud (acepta 200 y 503), obtenerMetricas | [`api.ts`](../../../features/operacion/api.ts) |
| features/operacion (lógica pura) | interpretarSalud, filasSalud, parsearPrometheus, tasaPorSegundo | [`prometheus.ts`](../../../features/operacion/prometheus.ts) |

## Llamadas a telemetry-api

| Método | Path | Función del cliente |
|---|---|---|
| GET | `/q/health/ready` | `obtenerSalud` (`validateStatus` acepta 200 y 503) |
| GET | `/q/metrics` | `obtenerMetricas` (texto de Prometheus) |

## Errores y estados relevantes

| Situación | Qué ve el usuario |
|---|---|
| la API no responde | `InlineNotification` `No se pudo leer la API` |
| readiness 503 | etiqueta `Readiness DOWN` y la fila del canal afectado en DOWN |
| contador reiniciado o primera lectura | `Eventos por segundo` muestra `—` |

## Pruebas que lo cubren

- [`salud.test.ts`](../../../features/operacion/salud.test.ts)
- [`prometheus.test.ts`](../../../features/operacion/prometheus.test.ts)

## Notas

- No hay BFF: el navegador llama a `telemetry-api` directamente con `axios` (`NEXT_PUBLIC_API_URL`) y al WebSocket con `WebSocket` nativo (`NEXT_PUBLIC_WS_URL`); no se envía ningún `correlation ID`.
- Sin autenticación ni sesión.

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`operacion.mmd`](../diagrams/sequences/operacion.mmd)
