# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Demo de telemetría en tiempo real: **carreras** de 3 autos en rutas reales (Av. Brasil, Panamericana Sur y Norte, Vía Los Libertadores), con velocidad ajustable por auto, clasificación en vivo y filtro por empresa y flota. La última posición y el historial de viajes se guardan en PostgreSQL. La fuente de verdad son `docs/specs/telemetria.md` y `docs/specs/persistencia-posiciones-viajes.md` (esta reemplaza el almacenamiento en memoria de la primera). Documenta en español, igual que la spec.

## Arquitectura

```
Next.js ── POST /simulacion/iniciar {ruta} ──► Quarkus 3.40 LTS · Java 17 (una sola JVM)
                                         │  simulacion/: carrera de 3 autos, salida→meta (timer Vert.x 1 s)
                                         │     └─► Kafka "telemetria" (12 part., key=carId)
                                         │  flink/: Flink 2.2.1 embebido (MiniCluster, UI :8081)
                                         │     KafkaSource → keyBy(carId) → KeyedProcessFunction(ValueState<ts>)
                                         │     └─► Kafka "ultima-posicion" (compact)
                                         │  autos/: consumidor por lotes → AutosStore (tb_ultima_posicion) → GET /autos
                                         │          AutosCambios (solo confirmados) → timer Vert.x 500 ms → WS /ws/autos
                                         │  viajes/: consumidor por lotes de "telemetria" → ViajesStore (tb_viaje,
                                         │          tb_posicion_historial) → GET /viajes[/{id}[/posiciones]]
                                         └─► PostgreSQL 17 (JDBC/Agroal + Flyway, sin ORM)
Next.js 16 + shadcn/ui + mapcn (MapLibre) ◄── axios (autos, ruta, simulación) + WebSocket nativo
```

Decisiones que no son obvias si no se lee toda la spec:
- **Las features del backend se comunican solo por los topics**, aunque compartan JVM:
  - `simulacion` publica en `telemetria`;
  - `flink` lee de `telemetria` y publica en `ultima-posicion`;
  - `autos` consume `ultima-posicion`;
  - `viajes` consume `telemetria` directamente: así guarda también las muestras atrasadas que Flink descarta.

  Cada una tiene su propio record del evento (`TelemetriaEvento`, `Posicion`, `AutoEvento`, `EventoViaje`) y su copia de la validación (`EventoJson`), y es dueña de sus tablas. No las acoples con llamadas en memoria ni con un DTO compartido.
- **Contrato v2 del evento:** a los 9 campos originales le agrega `schemaVersion`, `eventId`, `carreraId`, `viajeId`, `rutaId`, `inicioViajeTs`, `tipoEvento` (`INICIO`/`POSICION`/`FIN`) y `motivoFin`. Los eventos legados (sin versión) siguen valiendo para la última posición, pero no crean viajes. El JSON público de `GET /autos` y del WebSocket conserva los 9 campos.
- **Flink corre dentro de Quarkus:**
  - `FlinkJobRunner` lo lanza con `env.executeAsync()` en el `StartupEvent`;
  - declara `pipeline.classpaths` con la ubicación de las clases de la app y `parent-first`. Sin eso, el MiniCluster usa el classloader del sistema y falla con `ClassNotFoundException`. No lo quites (spec §8);
  - los operadores se serializan: nada de CDI ni del `ObjectMapper` de Quarkus dentro de ellos.
- **Versiones fijadas por compatibilidad:**
  - Java 17 (recomendada por Flink 2.x);
  - Flink 2.2.1 con `flink-connector-kafka:5.0.0-2.2`;
  - Kafka **4.2.1**: la 4.0.x tiene KAFKA-19888 y el coordinador de grupos deja de funcionar en Docker Desktop.
- **Consumidores JDBC (`AutosConsumer`, `ViajesConsumer`):** son por lotes, `@Blocking` (JDBC no puede ir en el event loop) y `POST_PROCESSING`, con `enable.auto.commit=false`, `commit-strategy=throttled` y `failure-strategy=fail`. Usan los grupos `quarkus-dash-postgres` y `quarkus-viajes-postgres`.
  - El commit JDBC ocurre dentro de `guardarLote`, antes de confirmar el offset. Solo después pasan los cambios al búfer del WebSocket.
  - Un fallo detiene el canal y pone la readiness en DOWN. No lo conviertas en éxito ni en `ignore`: se recupera reiniciando la API, y `eventId` hace idempotente la reentrega.
- **Operación:** `/q/health/ready` (BD y canales) y `/q/metrics` (Prometheus). El runbook está en `docs/test-cases/persistencia-posiciones-viajes.md`.
- **Temporizadores de Vert.x, no `@Scheduled`:** el planificador de Quarkus solo evalúa una vez por segundo.
- **Rutas y escenario son recursos del backend:**
  - `resources/rutas/indice.json` y un GeoJSON por ruta, con una `LineString` de salida a meta sacada de OpenStreetMap/OSRM;
  - `resources/escenarios/carrera.json`.

  El dashboard los pide a `GET /rutas` y `GET /rutas/{id}`. La velocidad por auto (10–500 km/h) se cambia con `PUT /simulacion/autos/{carId}/velocidad`.
- **Flink se reinicia solo:** estrategia `exponential-delay` y heartbeat de 3 min en `FlinkJobRunner`. Sin checkpoints, el job no tiene reinicio por defecto y una pausa larga de la JVM lo dejaba caído.
- **Frontend:**
  - interfaz basada en Carbon: tokens G10/G100 en `globals.css` (con los de la ruta y los autos) e IBM Plex; MapLibre lee esos colores con `leerToken` al crear cada capa;
  - una fuente GeoJSON con una capa `symbol` de círculos por color de auto (`vehiculo.ts`, `paleta.ts`), filtrada con `setFilter` según empresa/flota; la ruta se divide en tramo recorrido/pendiente (`ruta-progreso.ts`);
  - funciones puras con tests de Vitest (`features/**/*.test.ts`);
  - estado fuera de React (`useRef`);
  - movimiento interpolado entre eventos (`animacion.ts`);
  - tema claro/oscuro con next-themes (clase `dark` en `<html>`); mapcn observa esa clase para cambiar el mapa base. Usa tokens de shadcn (`bg-popover`, `text-foreground`…) en vez de colores fijos;
  - el mapa es `"use client"` cargado con `dynamic(..., { ssr: false })`.
- **Docker Compose:** requiere `.env` (copia de `.env.example`) con las credenciales de PostgreSQL. Los contenedores llegan a Kafka por `kafka:29092` (listener `INTERNO`) y el host por `localhost:9092` (`EXTERNO`). La API se configura por variables de entorno; las `NEXT_PUBLIC_*` del dashboard son build args (se incrustan al construir, las usa el navegador del host). Tras cambiar código: `docker compose up -d --build <servicio>`.
- **Si cambia el contrato del evento,** hazlo compatible hacia atrás (como v2). **No recrees topics ni borres volúmenes** (`down -v`): eso destruye historial y offsets. Las tablas cambian con una migración Flyway nueva; nunca se edita una migración ya aplicada.

## Comandos

```bash
docker compose up -d --build                             # todo en Docker: PostgreSQL, Kafka, topics, API y dashboard :3000
docker compose up -d postgres kafka && ./scripts/crear-topics.sh  # solo infraestructura, para desarrollo local
cd telemetry-api && ./mvnw test                          # JDK 17; PostgreSQL de Dev Services (necesita Docker)
cd telemetry-api && ./mvnw quarkus:dev                   # :8080 + Flink UI :8081
cd telemetry-api && ./mvnw test -Dtest=RutaTest          # un solo test
cd dashboard-next && npm test && npm run lint && npm run build && npm run dev   # :3000 (Vitest para funciones puras)
curl -H 'Content-Type: application/json' -d '{"ruta":"av-brasil"}' localhost:8080/simulacion/iniciar   # o el dashboard
powershell -NoProfile -File scripts/probar-persistencia.ps1   # E2E con Kafka y PostgreSQL reales y desechables
```

## Base de conocimiento (`knowledge/`)

`knowledge/` es una plantilla corporativa genérica. El stack de este proyecto está fijado en `ADR-003`, y la persistencia en `ADR-004` (PostgreSQL con JDBC y Flyway). Algunas reglas aplican aquí y otras no:
- **Aplican:**
  - `STD-ARCH-001`: organización **por features**, en backend (`simulacion/`, `flink/`, `autos/`, `viajes/`, `shared/`) y en frontend (`features/<x>/` con `index.ts` público). Los DTOs son `record` escritos a mano. El contrato JSON está en la spec §4.
  - `STD-GIT-001`: Conventional Commits; ramas `feature/<ticket>-<slug>` desde `develop`; sin PR/MR. **Todo cambio se versiona:** se trabaja en una rama de feature, nunca directo en `main` ni en `develop`, y cada tarea termina con su commit.
  - `STD-ERR-001`: contrato de error JSON con `requestId` y sin stack traces (`@ServerExceptionMapper`). Los errores de BD no exponen SQL ni credenciales.
  - `ADR-002`: tablas con prefijo `tb_` y en `snake_case`. Su regla de `@Table(name)` no aplica, porque no hay ORM.
  - `ADR-001`: `graphify`. El grafo está en `graphify-out/` (no se versiona); actualízalo con `graphify update .`.
