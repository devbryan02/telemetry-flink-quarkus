---
okf_version: 0.2
generated: 2026-11-16
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../features/viajes/components/repeticion-pantalla.tsx
  - ../../../features/viajes/hooks/use-repeticion.ts
  - ../../../features/viajes/api.ts
  - ../../../features/viajes/repeticion.ts
c4_level: Sequence
focus_id: repeticion-pantalla
focus_name: RepeticionPantalla
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: dashboard-next
ui_route: "/viajes/[viajeId]"
journey_provenance: EXTRACTED
---

# Secuencia · Viaje: repetición del recorrido

**Pantalla o ruta:** `/viajes/[viajeId]` · **Foco:** `RepeticionPantalla` (borde dark red 700) · **procedencia:** `EXTRACTED` del código de `features/`.

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant U as Usuario
  participant R as RepeticionPantalla · foco
  participant H as useRepeticion
  participant A as viajes/api
  participant API as telemetry-api
  participant P as prepararRecorrido
  U->>R: abre /viajes/viajeId
  R->>H: useRepeticion(viajeId)
  H->>A: obtenerViaje y listarPosiciones en paralelo
  A->>API: GET /viajes/viajeId
  loop páginas de 1000 hasta que no haya nextCursor, máximo 50
    A->>API: GET /viajes/viajeId/posiciones con cursor
    API-->>A: Pagina de PosicionVista
  end
  alt 200
    API-->>H: ViajeDetalle y todas las muestras
    H->>P: ordena por ts, quita ts repetidos y acumula metros
    P-->>H: Recorrido
    opt el viaje tiene carreraId
      H->>A: listarViajes con carreraId
      A->>API: GET /viajes con carreraId
      API-->>H: viajes hermanos sin los REEMPLAZADO
    end
    H-->>R: detalle, recorrido, huecos y velocidades
    R-->>U: mapa, resumen, gráfico y reproductor
  else 404
    H-->>R: El viaje no existe.
  else más de 50 páginas u otro error
    H-->>R: mensaje de error
  end
  U->>R: Reproducir con factor 1, 4 o 16
  loop cada frame mientras reproduce
    H->>H: avanza ts por el tiempo real multiplicado por el factor
    H-->>R: instante interpolado con estadoEn
  end
  U->>R: elige otro auto de la carrera
  Note over R: key=viajeId monta un reproductor, mapa y solicitudes nuevos
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| app (ruta) | app/viajes/[viajeId]/page.tsx con `Suspense` | [`page.tsx`](../../../app/viajes/[viajeId]/page.tsx) |
| features/viajes (componente) | RepeticionPantalla, Reproductor, GraficoVelocidad, RecorridoLayer | [`repeticion-pantalla.tsx`](../../../features/viajes/components/repeticion-pantalla.tsx) |
| features/viajes (hook) | useRepeticion: carga, reproducción por `requestAnimationFrame` | [`use-repeticion.ts`](../../../features/viajes/hooks/use-repeticion.ts) |
| features/viajes (lógica pura) | prepararRecorrido, estadoEn, huecos, velocidades | [`repeticion.ts`](../../../features/viajes/repeticion.ts) |
| features/viajes (cliente HTTP) | obtenerViaje, listarPosiciones, listarViajes | [`api.ts`](../../../features/viajes/api.ts) |
| features/autos (por su `index.ts`) | useEstilosMapa y varColor | [`index.ts`](../../../features/autos/index.ts) |

## Llamadas a telemetry-api

| Método | Path | Función del cliente |
|---|---|---|
| GET | `/viajes/{viajeId}` | `obtenerViaje` |
| GET | `/viajes/{viajeId}/posiciones` | `listarPosiciones` (páginas de 1000, tope de 50) |
| GET | `/viajes` | `listarViajes` con `carreraId` |

## Errores y estados relevantes

| Situación | Qué ve el usuario |
|---|---|
| 404 | `El viaje no existe.` |
| más de 50 páginas | error `El viaje supera el límite de 50 páginas de muestras…` |
| huecos de más de 1,5 s entre muestras | se resaltan en el mapa y en el gráfico |

## Pruebas que lo cubren

- [`repeticion.test.ts`](../../../features/viajes/repeticion.test.ts)
- [`api.test.ts`](../../../features/viajes/api.test.ts)
- [`presentacion.test.ts`](../../../features/viajes/presentacion.test.ts)

## Notas

- No hay BFF: el navegador llama a `telemetry-api` directamente con `axios` (`NEXT_PUBLIC_API_URL`) y al WebSocket con `WebSocket` nativo (`NEXT_PUBLIC_WS_URL`); no se envía ningún `correlation ID`.
- Sin autenticación ni sesión.

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`viaje-repeticion.mmd`](../diagrams/sequences/viaje-repeticion.mmd)
