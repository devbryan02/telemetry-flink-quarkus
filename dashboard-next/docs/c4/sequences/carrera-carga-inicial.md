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
  - ../../../app/page.tsx
  - ../../../features/autos/components/autos-dashboard.tsx
  - ../../../features/autos/components/autos-map.tsx
  - ../../../features/autos/api.ts
  - ../../../features/autos/hooks/use-autos-socket.ts
  - ../../../features/autos/hooks/use-estilos-mapa.ts
c4_level: Sequence
focus_id: autos-map
focus_name: AutosMap
focus_kind: participant
focus_highlight: dark-red-700-border
component_path: dashboard-next
ui_route: "/"
journey_provenance: EXTRACTED
---

# Secuencia · Carrera: carga inicial de la pantalla

**Pantalla o ruta:** `/` · **Foco:** `AutosMap` (borde dark red 700) · **procedencia:** `EXTRACTED` del código de `features/`.

```mermaid
%%{init: {'themeCSS': 'rect.actor{stroke:#616161;stroke-width:2px;} rect.actor[name="R"]{stroke:#B71C1C !important;stroke-width:4px !important;}'}}%%
sequenceDiagram
  participant U as Usuario en el navegador
  participant N as Servidor Next.js
  participant R as AutosMap · foco
  participant E as useEstilosMapa
  participant OF as OpenFreeMap
  participant S as useAutosSocket
  participant A as autos/api
  participant API as telemetry-api
  U->>N: GET /
  N-->>U: HTML del layout con AutosDashboard
  Note over U,R: AutosDashboard carga AutosMap solo en el cliente con dynamic y ssr false
  U->>R: monta AutosMap
  R->>E: useEstilosMapa()
  E->>OF: GET styles/positron
  alt estilo disponible
    OF-->>E: estilo base
    E-->>R: estilos claro y oscuro recoloreados
  else falla
    E-->>R: undefined y mapcn usa su estilo de Carto
  end
  R->>S: useAutosSocket(NEXT_PUBLIC_WS_URL)
  S->>API: abre WS /ws/autos
  API-->>S: conexión abierta
  S-->>R: estado abierta
  R->>A: obtenerAutos()
  A->>API: GET /autos
  API-->>A: lista de Auto
  A-->>R: fusionar en el Map de autos y animar
  R->>A: listarRutas() y obtenerSimulacion() en paralelo
  A->>API: GET /rutas y GET /simulacion
  API-->>A: rutas y EstadoSimulacion
  A-->>R: rutas, simulación y ruta seleccionada
  R->>A: obtenerRuta(rutaSeleccionada)
  A->>API: GET /rutas/id
  API-->>A: GeoJSON de la ruta
  A-->>R: geometría, dibujo y encuadre del mapa
  loop cada 5 s en reposo o cada 1 s en curso
    R->>A: obtenerSimulacion()
    A->>API: GET /simulacion
    API-->>R: EstadoSimulacion
  end
  alt falla GET /autos
    R-->>U: error No se pudo cargar la flota
  else fallan rutas o simulación
    R-->>U: error No se pudieron cargar las rutas
  else falla GET /rutas/id
    R-->>U: error No se pudo cargar la ruta
  end
```

## Capas que atraviesa

| Capa | Elemento | Código |
|---|---|---|
| app (ruta) | app/page.tsx compone AutosDashboard | [`page.tsx`](../../../app/page.tsx) |
| features/autos (componente) | AutosDashboard → AutosMap (`dynamic`, `ssr: false`) | [`autos-dashboard.tsx`](../../../features/autos/components/autos-dashboard.tsx) |
| features/autos (orquestador) | AutosMap: estado en `useRef`, cargas y sondeo | [`autos-map.tsx`](../../../features/autos/components/autos-map.tsx) |
| features/autos (hooks) | useAutosSocket, useEstilosMapa | [`use-autos-socket.ts`](../../../features/autos/hooks/use-autos-socket.ts) |
| features/autos (cliente HTTP) | obtenerAutos, listarRutas, obtenerSimulacion, obtenerRuta | [`api.ts`](../../../features/autos/api.ts) |
| lib | cliente `axios` con `baseURL` y timeout de 15 s | [`http.ts`](../../../lib/http.ts) |

## Llamadas a telemetry-api

| Método | Path | Función del cliente |
|---|---|---|
| GET | `/autos` | `obtenerAutos` |
| GET | `/rutas` | `listarRutas` |
| GET | `/simulacion` | `obtenerSimulacion` (carga y sondeo) |
| GET | `/rutas/{id}` | `obtenerRuta` |
| WS | `/ws/autos` | `useAutosSocket` |

## Errores y estados relevantes

| Situación | Qué ve el usuario |
|---|---|
| `GET /autos` falla | notificación `No se pudo cargar la flota: …` |
| `GET /rutas` o `/simulacion` falla | `No se pudieron cargar las rutas: …` |
| `GET /rutas/{id}` falla | `No se pudo cargar la ruta: …` |
| el sondeo de `/simulacion` falla | se ignora y se reintenta en el siguiente ciclo |
| el estilo de OpenFreeMap falla | `useEstilosMapa` devuelve `undefined` y el mapa usa Carto |

## Pruebas que lo cubren

- [`estilo-mapa.test.ts`](../../../features/autos/estilo-mapa.test.ts)
- [`ruta-progreso.test.ts`](../../../features/autos/ruta-progreso.test.ts)
- [`geojson.test.ts`](../../../features/autos/geojson.test.ts)

## Notas

- No hay BFF: el navegador llama a `telemetry-api` directamente con `axios` (`NEXT_PUBLIC_API_URL`) y al WebSocket con `WebSocket` nativo (`NEXT_PUBLIC_WS_URL`); no se envía ningún `correlation ID`.
- Sin autenticación ni sesión.

## Traceability

- Índice: [sequence-e2e.md](../sequence-e2e.md) · Diagrama: [`carrera-carga-inicial.mmd`](../diagrams/sequences/carrera-carga-inicial.mmd)
