# Telemetría de autos en tiempo real

Tres autos simulados recorren la **Av. Brasil** (Lima) y se siguen en un mapa en tiempo real:
simulación en Quarkus → Kafka → Flink embebido en Quarkus → WebSocket → Next.js.
Especificación: [`docs/specs/telemetria.md`](docs/specs/telemetria.md) · Planes: [`docs/plans/`](docs/plans/README.md).

## Puesta en marcha

1. **Kafka**

   ```bash
   docker compose up -d
   ./scripts/crear-topics.sh            # en Windows: .\scripts\crear-topics.ps1
   ./scripts/crear-topics.sh --recrear  # borra y crea de nuevo (tras un cambio del contrato del evento)
   ```

   Un solo broker KRaft (Kafka 4.2.1) en `localhost:9092`. Topics: `telemetria` (12 particiones, retención 1 h) y `ultima-posicion` (12 particiones, compact).

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

4. En el dashboard, pulsa **"Iniciar simulación"**.

## Qué se ve

- **Ruta:** la Av. Brasil dibujada, con sus dos calzadas sacadas de OpenStreetMap.
- **Autos:** 3 íconos de vehículo que circulan por su calzada y dan media vuelta en los extremos.
  - Van orientados según su rumbo y son verdes o rojos según el motor.
  - Paran a veces en semáforos.
  - Su movimiento se interpola, así que circulan sin saltar.
- **Filtro empresa → flota:** "Empresa 01" muestra sus 2 autos y "Empresa 02" su único auto; con la flota se acota todavía más.
- **Panel:** conexión, autos mostrados, edad del último dato y latencia p95. Al pasar el mouse sobre un auto se ven su empresa, flota, motor y batería.

## API

| Endpoint | Descripción |
|---|---|
| `POST /simulacion/iniciar` · `POST /simulacion/detener` · `GET /simulacion` | Control y estado de la simulación |
| `GET /autos` | Última posición de cada auto (`?bbox=minLon,minLat,maxLon,maxLat` para filtrar) |
| `WS /ws/autos` | Cada 500 ms, un arreglo con los autos que cambiaron |
| `GET /rutas/av-brasil` | GeoJSON de la ruta (calzadas `ida` y `vuelta`) |

## Notas

- **Estado del backend:** vive en memoria y se reconstruye al arrancar releyendo `ultima-posicion` desde el inicio. Si detienes el proceso a la fuerza, el grupo `quarkus-dash` puede tardar hasta ~45 s en reasignar particiones.
- **Escenario:** el escenario (autos, empresas, flotas, velocidades) está en `telemetry-api/src/main/resources/escenarios/av-brasil.json`, y la ruta en `resources/rutas/av-brasil.geojson`.
- **Código generado:** `dashboard-next/components/ui/` lo generan las CLIs de shadcn/mapcn y no pasa por el lint.
