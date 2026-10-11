---
okf_version: 0.2
generated: 2026-10-10
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../telemetry-api/src/main/java/dev/bryan/simulacion/
  - ../../telemetry-api/src/main/java/dev/bryan/flink/
  - ../../telemetry-api/src/main/java/dev/bryan/autos/
  - ../../telemetry-api/src/main/java/dev/bryan/shared/error/
  - ../../dashboard-next/features/autos/
  - ../../knowledge/standards/STD-ARCH-001-arquitectura-por-features.md
  - ../specs/telemetria.md
c4_level: Component
focus_id: telemetry-api.simulacion
focus_name: Feature simulacion
focus_kind: component
focus_highlight: dark-red-700-border
component_path: .
---

# Componentes (C4 nivel 3)

**Contenedor:** `telemetry-api` · **Foco:** la feature `simulacion` (borde dark red 700).

**Arquitectura descubierta:** *por features* (`STD-ARCH-001`, modular). No hay capas Hexagonal ni Clean: cada feature agrupa su entrada (Resource, WebSocket o `@Incoming`), su lógica y su salida (Kafka). Las features solo se comunican por los topics, aunque compartan JVM.

| Capa del perfil C4 | Equivalente real en este código |
|---|---|
| REST API / Controller | `*Resource` (JAX-RS), `AutosWs` (websockets-next), `AutosConsumer` (`@Incoming`) |
| Application / Use case | `Simulador`, `AutosBroadcaster`, `FlinkJobRunner` |
| Domain | `AutoCorredor`, `Ruta`, `Escenario`, `UltimaPosicionFunction`, `AutosStore` |
| Port / Adapter | No hay interfaces de puerto. Los adaptadores son el `Emitter` de SmallRye, `KafkaSource`/`KafkaSink` de Flink y los recursos del classpath (`CatalogoRutas`). |

## Vista general por features

```mermaid
flowchart TB
  web["dashboard en el navegador"]
  sim["simulacion<br/>SimulacionResource · RutasResource<br/>Simulador · CatalogoRutas"]
  rec["recursos del classpath<br/>rutas/*.geojson · escenarios/carrera.json"]
  tel["topic telemetria"]
  flink["flink<br/>FlinkJobRunner · UltimaPosicionJob<br/>MiniCluster"]
  up["topic ultima-posicion"]
  autos["autos<br/>AutosResource · AutosWs · AutosBroadcaster<br/>AutosConsumer · AutosStore"]
  err["shared/error<br/>GlobalExceptionMapper"]
  web -->|"REST /simulacion y /rutas"| sim
  web -->|"REST /autos y WS /ws/autos"| autos
  sim -->|"lee"| rec
  sim -->|"publica key carId"| tel
  tel -->|"KafkaSource"| flink
  flink -->|"KafkaSink key carId"| up
  up -->|"Incoming por lotes"| autos
  sim -.->|"ComsatelException"| err
  autos -.->|"ComsatelException"| err
  classDef other fill:#ECEFF1,stroke:#616161,stroke-width:2px,color:#000
  classDef focus fill:#FFEBEE,stroke:#B71C1C,stroke-width:4px,color:#000
  class web,rec,tel,flink,up,autos,err other
  class sim focus
```

| Componente | Responsabilidad | Entradas | Salidas |
|---|---|---|---|
| **simulacion** (foco) | Carrera de 3 autos de la salida a la meta, velocidad por auto, clasificación. | `GET/POST/PUT /simulacion…`, `GET /rutas…`, temporizador Vert.x | Topic `telemetria` |
| flink | Job `telemetria` → última posición por auto → `ultima-posicion`, dentro de un MiniCluster embebido. | Topic `telemetria` | Topic `ultima-posicion` |
| autos | Estado en memoria de la última posición; `GET /autos` y lotes por WebSocket cada 500 ms. | Topic `ultima-posicion`, `GET /autos`, `WS /ws/autos` | JSON REST y WebSocket |
| shared/error | Convierte excepciones en `ErrorResponse` con `requestId`, sin stack traces (`STD-ERR-001`). | `ComsatelException`, `WebApplicationException`, `Throwable` | JSON de error |

## Detalle: simulacion

**Foco:** `Simulador`.

```mermaid
flowchart TB
  web["dashboard"]
  sres["SimulacionResource<br/>/simulacion"]
  rres["RutasResource<br/>/rutas"]
  sim["Simulador<br/>estado de la carrera"]
  cat["CatalogoRutas<br/>índice, GeoJSON y escenario"]
  corr["AutoCorredor x3<br/>avance y llegada"]
  ruta["Ruta<br/>polilínea y distancias"]
  timer["Vert.x setPeriodic<br/>simulacion.intervalo-ms"]
  emit["Emitter telemetria-out<br/>topic telemetria"]
  web --> sres
  web --> rres
  sres --> sim
  rres --> cat
  sim --> cat
  sim --> corr
  corr --> ruta
  timer -->|"avanzar"| sim
  sim -->|"TelemetriaEvento JSON"| emit
  classDef other fill:#ECEFF1,stroke:#616161,stroke-width:2px,color:#000
  classDef focus fill:#FFEBEE,stroke:#B71C1C,stroke-width:4px,color:#000
  class web,sres,rres,cat,corr,ruta,timer,emit other
  class sim focus
```

## Detalle: flink

**Foco:** `UltimaPosicionFunction`.

```mermaid
flowchart TB
  start["StartupEvent de Quarkus"]
  runner["FlinkJobRunner<br/>MiniCluster con UI :8081"]
  job["UltimaPosicionJob<br/>definición del pipeline"]
  src["KafkaSource<br/>telemetria · grupo flink-ultima-pos"]
  des["PosicionJson.Deserializador"]
  fn["UltimaPosicionFunction<br/>keyBy carId · ValueState ts"]
  ser["PosicionJson.Serializador<br/>y SerializadorClave"]
  sink["KafkaSink<br/>ultima-posicion · at-least-once"]
  start --> runner
  runner -->|"construir y executeAsync"| job
  job --> src
  src --> des
  des -->|"Posicion"| fn
  fn -->|"solo si ts es más nuevo"| ser
  ser --> sink
  classDef other fill:#ECEFF1,stroke:#616161,stroke-width:2px,color:#000
  classDef focus fill:#FFEBEE,stroke:#B71C1C,stroke-width:4px,color:#000
  class start,runner,job,src,des,ser,sink other
  class fn focus
```

## Detalle: autos

**Foco:** `AutosStore`.

```mermaid
flowchart TB
  topic["topic ultima-posicion"]
  listener["ReconstruirEstadoListener<br/>seekToBeginning"]
  cons["AutosConsumer<br/>Incoming batch · NonBlocking"]
  store["AutosStore<br/>ConcurrentHashMap y set de sucios"]
  res["AutosResource<br/>GET /autos"]
  bbox["Bbox<br/>parse y contiene"]
  bc["AutosBroadcaster<br/>Vert.x cada 500 ms"]
  ws["AutosWs<br/>/ws/autos"]
  web["dashboard"]
  topic --> cons
  listener -.->|"al asignar particiones"| cons
  cons -->|"actualizar si ts mayor"| store
  res --> store
  res --> bbox
  bc -->|"drenarSucios"| store
  bc -->|"sendText a OpenConnections"| ws
  ws -->|"lote JSON"| web
  web -->|"GET /autos"| res
  classDef other fill:#ECEFF1,stroke:#616161,stroke-width:2px,color:#000
  classDef focus fill:#FFEBEE,stroke:#B71C1C,stroke-width:4px,color:#000
  class topic,listener,cons,res,bbox,bc,ws,web other
  class store focus
```

## Detalle: dashboard (contenedor `dashboard`)

**Foco:** `autos-map.tsx`. La feature `features/autos` expone solo `AutosDashboard` y el tipo `Auto` por `index.ts`.

```mermaid
flowchart TB
  page["app/page.tsx<br/>AutosDashboard con ssr false"]
  mapa["autos-map.tsx<br/>estado fuera de React"]
  panel["carrera-panel.tsx<br/>ruta, carrera, sliders y filtros"]
  capas["autos-layer · ruta-layer · salida-meta<br/>capas MapLibre"]
  api["api.ts y lib/http.ts<br/>axios"]
  socket["use-autos-socket.ts<br/>WebSocket con reconexión"]
  anim["animacion.ts y metricas.ts"]
  filtros["filtros.ts y geojson.ts"]
  backend["telemetry-api"]
  page --> mapa
  mapa --> panel
  mapa --> capas
  mapa --> api
  mapa --> socket
  mapa --> anim
  mapa --> filtros
  api -->|"REST"| backend
  socket -->|"WS /ws/autos"| backend
  classDef other fill:#ECEFF1,stroke:#616161,stroke-width:2px,color:#000
  classDef focus fill:#FFEBEE,stroke:#B71C1C,stroke-width:4px,color:#000
  class page,panel,capas,api,socket,anim,filtros,backend other
  class mapa focus
```

| Componente | Responsabilidad | Evidencia |
|---|---|---|
| **autos-map.tsx** (foco) | Orquesta la carga inicial (autos, rutas y estado), el sondeo de la carrera (1 s en curso, 5 s en reposo), "Seguir al líder" y las acciones del panel. Guarda los autos en un `useRef` y repinta con `requestAnimationFrame`. | `EXTRACTED` |
| carrera-panel.tsx | Selector de ruta, botones de carrera, clasificación con sliders (10–500 km/h), filtro empresa → flota, métricas y selector de tema. | `EXTRACTED` |
| autos-layer, ruta-layer, salida-meta | Fuente GeoJSON con capa `symbol` de íconos filtrada con `setFilter`; línea de la ruta; marcadores de Salida y Meta. | `EXTRACTED` |
| api.ts, lib/http.ts | Llamadas REST con axios (`baseURL` = `NEXT_PUBLIC_API_URL`, timeout 15 s). | `EXTRACTED` |
| use-autos-socket.ts | WebSocket nativo con reconexión exponencial y estado de conexión. | `EXTRACTED` |
| animacion.ts, metricas.ts | Interpolación del movimiento entre eventos; edad del último dato y latencia p95. | `EXTRACTED` |
| filtros.ts, geojson.ts | Opciones y expresión de filtro de MapLibre; conversión de autos a `FeatureCollection`. | `EXTRACTED` |

## Traceability

- sources: código de `telemetry-api/src/main/java/dev/bryan/**` y `dashboard-next/features/autos/**`; `STD-ARCH-001`; spec §7–§10
- related_artifacts: [container.md](container.md), [code.md](code.md)
- assumptions: la equivalencia de capas de la tabla es una lectura del código (`INFERRED`), no una decisión documentada
