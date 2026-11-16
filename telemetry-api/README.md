# telemetry-api

Backend de la demo de telemetría en tiempo real. Simula una carrera de tres autos, procesa sus posiciones con **Apache Flink embebido**, las guarda en **PostgreSQL** y las expone por **REST** y **WebSocket**.

Es un único servicio **Quarkus** (Java 17) con arquitectura hexagonal. La arquitectura completa está en [`docs/c4/`](docs/c4/README.md).

## Qué hace

| Capacidad | Descripción |
|---|---|
| Simulación | Hace correr a los autos por rutas reales y publica su posición en Kafka cada segundo |
| Flink | Un job dentro de la misma JVM se queda con la última posición de cada auto |
| Autos | Guarda la última posición y la difunde por WebSocket cada 500 ms |
| Viajes | Guarda el historial de cada viaje de forma idempotente y lo ofrece paginado |

Las cuatro capacidades se comunican solo a través de los topics de Kafka (`telemetria` y `ultima-posicion`).

## Arquitectura

```text
infrastructure/in   →  application  →  domain
(REST, WS, Kafka)      (casos de uso)    (reglas y modelo)
                            ↓
infrastructure/out  (PostgreSQL, Kafka, WebSocket, Flink, métricas)
```

- Las dependencias apuntan hacia adentro: `domain` y `application` no conocen Quarkus, Kafka, Hibernate ni Flink.
- Una prueba de **ArchUnit** (`ArquitecturaHexagonalTest`) hace cumplir esas reglas.
- Persistencia con **Hibernate ORM y Panache**; **Flyway** crea el esquema e Hibernate solo lo valida.

Decisiones: [`ADR-006`](../knowledge/adrs/ADR-006-arquitectura-hexagonal-backend.md) (hexagonal) y [`ADR-007`](../knowledge/adrs/ADR-007-persistencia-hibernate-panache.md) (Panache).

## API

| Endpoint | Descripción |
|---|---|
| `GET /rutas` · `GET /rutas/{id}` | Rutas disponibles y su geometría (GeoJSON) |
| `GET /simulacion` | Estado de la carrera y clasificación |
| `POST /simulacion/iniciar` `{"ruta":"av-brasil"}` | Inicia una carrera |
| `POST /simulacion/detener` | Detiene la carrera |
| `PUT /simulacion/autos/{carId}/velocidad` `{"kmh":120}` | Cambia la velocidad de un auto (10 a 500 km/h) |
| `GET /autos` | Última posición de cada auto (`?bbox=minLon,minLat,maxLon,maxLat`) |
| `WS /ws/autos` | Posiciones que cambiaron, cada 500 ms |
| `GET /viajes` · `GET /viajes/{viajeId}` · `GET /viajes/{viajeId}/posiciones` | Historial, resumen y muestras, con paginación por cursor |
| `GET /q/health/ready` · `GET /q/metrics` | Salud y métricas de Prometheus |

Los errores devuelven un JSON con `code`, `message` y `requestId`, sin detalles internos.

## Cómo ejecutarlo

Requiere **JDK 17** y **Docker**.

```bash
# Desde la raíz del repositorio: infraestructura
cp .env.example .env
docker compose up -d postgres kafka kafka-init

# En este directorio
./mvnw quarkus:dev        # API en http://localhost:8080 y UI de Flink en http://localhost:8081
./mvnw test               # pruebas con PostgreSQL real (Dev Services)
```

En desarrollo se conecta a `localhost:5432/telemetria` con `POSTGRES_USER` y `POSTGRES_PASSWORD` del entorno. Para levantar todo el sistema, usa `docker compose up -d --build` desde la raíz.

Una sola prueba: `./mvnw test -Dtest=RutaTest` (o `-Dtest=Clase#metodo`).

## Configuración

| Variable | Para qué sirve |
|---|---|
| `QUARKUS_DATASOURCE_JDBC_URL`, `QUARKUS_DATASOURCE_USERNAME`, `QUARKUS_DATASOURCE_PASSWORD` | Conexión a PostgreSQL |
| `KAFKA_BOOTSTRAP_SERVERS` | Broker de Kafka |
| `QUARKUS_HTTP_CORS_ORIGINS` | Origen permitido del dashboard |
| `FLINK_UI_BIND_ADDRESS` | Dirección de la UI de Flink (`0.0.0.0` en Docker) |

## Documentación

- [Arquitectura C4](docs/c4/README.md): contexto, contenedores, componentes, código y una secuencia por endpoint.
- Esquema de la base: [`db/migration/`](src/main/resources/db/migration/).
