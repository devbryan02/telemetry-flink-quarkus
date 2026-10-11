# Telemetría de autos en tiempo real

**Carreras** de 3 autos simulados en rutas reales del Perú, seguidas en un mapa en tiempo real:
simulación en Quarkus → Kafka → Flink embebido en Quarkus → WebSocket → Next.js.
Especificación: [`docs/specs/telemetria.md`](docs/specs/telemetria.md) · Planes: [`docs/plans/`](docs/plans/README.md).

## Levantar todo con Docker

```bash
docker compose up -d --build       # Kafka, topics, API y dashboard → http://localhost:3000
docker compose ps                  # kafka y telemetry-api "healthy", kafka-init "Exited (0)"
docker compose logs -f telemetry-api
docker compose down                # detiene; los datos de Kafka quedan en el volumen kafka-datos
docker compose down -v             # además borra el volumen
```

| Servicio | Qué hace | Puerto |
|---|---|---|
| `kafka` | Broker KRaft (Kafka 4.2.1) | 9092 (host) · `kafka:29092` (entre contenedores) |
| `kafka-init` | Crea `telemetria` (12 particiones, retención 1 h) y `ultima-posicion` (12 particiones, compact) y termina | — |
| `telemetry-api` | Quarkus + Flink embebido | 8080 (REST y WebSocket) · 8081 (UI de Flink) |
| `dashboard` | Next.js (salida standalone) | 3000 |

Los servicios tienen `restart: unless-stopped`: vuelven a levantarse solos al reiniciar Docker. El primer build tarda unos minutos (descarga dependencias de Maven y npm); los siguientes reutilizan la caché de BuildKit.

En el dashboard, elige una ruta y pulsa **"Iniciar carrera"**.

## Desarrollo local

Solo Kafka en Docker; la API y el dashboard corren en el host con recarga en caliente.

1. **Kafka**

   ```bash
   docker compose up -d kafka
   ./scripts/crear-topics.sh            # en Windows: .\scripts\crear-topics.ps1
   ./scripts/crear-topics.sh --recrear  # borra y crea de nuevo (tras un cambio del contrato del evento)
   ```

2. **Backend (Quarkus + Flink).** Requiere JDK 17.

   ```bash
   cd telemetry-api
   ./mvnw test
   ./mvnw quarkus:dev                 # http://localhost:8080 · UI de Flink en http://localhost:8081
   ```

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
| `WS /ws/autos` | Cada 500 ms, un arreglo con los autos que cambiaron |

## Notas

- **Imágenes:** `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_WS_URL` se fijan al construir el dashboard (build args en `docker-compose.yml`), porque las usa el navegador. La API se configura por variables de entorno (`KAFKA_BOOTSTRAP_SERVERS`, `QUARKUS_HTTP_CORS_ORIGINS`, `FLINK_UI_BIND_ADDRESS`).
- **Estado del backend:** vive en memoria y se reconstruye al arrancar releyendo `ultima-posicion` desde el inicio. Si detienes el proceso a la fuerza, el grupo `quarkus-dash` puede tardar hasta ~45 s en reasignar particiones.
- **Autos y rutas:** los autos (empresa, flota, velocidad inicial) están en `telemetry-api/src/main/resources/escenarios/carrera.json`; las rutas, en `resources/rutas/` (`indice.json` y un GeoJSON por ruta).
- **Código generado:** `dashboard-next/components/ui/` lo generan las CLIs de shadcn/mapcn y no pasa por el lint.
