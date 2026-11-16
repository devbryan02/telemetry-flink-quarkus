---
okf_version: 0.2
generated: 2026-11-16
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../../features/autos/hooks/use-autos-socket.ts
  - ../../../features/autos/components/autos-map.tsx
  - ../../../features/autos/animacion.ts
  - ../../../features/autos/metricas.ts
  - ../../../features/autos/components/autos-layer.tsx
  - ../../../features/autos/geojson.ts
c4_level: Sequence
focus_id: autos-map
focus_name: AutosMap
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: dashboard-next
ui_route: "/"
journey_provenance: EXTRACTED
---

# Secuencia · Carrera: posiciones en tiempo real por WebSocket

**Pantalla o ruta:** `/` · **Foco:** `AutosMap` (borde dark red 700) · **procedencia:** `EXTRACTED` del código de `features/`.

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant API as telemetry-api
  participant S as useAutosSocket
  participant R as AutosMap · foco
  participant M as Metricas
  participant AN as Animador
  participant L as AutosLayer
  participant MP as MapLibre
  participant PV as PanelVivo
  API-->>S: mensaje con el arreglo de autos cada 500 ms
  S->>R: alRecibirLote(lote)
  R->>M: registrarLote(lote)
  R->>R: fusionar solo si el ts es mayor al guardado
  R->>AN: actualizar(auto, ahora)
  R->>R: animar() pide un frame
  loop mientras algún auto está en camino
    R->>AN: posiciones(ahora)
    AN-->>R: posiciones interpoladas
    R->>L: pintar(aGeoJSON(posiciones))
    L->>MP: setData de la fuente de autos
  end
  loop cada 1 s
    PV->>R: resumir() y opciones()
    R-->>PV: total, mostrados, edad del último dato y latencia p95
  end
  alt el mensaje no es JSON válido
    S->>S: se ignora y la conexión sigue
  else la conexión se cierra
    S->>S: estado reconectando
    S->>API: reintenta con espera de 1 s hasta 10 s
  end
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| features/autos (hook) | useAutosSocket: `WebSocket` nativo con backoff | [`use-autos-socket.ts`](../../../features/autos/hooks/use-autos-socket.ts) |
| features/autos (orquestador) | AutosMap.alRecibirLote, fusionar y animar; PanelVivo | [`autos-map.tsx`](../../../features/autos/components/autos-map.tsx) |
| features/autos (lógica pura) | Animador, Metricas, aGeoJSON | [`animacion.ts`](../../../features/autos/animacion.ts) |
| features/autos (capa de mapa) | AutosLayer: una fuente GeoJSON y una capa `symbol` | [`autos-layer.tsx`](../../../features/autos/components/autos-layer.tsx) |

## Llamadas a telemetry-api

| Método | Path | Función del cliente |
|---|---|---|
| WS | `/ws/autos` | `useAutosSocket` (solo recibe; el cliente no envía mensajes) |

## Errores y estados relevantes

| Situación | Comportamiento |
|---|---|
| conexión caída | etiqueta `Reconectando` en la cabecera y reintentos con espera de 1 s duplicada hasta 10 s |
| mensaje malformado | se descarta sin cerrar la conexión |
| evento atrasado | `fusionar` lo descarta si su `ts` no supera al guardado |
| salto mayor de 2 km o de 3 s entre eventos | el `Animador` no interpola: el auto aparece en su sitio |

## Pruebas que lo cubren

- [`estilo-mapa.test.ts`](../../../features/autos/estilo-mapa.test.ts)
- [`geojson.test.ts`](../../../features/autos/geojson.test.ts)
- [`formato.test.ts`](../../../features/autos/formato.test.ts)

## Notas

- No hay BFF: el navegador llama a `telemetry-api` directamente con `axios` (`NEXT_PUBLIC_API_URL`) y al WebSocket con `WebSocket` nativo (`NEXT_PUBLIC_WS_URL`); no se envía ningún `correlation ID`.
- Sin autenticación ni sesión.

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`carrera-tiempo-real.mmd`](../diagrams/sequences/carrera-tiempo-real.mmd)
