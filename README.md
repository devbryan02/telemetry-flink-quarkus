# Telemetría de autos en tiempo real

MVP de telemetría: simulador Python → Kafka → Quarkus con Flink embebido → Next.js.
Especificación: [`docs/specs/telemetria.md`](docs/specs/telemetria.md) · Planes: [`docs/plans/`](docs/plans/README.md).

## Kafka

```bash
docker compose up -d
./scripts/crear-topics.sh          # en Windows: .\scripts\crear-topics.ps1
./scripts/crear-topics.sh --recrear # borra y crea de nuevo (tras un cambio del contrato del evento)
docker compose exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --describe
```

Un solo broker KRaft (Kafka 4.2.1) en `localhost:9092`. Topics: `telemetria` (12 particiones, retención 1 h) y `ultima-posicion` (12 particiones, compact).

## Simulador

```bash
cd simulador
uv venv .venv && uv pip install -r requirements.txt --python .venv/Scripts/python.exe   # o: python -m venv .venv && pip install -r requirements.txt
.venv/Scripts/python simulador.py --autos 10000 --intervalo 2     # corre hasta Ctrl+C (o --duracion N)
.venv/Scripts/python simulador.py --bench --duracion 5            # solo generación, sin Kafka
```

## Backend (Quarkus)

Requiere JDK 17 y Kafka arriba (ver sección Kafka).

```bash
cd telemetry-api
./mvnw test
./mvnw quarkus:dev                 # http://localhost:8080
curl localhost:8080/autos          # estado completo; ?bbox=minLon,minLat,maxLon,maxLat para filtrar
```

El estado vive en memoria y se reconstruye al arrancar releyendo `ultima-posicion` desde el inicio.
Si detienes el proceso a la fuerza, el grupo `quarkus-dash` puede tardar hasta ~45 s en reasignar particiones.

Cliente WebSocket de prueba (Node 22+): `new WebSocket('ws://localhost:8080/ws/autos')` recibe cada 500 ms un arreglo con los autos que cambiaron.

El job de Flink corre dentro de Quarkus y arranca solo; su UI queda en http://localhost:8081.
Para probarlo de punta a punta: `simulador.py --autos 1000` escribe en `telemetria`, Flink publica en `ultima-posicion` y `GET /autos` refleja los cambios.

## Dashboard (Next.js)

```bash
cd dashboard-next
cp .env.example .env.local      # URL del backend y del WebSocket
npm install
npm run dev                     # http://localhost:3000
```

Mapa con shadcn/ui y mapcn (MapLibre). Sin selección se ve una burbuja por empresa y los autos particulares sueltos (verde: motor encendido, rojo: apagado). Al elegir una empresa (en el selector o con clic en su burbuja) aparecen sus flotas, y desde zoom 14, sus autos. Las burbujas que se solapan se fusionan y abren una lista para elegir.
La carga inicial llega por `GET /autos` (axios) y los cambios por WebSocket; si el backend se cae, el cliente reconecta solo.
La tarjeta superior muestra autos visibles, lotes/s, edad del último dato y latencia p95 (`Date.now() - ts`).
`components/ui/` es código generado por las CLIs de shadcn/mapcn y no pasa por el lint.

## Pruebas de carga

Con Kafka, `telemetry-api` y el dashboard arriba:

```bash
./scripts/medir-carga.sh 10000 600          # simulador + muestreo de lag, CPU y memoria (tabla Markdown)
# en paralelo, con Edge/Chrome abierto con --remote-debugging-port=9222:
node scripts/medir-navegador.mjs http://localhost:3000 15   # FPS y latencia p95 leídos del dashboard
```

Resultados y criterios de aceptación: [`docs/plans/resultados-carga.md`](docs/plans/resultados-carga.md).
