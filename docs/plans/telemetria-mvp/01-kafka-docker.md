# 01 · Kafka en Docker

**Objetivo:** tener Kafka local con los dos topics del MVP.
**Depende de:** — · **Spec:** §6, §13

## Alcance
- **Incluye:** `docker-compose.yml` (un broker KRaft, `:9092`), script de creación de topics.
- **No incluye:** Schema Registry, Kafka UI, seguridad, replicación (spec §2, §6).

## Tareas
- [ ] `docker-compose.yml` con una imagen oficial de Kafka en modo KRaft, puerto `9092` expuesto al host y `KAFKA_ADVERTISED_LISTENERS` apuntando a `localhost:9092`.
- [ ] `scripts/crear-topics.sh` (y `.ps1` para Windows) que crea:
  - `telemetria`: 12 particiones, `retention.ms=3600000`.
  - `ultima-posicion`: 12 particiones, `cleanup.policy=compact`.
- [ ] El script es idempotente (`--if-not-exists`).
- [ ] Sección "Kafka" en `README.md` con el comando de arranque.

## Archivos
`docker-compose.yml` · `scripts/crear-topics.sh` · `scripts/crear-topics.ps1` · `README.md`

## Verificación
```bash
docker compose up -d
./scripts/crear-topics.sh
docker compose exec kafka kafka-topics.sh --bootstrap-server localhost:9092 --describe
```
Esperado: ambos topics con 12 particiones; `ultima-posicion` con `cleanup.policy=compact`; `telemetria` con `retention.ms=3600000`.

## Rama y commit
`feature/inc-01-kafka-docker` · `feat(kafka): agrega docker compose y script de topics`

## Hecho cuando
Un `docker compose up -d` más el script dejan los topics listos desde cero, y se puede repetir sin errores.
