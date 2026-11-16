# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Demo de telemetría en tiempo real: **carreras** de 3 autos en rutas reales (Av. Brasil, Panamericana Sur y Norte, Vía Los Libertadores), con velocidad ajustable por auto, clasificación en vivo y filtro por empresa y flota. La última posición y el historial de viajes se guardan en PostgreSQL. Ya no hay specs ni planes en el repo (`docs/` se eliminó): las decisiones están en `knowledge/adrs/` y el contrato real en el código y los tests. Documenta en español.

## Arquitectura

```
Next.js ── POST /simulacion/iniciar {ruta} ──► Quarkus 3.40 LTS · Java 17 (una sola JVM)
                                         │  simulacion: carrera de 3 autos, salida→meta (timer Vert.x 1 s)
                                         │     └─► Kafka "telemetria" (12 part., key=carId)
                                         │  flink: Flink 2.2.1 embebido (MiniCluster, UI :8081)
                                         │     KafkaSource → keyBy(carId) → KeyedProcessFunction(ValueState<ts>)
                                         │     └─► Kafka "ultima-posicion" (compact)
                                         │  autos: consumidor por lotes → AutosStore (tb_ultima_posicion) → GET /autos
                                         │          AutosCambios (solo confirmados) → timer Vert.x 500 ms → WS /ws/autos
                                         │  viajes: consumidor por lotes de "telemetria" → ViajesStore (tb_viaje,
                                         │          tb_posicion_historial) → GET /viajes[/{id}[/posiciones]]
                                         └─► PostgreSQL 17 (Hibernate ORM + Panache sobre Agroal, Flyway crea el esquema)
Next.js 16 + Carbon v12 + mapcn (MapLibre) ◄── axios (autos, ruta, simulación, viajes, operación) + WebSocket nativo
```

`simulacion`, `flink`, `autos` y `viajes` ya no son paquetes de primer nivel: son capacidades que se reparten entre las capas hexagonales (ver abajo).

Decisiones que no son obvias sin leer varios archivos:
- **Backend hexagonal (`ADR-006`):** `domain/` (records y reglas), `application/` (`port/in`, `port/out`, `service`) e `infrastructure/` (`in/{rest,ws,messaging}`, `out/{persistence,kafka,ws,classpath,metrics,vertx}`, `flink`, `config`). Las dependencias apuntan hacia adentro: `domain` y `application` no importan Quarkus, Vert.x, Flink, Kafka, Hibernate, JDBC ni Jackson, y `ArquitecturaHexagonalTest` (ArchUnit) lo hace cumplir. Los servicios de `application` no llevan anotaciones de CDI: los crea `infrastructure/config/ServiciosConfig` con `@Produces @Singleton`. Una clase nueva va en su capa; un acceso nuevo a I/O es un puerto de salida con su adaptador. Sin Lombok: DTOs como `record` y entities como clases escritas a mano.
- **Persistencia con Panache (`ADR-007`):** entities, repositories y adaptadores viven en `infrastructure/out/persistence/{autos,viajes}`; solo ahí se importa Hibernate o JPA. Flyway crea el esquema e Hibernate lo **valida** (`schema-management.strategy=validate`): si cambias una tabla, escribe una migración nueva y actualiza la entity, o la API no arranca. El upsert de última posición, los `INSERT … ON CONFLICT DO NOTHING` y el `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY` del detalle son SQL nativo a propósito; no los pases a HQL ni a `merge`. En la ingesta de viajes las entities se `flush`/`clear` antes de bloquear cada viaje, porque el SQL nativo no las actualiza. Los parámetros nativos que pueden ser `null` se pasan tipados con `NativoSql.parametro` (un `null` sin tipo viaja como bytea y PostgreSQL lo rechaza).
- **Las capacidades se comunican solo por los topics**, aunque compartan JVM:
  - `simulacion` publica en `telemetria`;
  - `flink` lee de `telemetria` y publica en `ultima-posicion`;
  - `autos` consume `ultima-posicion`;
  - `viajes` consume `telemetria` directamente: así guarda también las muestras atrasadas que Flink descarta.

  Cada una tiene su propio record del evento (`TelemetriaEvento`, `Posicion`, `AutoEvento`, `EventoViaje`) y su copia de la validación (`EventoJson`, en `in/messaging/{autos,viajes}` y en `flink`), y es dueña de sus tablas. No las acoples con llamadas en memoria ni con un DTO compartido; `ArquitecturaHexagonalTest` prohíbe que `autos`, `viajes` y `flink` se vean entre sí.
- **Contrato v2 del evento:** a los 9 campos originales le agrega `schemaVersion`, `eventId`, `carreraId`, `viajeId`, `rutaId`, `inicioViajeTs`, `tipoEvento` (`INICIO`/`POSICION`/`FIN`) y `motivoFin`. Los eventos legados (sin versión) siguen valiendo para la última posición, pero no crean viajes. El JSON público de `GET /autos` y del WebSocket conserva los 9 campos.
- **Flink corre dentro de Quarkus:**
  - `FlinkJobRunner` lo lanza con `env.executeAsync()` en el `StartupEvent`;
  - declara `pipeline.classpaths` con la ubicación de las clases de la app y `parent-first`. Sin eso, el MiniCluster usa el classloader del sistema y falla con `ClassNotFoundException`. No lo quites;
  - los operadores se serializan: nada de CDI ni del `ObjectMapper` de Quarkus dentro de ellos, y `infrastructure/flink` no depende de `domain` ni `application`;
  - se reinicia solo (`exponential-delay`, heartbeat de 3 min): sin checkpoints el job no tiene reinicio por defecto y una pausa larga de la JVM lo dejaba caído.
- **Versiones fijadas por compatibilidad:**
  - Java 17 (recomendada por Flink 2.x);
  - Flink 2.2.1 con `flink-connector-kafka:5.0.0-2.2`;
  - Kafka **4.2.1**: la 4.0.x tiene KAFKA-19888 y el coordinador de grupos deja de funcionar en Docker Desktop.
- **Consumidores con persistencia (`AutosConsumer`, `ViajesConsumer`):** son por lotes, `@Blocking` (Hibernate/JDBC no puede ir en el event loop) y `POST_PROCESSING`, con `enable.auto.commit=false`, `commit-strategy=throttled` y `failure-strategy=fail`. Usan los grupos `quarkus-dash-postgres` y `quarkus-viajes-postgres`.
  - El commit (`@Transactional` del adaptador) ocurre dentro de `guardarLote`, antes de confirmar el offset. Solo después pasan los cambios al búfer del WebSocket.
  - Un fallo detiene el canal y pone la readiness en DOWN. No lo conviertas en éxito ni en `ignore`: se recupera reiniciando la API, y `eventId` hace idempotente la reentrega.
  - Operación: `/q/health/ready` (BD y canales) y `/q/metrics` (Prometheus).
- **Temporizadores de Vert.x, no `@Scheduled`** (puerto `Temporizador`): el planificador de Quarkus solo evalúa una vez por segundo.
- **Rutas y escenario son recursos del backend:** `resources/rutas/indice.json` y un GeoJSON por ruta (`LineString` de salida a meta, de OpenStreetMap/OSRM), más `resources/escenarios/carrera.json`. El dashboard los pide a `GET /rutas` y `GET /rutas/{id}`. La velocidad por auto (10–500 km/h) se cambia con `PUT /simulacion/autos/{carId}/velocidad`.
- **Frontend** (`dashboard-next/`, Next.js 16 con cambios incompatibles: lee `node_modules/next/dist/docs/` antes de escribir código, ver su `AGENTS.md`):
  - `@carbon/react` con el flag `enable-v12-release` en Sass y React; temas White/G100 por `.dark`; tokens de `globals.css` sobre `--cds-*`, leídos por MapLibre con `leerToken`. Acción principal `kind="secondary"` gris, Tailwind sin preflight, IBM Plex con Fontsource;
  - `app/carbon.generated.css` se genera con `npm run carbon:css` (corre solo en `predev` y `prebuild`) y está en `.gitignore`; no lo edites ni lo versiones;
  - no edites `components/ui/map.tsx` (mapcn); es el único componente generado que se conserva;
  - una fuente GeoJSON con una capa `symbol` de círculos por color de auto (`vehiculo.ts`, `paleta.ts`), filtrada con `setFilter` según empresa/flota; la ruta se divide en tramo recorrido/pendiente (`ruta-progreso.ts`);
  - pantallas `/` (carrera), `/viajes`, `/viajes/[viajeId]` (repetición) y `/operacion`; cada feature (`autos`, `viajes`, `operacion`) tiene su propio cliente HTTP e importa otras features solo por su `index.ts`;
  - estado fuera de React (`useRef`); movimiento interpolado entre eventos (`animacion.ts`);
  - tema claro/oscuro con next-themes (clase `dark` en `<html>`); mapcn observa esa clase para cambiar el mapa base. Usa tokens de la app (`bg-card`, `text-foreground`…) o `var(--cds-*)`;
  - el mapa es `"use client"` cargado con `dynamic(..., { ssr: false })`; la lógica pura va en funciones con tests de Vitest (`features/**/*.test.ts`, `lib/**/*.test.ts`).
- **Docker Compose:** requiere `.env` (copia de `.env.example`) con las credenciales de PostgreSQL. Los contenedores llegan a Kafka por `kafka:29092` (listener `INTERNO`) y el host por `localhost:9092` (`EXTERNO`); el servicio `kafka-init` crea los topics. La API se configura por variables de entorno; las `NEXT_PUBLIC_*` del dashboard son build args (se incrustan al construir, las usa el navegador del host). El `Dockerfile` de la API copia el fast-jar por capas: tras cambiar código, `docker compose up -d --build <servicio>` solo reconstruye `app/`.
- **Trampa del rol de PostgreSQL:** el usuario y la contraseña se fijan solo la primera vez que arranca el volumen `postgres-datos`. Cambiar `POSTGRES_USER` o `POSTGRES_PASSWORD` en `.env` después no cambia el rol existente y la API cae en bucle con `password authentication failed`; alinea `.env` con el rol del volumen.
- **Si cambia el contrato del evento,** hazlo compatible hacia atrás (como v2). **No recrees topics ni borres volúmenes** (`down -v`): eso destruye historial y offsets. Las tablas cambian con una migración Flyway nueva; nunca se edita una migración ya aplicada.
- **`.gitignore`:** la regla de salida de IntelliJ está anclada (`/out/`, `/*/out/`). Una regla `out/` sin anclar ignora `application/port/out` e `infrastructure/out`, y los archivos faltan en un clon limpio aunque compilen en tu máquina. Tras mover o crear paquetes, comprueba con `git status` o con un clon limpio.

## Comandos

```bash
docker compose up -d --build                             # todo en Docker: PostgreSQL, Kafka, topics, API y dashboard :3000
docker compose up -d postgres kafka kafka-init           # solo infraestructura, para desarrollo local
cd telemetry-api && ./mvnw test                          # JDK 17; PostgreSQL de Dev Services (necesita Docker)
cd telemetry-api && ./mvnw quarkus:dev                   # :8080 + Flink UI :8081
cd telemetry-api && ./mvnw test -Dtest=RutaTest          # una clase; con método: -Dtest=Clase#metodo
cd telemetry-api && ./mvnw test -Dtest=ArquitecturaHexagonalTest   # solo las reglas de arquitectura
cd dashboard-next && npm test && npm run lint && npm run build && npm run dev   # :3000 (Vitest para funciones puras)
cd dashboard-next && npx vitest run features/autos/formato.test.ts               # un solo test del dashboard
curl -H 'Content-Type: application/json' -d '{"ruta":"av-brasil"}' localhost:8080/simulacion/iniciar   # o el dashboard
```

## Base de conocimiento (`knowledge/`)

`knowledge/` es una plantilla corporativa genérica. El stack está fijado en `ADR-003`; la persistencia en `ADR-004` (esquema con Flyway) y `ADR-007` (Hibernate ORM con Panache); la UI en `ADR-005` (Carbon v12); la arquitectura del backend en `ADR-006`. Varios ADR todavía citan `docs/specs/...`, que ya no existe. Algunas reglas aplican aquí y otras no:
- **Aplican:**
  - `STD-ARCH-001` y `ADR-006`: backend hexagonal y frontend **por features** (`features/<x>/` con `index.ts` público). Los DTOs son `record` escritos a mano.
  - `STD-GIT-001`: Conventional Commits y ramas `feature/<ticket>-<slug>` desde `develop`. **Todo cambio se versiona:** se trabaja en una rama de feature, nunca directo en `main` ni en `develop`, y cada tarea termina con su commit. En la práctica `develop`, `main` y `release` están protegidas: no se empuja directo, se sube la rama de feature y se abre un PR.
  - `STD-ERR-001`: contrato de error JSON con `requestId` y sin stack traces (`@ServerExceptionMapper` en `GlobalExceptionMapper`). `NegocioException` usa un `Tipo` independiente de HTTP; los errores de BD no exponen SQL ni credenciales.
  - `ADR-002`: tablas con prefijo `tb_` y en `snake_case`, y cada entity declara `@Table(name = "tb_...")`.
  - `ADR-001`: `graphify`. El grafo está en `graphify-out/` (no se versiona); actualízalo con `graphify update .`.
