# 14 · Todo en Docker Compose

**Objetivo:** dockerizar la API y el dashboard y levantar el sistema completo (Kafka, topics, API y dashboard) como servicios con `docker compose`.
**Depende de:** 13 · **Spec:** §12

## Alcance
- **Incluye:**
  - imágenes multi-stage de la API y del dashboard;
  - Kafka con listener interno y externo, y volumen de datos;
  - creación de topics en un servicio `kafka-init`;
  - healthchecks, arranque ordenado y `restart: unless-stopped`.
- **No incluye:** registro de imágenes, despliegue fuera de la máquina local ni Flink en un clúster aparte.

## Tareas
- [x] `docker-compose.yml`:
  - `kafka` con listeners `INTERNO://kafka:29092` y `EXTERNO://localhost:9092` y volumen `kafka-datos`;
  - `kafka-init`, que crea los topics con `--if-not-exists` y termina;
  - `telemetry-api` (healthcheck `GET /rutas`) y `dashboard`, encadenados con `depends_on`.
- [x] `telemetry-api/Dockerfile`:
  - Maven 3.9 + JDK 17 (dependencias en capa propia y caché de `~/.m2`) → JRE 17 con el fast-jar y usuario no root;
  - `.dockerignore` que solo deja `pom.xml` y `src/`;
  - se quitan los `src/main/docker/Dockerfile.*` del scaffold.
- [x] `flink.ui.bind-address` en `FlinkJobRunner` (por defecto `localhost`, `0.0.0.0` en Docker) para publicar la UI de Flink.
- [x] `dashboard-next/Dockerfile`:
  - `output: "standalone"` en `next.config.ts`;
  - etapas `deps` → `build` (build args `NEXT_PUBLIC_*`) → `runner` con `node server.js` y usuario no root.
- [x] `--font-sans` apunta a `--font-geist-sans` en `globals.css`; antes se referenciaba a sí misma y la interfaz caía a una fuente serif.

## Archivos
`docker-compose.yml` · `telemetry-api/{Dockerfile,.dockerignore}` · `telemetry-api/src/main/java/dev/bryan/flink/FlinkJobRunner.java` · `application.properties` · `dashboard-next/{Dockerfile,.dockerignore,next.config.ts,app/globals.css}`

## Verificación
- `docker compose up -d --build`: `kafka` y `telemetry-api` healthy, `kafka-init` termina con `Exited (0)` y el job Flink queda en `RUNNING`.
- `GET /rutas` devuelve las 4 rutas, la UI de Flink responde en `:8081` y una carrera iniciada por REST avanza en `GET /simulacion` y `GET /autos`.
- Con Edge headless (CDP) en `localhost:3000`: "En vivo", clasificación avanzando, fuente Geist y sin errores en consola.
- Tras `docker compose down` y `up -d`, los topics siguen y `GET /autos` devuelve las últimas posiciones.
- Con solo `kafka` en Docker, la API en el host conecta por `localhost:9092`.

## Rama y commit
`feature/inc-19-docker-compose` · `feat(infra): API y dashboard en Docker Compose`

## Hecho cuando
`docker compose up -d --build` levanta el sistema completo y el dashboard en `localhost:3000` muestra las carreras en vivo.
