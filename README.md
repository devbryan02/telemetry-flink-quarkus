# Telemetría de autos en tiempo real

MVP de telemetría: simulador Python → Kafka → Quarkus con Flink embebido → Next.js.
Especificación: [`docs/specs/telemetria.md`](docs/specs/telemetria.md) · Planes: [`docs/plans/`](docs/plans/README.md).

## Kafka

```bash
docker compose up -d
./scripts/crear-topics.sh          # en Windows: .\scripts\crear-topics.ps1
docker compose exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --describe
```

Un solo broker KRaft en `localhost:9092`. Topics: `telemetria` (12 particiones, retención 1 h) y `ultima-posicion` (12 particiones, compact).
