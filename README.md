# Telemetría de autos en tiempo real

**Carreras** de 3 autos simulados en rutas reales del Perú, seguidas en un mapa en tiempo real:
simulación en Quarkus → Kafka → Flink embebido en Quarkus → WebSocket → Next.js. La última posición y el historial de viajes se guardan en PostgreSQL.
Especificaciones: [`docs/specs/telemetria.md`](docs/specs/telemetria.md) y [persistencia](docs/specs/persistencia-posiciones-viajes.md) · Planes: [`docs/plans/`](docs/plans/README.md) · Arquitectura C4: [`docs/c4/`](docs/c4/README.md).

## Levantar todo con Docker

```bash
cp .env.example .env               # credenciales de PostgreSQL (obligatorio; cámbialas fuera de desarrollo)
docker compose up -d --build       # PostgreSQL, Kafka, topics, API y dashboard → http://localhost:3000
docker compose ps                  # postgres, kafka y telemetry-api "healthy", kafka-init "Exited (0)"
docker compose logs -f telemetry-api
docker compose down                # detiene; los datos quedan en los volúmenes postgres-datos y kafka-datos
docker compose down -v             # además BORRA los volúmenes: se pierden posiciones e historial
```

| Servicio | Qué hace | Puerto |
|---|---|---|
| `postgres` | PostgreSQL 17: última posición e historial de viajes (esquema con Flyway) | 5432 |
| `kafka` | Broker KRaft (Kafka 4.2.1) | 9092 (host) · `kafka:29092` (entre contenedores) |
| `kafka-init` | Crea `telemetria` (12 particiones, retención 1 h) y `ultima-posicion` (12 particiones, compact) y termina | — |
| `telemetry-api` | Quarkus + Flink embebido; healthcheck en `/q/health/ready` | 8080 (REST y WebSocket) · 8081 (UI de Flink) |
| `dashboard` | Next.js (salida standalone) | 3000 |

Los servicios tienen `restart: unless-stopped`: vuelven a levantarse solos al reiniciar Docker. El primer build tarda unos minutos (descarga dependencias de Maven y npm); los siguientes reutilizan la caché de BuildKit.

En el dashboard, elige una ruta y pulsa **"Iniciar carrera"**.

## Desarrollo local

Solo Kafka en Docker; la API y el dashboard corren en el host con recarga en caliente.

1. **Kafka y PostgreSQL**

   ```bash
   cp .env.example .env                 # si no existe
   docker compose up -d postgres kafka
   ./scripts/crear-topics.sh            # en Windows: .\scripts\crear-topics.ps1
   ./scripts/crear-topics.sh --recrear  # borra y crea de nuevo (tras un cambio del contrato del evento)
   ```

2. **Backend (Quarkus + Flink).** Requiere JDK 17.

   ```bash
   cd telemetry-api
   ./mvnw test                        # usa PostgreSQL de Dev Services: requiere Docker
   ./mvnw quarkus:dev                 # http://localhost:8080 · UI de Flink en http://localhost:8081
   ```

   `quarkus:dev` se conecta a `localhost:5432/telemetria` con `POSTGRES_USER` y `POSTGRES_PASSWORD` del entorno.

   Prueba E2E de persistencia y recuperación, con Kafka y PostgreSQL reales y desechables: `powershell -NoProfile -File scripts/probar-persistencia.ps1`. Ver [casos de prueba y operación](docs/test-cases/persistencia-posiciones-viajes.md).

3. **Dashboard (Next.js)**

   ```bash
   cd dashboard-next
   cp .env.example .env.local         # URL del backend y del WebSocket
   npm install
   npm run dev                        # http://localhost:3000
   ```

## Qué se ve

- **Rutas establecidas:** se eligen en un selector y se dibujan con su Salida y su Meta (geometría de OpenStreetMap).

  | Ruta | Salida → Meta | Longitud |
  |---|---|---|
  | Av. Brasil | Plaza Bolognesi → Magdalena del Mar | 5,2 km |
  | Panamericana Sur | Puente Atocongo → Lurín | 20,5 km |
  | Panamericana Norte | Av. Caquetá (Rímac) → Puente Piedra | 16,8 km |
  | Vía Los Libertadores | Pisco → Ayacucho | 325 km |

- **Carrera:** los 3 autos salen juntos y en un solo sentido; al llegar a la meta se detienen con su tiempo.
  - La clasificación se actualiza en vivo y "Nueva carrera" los devuelve a la salida.
  - Cada auto tiene un **slider de velocidad** (10–500 km/h) que se puede mover en plena carrera.
  - **"Seguir al líder"** centra el mapa en el primero, útil en la ruta de 325 km.
- **Autos:** íconos de vehículo orientados según su rumbo, con movimiento interpolado entre posiciones.
- **Filtro empresa → flota:** "Empresa 01" muestra sus 2 autos y "Empresa 02" su único auto.
- **Tema claro / oscuro / sistema:** se elige en la cabecera del panel y cambia el mapa y toda la interfaz.
- **Panel:** conexión, edad del último dato y latencia p95. Al pasar el mouse sobre un auto se ven su empresa, flota, motor y batería.

## API

| Endpoint | Descripción |
|---|---|
| `GET /rutas` · `GET /rutas/{id}` | Rutas establecidas y su GeoJSON (de la salida a la meta) |
| `POST /simulacion/iniciar` `{"ruta":"panamericana-sur"}` · `POST /simulacion/detener` · `GET /simulacion` | Control de la carrera y clasificación |
| `PUT /simulacion/autos/{carId}/velocidad` `{"kmh":120}` | Velocidad de un auto (10–500 km/h) |
| `GET /autos` | Última posición de cada auto (`?bbox=minLon,minLat,maxLon,maxLat` para filtrar) |
| `WS /ws/autos` | Cada 500 ms, un arreglo con los autos cuyo cambio ya se guardó en la BD |
| `GET /viajes` | Viajes paginados (`carId`, `carreraId`, `desde`, `hasta`, `limit` 1–1000, `cursor`) |
| `GET /viajes/{viajeId}` | Estado del viaje y resumen observado (muestras, duración, distancia, velocidad media) |
| `GET /viajes/{viajeId}/posiciones` | Muestras en orden cronológico, con cursor (`desde`, `hasta`, `limit`, `cursor`) |
| `GET /q/health/ready` · `GET /q/metrics` | Readiness de la BD y los canales Kafka · métricas Prometheus de ingesta y lag |

## Notas

- **Imágenes:** `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_WS_URL` se fijan al construir el dashboard (build args en `docker-compose.yml`), porque las usa el navegador. La API se configura por variables de entorno (`KAFKA_BOOTSTRAP_SERVERS`, `QUARKUS_HTTP_CORS_ORIGINS`, `FLINK_UI_BIND_ADDRESS`).
- **Estado del backend:** la última posición (`tb_ultima_posicion`) y el historial (`tb_viaje`, `tb_posicion_historial`) viven en PostgreSQL y sobreviven a reinicios. Los consumidores `quarkus-dash-postgres` y `quarkus-viajes-postgres` confirman offsets después del commit. Si fallan, detienen su canal y ponen la readiness en DOWN: corrige la causa y reinicia la API ([runbook](docs/test-cases/persistencia-posiciones-viajes.md#recuperación)).
- **Credenciales:** `.env` no se versiona. `.env.example` trae valores solo para desarrollo local.
- **Autos y rutas:** los autos (empresa, flota, velocidad inicial) están en `telemetry-api/src/main/resources/escenarios/carrera.json`; las rutas, en `resources/rutas/` (`indice.json` y un GeoJSON por ruta).
- **Código generado:** `dashboard-next/components/ui/map.tsx` lo genera mapcn y no pasa por el lint. La interfaz usa Carbon v12 (ADR-005).
