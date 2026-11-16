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
  - ../../features/autos/components/autos-map.tsx
  - ../../features/autos/animacion.ts
  - ../../features/autos/hooks/use-autos-socket.ts
c4_level: Code
focus_id: autos-map
focus_name: AutosMap
focus_kind: code
focus_highlight: dark-red-700-border
component_path: dashboard-next
---

# Código (C4 nivel 4)

**Foco:** el componente `AutosMap` (borde dark red 700), que orquesta la pantalla Carrera.

## Diagrama

```mermaid
flowchart TB
  page["app/page.tsx<br/>Home"]
  dash["AutosDashboard<br/>dynamic ssr false"]
  mapa["AutosMap<br/>carga inicial · sondeo · seguir al líder<br/>ejecutar · iniciar · detener · velocidad<br/>fusionar · animar · resumir"]
  sock["useAutosSocket<br/>WebSocket con backoff 1 a 10 s"]
  est["useEstilosMapa<br/>estilo positron recoloreado"]
  api["autos/api<br/>obtenerAutos · listarRutas · obtenerRuta<br/>obtenerSimulacion · iniciarCarrera<br/>detenerCarrera · cambiarVelocidad"]
  anim["Animador<br/>interpola posición y rumbo"]
  met["Metricas<br/>lotes por segundo · edad · latencia p95"]
  fil["filtros<br/>empresa y flota · expresionFiltro"]
  capa["AutosLayer<br/>fuente GeoJSON y capa symbol"]
  ruta["RutaLayer · SalidaMeta · ControlesMapa · Leyenda"]
  panel["PanelVivo<br/>refresca cada 1 s"]
  carrera["CarreraPanel y FilaCorredor<br/>control, clasificación y slider"]
  barra["BarraMapa<br/>filtro y métricas"]
  http["lib/http<br/>axios"]
  page --> dash
  dash -->|"carga solo en el cliente"| mapa
  mapa --> sock
  mapa --> est
  mapa --> api
  mapa -->|"estado fuera de React con useRef"| anim
  mapa --> met
  mapa --> fil
  mapa -->|"pintar por frame"| capa
  mapa --> ruta
  mapa --> panel
  panel --> carrera
  panel --> barra
  api --> http
  classDef other fill:#ECEFF1,stroke:#616161,stroke-width:2px,color:#000
  classDef focus fill:#FFEBEE,stroke:#B71C1C,stroke-width:4px,color:#000
  class page,dash,sock,est,api,anim,met,fil,capa,ruta,panel,carrera,barra,http other
  class mapa focus
```

Fuente: [`diagrams/code.mmd`](diagrams/code.mmd).

## Elementos del foco

| Elemento | Qué hace | Archivo |
|---|---|---|
| `AutosMap` | Orquesta la pantalla: carga inicial, sondeo de la simulación (1 s en curso, 5 s en reposo), seguir al líder, acciones de la carrera y composición del mapa | [`autos-map.tsx`](../../features/autos/components/autos-map.tsx) |
| `PanelVivo` | Refresca métricas, opciones del filtro y cronómetro una vez por segundo sin rerenderizar el mapa | [`autos-map.tsx`](../../features/autos/components/autos-map.tsx) |
| `AutosDashboard` | Carga `AutosMap` solo en el cliente (`dynamic`, `ssr: false`) | [`autos-dashboard.tsx`](../../features/autos/components/autos-dashboard.tsx) |
| `useAutosSocket` | `WebSocket` a `/ws/autos`; entrega cada lote por callback y reconecta con backoff | [`use-autos-socket.ts`](../../features/autos/hooks/use-autos-socket.ts) |
| `useEstilosMapa` | Descarga el estilo `positron` y lo recolorea con la paleta clara y oscura; cachea la promesa | [`use-estilos-mapa.ts`](../../features/autos/hooks/use-estilos-mapa.ts) |
| `Animador` | Interpola posición y rumbo entre dos eventos; no anima saltos de más de 2 km ni intervalos de más de 3 s | [`animacion.ts`](../../features/autos/animacion.ts) |
| `Metricas` | Lotes por segundo, edad del último dato y latencia p95 del último lote | [`metricas.ts`](../../features/autos/metricas.ts) |
| `AutosLayer` | Una fuente GeoJSON con una capa `symbol` por color de auto, filtrada con `setFilter` | [`autos-layer.tsx`](../../features/autos/components/autos-layer.tsx) |
| `RutaLayer` | Dibuja la ruta dividida en tramo recorrido por el líder y tramo pendiente | [`ruta-layer.tsx`](../../features/autos/components/ruta-layer.tsx) |
| `CarreraPanel · FilaCorredor` | Estado, ruta, botones, clasificación y slider de velocidad (10 a 500 km/h) | [`carrera-panel.tsx`](../../features/autos/components/carrera-panel.tsx) |
| `autos/api` | Siete funciones sobre `axios`: autos, rutas, ruta, simulación, iniciar, detener y velocidad | [`api.ts`](../../features/autos/api.ts) |
| `filtros` | Empresa y flota derivadas de los datos; la misma condición como función y como expresión de MapLibre | [`filtros.ts`](../../features/autos/filtros.ts) |

## Las demás pantallas

| Pantalla | Elementos clave | Archivos |
|---|---|---|
| Viajes | `ViajesPantalla`, `useCarreras` (`useReducer` con cancelación y secuencia de solicitudes), `agruparPorCarrera`, `TarjetaCarrera` | [`viajes-pantalla.tsx`](../../features/viajes/components/viajes-pantalla.tsx), [`use-carreras.ts`](../../features/viajes/hooks/use-carreras.ts) |
| Repetición | `RepeticionPantalla`, `useRepeticion`, `prepararRecorrido`, `estadoEn`, `Reproductor`, `GraficoVelocidad`, `RecorridoLayer` | [`repeticion-pantalla.tsx`](../../features/viajes/components/repeticion-pantalla.tsx), [`repeticion.ts`](../../features/viajes/repeticion.ts) |
| Operación | `OperacionPantalla`, `obtenerSalud` (acepta 503), `parsearPrometheus`, `tasaPorSegundo` | [`operacion-pantalla.tsx`](../../features/operacion/components/operacion-pantalla.tsx), [`prometheus.ts`](../../features/operacion/prometheus.ts) |
| Shell | `Encabezado` (Carbon UI Shell en G100), `SelectorTema` (claro, oscuro, sistema), `FlagsCarbon` | [`encabezado.tsx`](../../components/encabezado.tsx) |

## Notas de diseño verificables en el código

- El estado de los autos vive en `useRef` (`Map` por `carId`), no en estado de React: cada lote del WebSocket actualiza el `Animador` y pide un frame; el repintado ocurre por `requestAnimationFrame` mientras algún auto está en camino.
- `fusionar` solo acepta un evento si su `ts` supera al guardado, tanto para el WebSocket como para la carga inicial.
- Los tipos del contrato (`Auto`, `EstadoSimulacion`, `ViajeVista`…) son copias propias de cada feature, no un paquete compartido.
- Los tokens de color (`--cds-*`, `--auto-N`) los lee MapLibre con `leerToken` al crear cada capa, y un cambio de tema recrea las capas.

## Traceability

- Anterior: [component.md](component.md) · Secuencias: [sequence-e2e.md](sequence-e2e.md)
