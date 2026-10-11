# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Demo de telemetría en tiempo real: **carreras** de 3 autos en rutas reales (Av. Brasil, Panamericana Sur y Norte, Vía Los Libertadores), con velocidad ajustable por auto, clasificación en vivo y filtro por empresa y flota. La fuente de verdad es `docs/specs/telemetria.md`. Documenta en español, igual que la spec.

## Arquitectura

```
Next.js ── POST /simulacion/iniciar {ruta} ──► Quarkus 3.40 LTS · Java 17 (una sola JVM)
                                         │  simulacion/: carrera de 3 autos, salida→meta (timer Vert.x 1 s)
                                         │     └─► Kafka "telemetria" (12 part., key=carId)
                                         │  flink/: Flink 2.2.1 embebido (MiniCluster, UI :8081)
                                         │     KafkaSource → keyBy(carId) → KeyedProcessFunction(ValueState<ts>)
                                         │     └─► Kafka "ultima-posicion" (compact)
                                         │  autos/: consumidor por lotes → AutosStore → GET /autos
                                         │          timer Vert.x 500 ms → WS /ws/autos (lotes)
Next.js 16 + shadcn/ui + mapcn (MapLibre) ◄── axios (autos, ruta, simulación) + WebSocket nativo
```

Decisiones que no son obvias si no se lee toda la spec:
- **Las features del backend se comunican solo por los topics**, aunque compartan JVM:
  - `simulacion` publica en `telemetria`;
  - `flink` lee de `telemetria` y publica en `ultima-posicion`;
  - `autos` consume `ultima-posicion`.

  Cada una tiene su propio record del evento. No las acoples con llamadas en memoria. `ultima-posicion` compactado permite reconstruir el estado al reiniciar.
- **Flink corre dentro de Quarkus:**
  - `FlinkJobRunner` lo lanza con `env.executeAsync()` en el `StartupEvent`;
  - declara `pipeline.classpaths` con la ubicación de las clases de la app y `parent-first`. Sin eso, el MiniCluster usa el classloader del sistema y falla con `ClassNotFoundException`. No lo quites (spec §8);
  - los operadores se serializan: nada de CDI ni del `ObjectMapper` de Quarkus dentro de ellos.
- **Versiones fijadas por compatibilidad:**
  - Java 17 (recomendada por Flink 2.x);
  - Flink 2.2.1 con `flink-connector-kafka:5.0.0-2.2`;
  - Kafka **4.2.1**: la 4.0.x tiene KAFKA-19888 y el coordinador de grupos deja de funcionar en Docker Desktop.
- **`AutosConsumer` es por lotes y `@NonBlocking`.** Un `void recibir(Auto)` se ejecuta como bloqueante, con un salto de hilo por mensaje.
- **Temporizadores de Vert.x, no `@Scheduled`:** el planificador de Quarkus solo evalúa una vez por segundo.
- **Rutas y escenario son recursos del backend:**
  - `resources/rutas/indice.json` y un GeoJSON por ruta, con una `LineString` de salida a meta sacada de OpenStreetMap/OSRM;
  - `resources/escenarios/carrera.json`.

  El dashboard los pide a `GET /rutas` y `GET /rutas/{id}`. La velocidad por auto (10–500 km/h) se cambia con `PUT /simulacion/autos/{carId}/velocidad`.
- **Flink se reinicia solo:** estrategia `exponential-delay` y heartbeat de 3 min en `FlinkJobRunner`. Sin checkpoints, el job no tiene reinicio por defecto y una pausa larga de la JVM lo dejaba caído.
- **Frontend:**
  - una fuente GeoJSON con una capa `symbol` de íconos (`vehiculo.ts`), filtrada con `setFilter` según empresa/flota;
  - estado fuera de React (`useRef`);
  - movimiento interpolado entre eventos (`animacion.ts`);
  - tema claro/oscuro con next-themes (clase `dark` en `<html>`); mapcn observa esa clase para cambiar el mapa base. Usa tokens de shadcn (`bg-popover`, `text-foreground`…) en vez de colores fijos;
  - el mapa es `"use client"` cargado con `dynamic(..., { ssr: false })`.
- **Docker Compose:** los contenedores llegan a Kafka por `kafka:29092` (listener `INTERNO`) y el host por `localhost:9092` (`EXTERNO`). La API se configura por variables de entorno; las `NEXT_PUBLIC_*` del dashboard son build args (se incrustan al construir, las usa el navegador del host). Tras cambiar código: `docker compose up -d --build <servicio>`.
- **Si cambia el contrato del evento,** recrear los topics (`./scripts/crear-topics.sh --recrear`).

## Comandos

```bash
docker compose up -d --build                             # todo en Docker: Kafka, topics, API y dashboard :3000
docker compose up -d kafka && ./scripts/crear-topics.sh  # solo Kafka, para desarrollo local
cd telemetry-api && ./mvnw test                          # JDK 17
cd telemetry-api && ./mvnw quarkus:dev                   # :8080 + Flink UI :8081
cd telemetry-api && ./mvnw test -Dtest=RutaTest          # un solo test
cd dashboard-next && npm run lint && npm run build && npm run dev   # :3000
curl -H 'Content-Type: application/json' -d '{"ruta":"av-brasil"}' localhost:8080/simulacion/iniciar   # o el dashboard
```

## Base de conocimiento (`knowledge/`)

`knowledge/` es una plantilla corporativa genérica de COMSATEL. El stack de este proyecto está fijado en `ADR-003`. Algunas reglas aplican aquí y otras no:
- **Aplican:**
  - `STD-ARCH-001`: organización **por features**, en backend (`simulacion/`, `flink/`, `autos/`, `shared/`) y en frontend (`features/<x>/` con `index.ts` público). Los DTOs son `record` escritos a mano. El contrato JSON está en la spec §4.
  - `STD-GIT-001`: Conventional Commits; ramas `feature/<ticket>-<slug>` desde `develop`; sin PR/MR. **Todo cambio se versiona:** se trabaja en una rama de feature, nunca directo en `main` ni en `develop`, y cada tarea termina con su commit.
  - `STD-ERR-001`: contrato de error JSON con `requestId` y sin stack traces (`@ServerExceptionMapper`).
- **No aplica:** `ADR-002` (nomenclatura de tablas BD), porque el MVP no usa base de datos.
- `ADR-001` pide usar `graphify`, pero `graphify-out/` todavía no existe.
