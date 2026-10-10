# Crea los topics del MVP (spec §6). Idempotente.
$ErrorActionPreference = "Stop"

$kafka = "/opt/kafka/bin/kafka-topics.sh"
docker compose exec -T kafka $kafka --bootstrap-server localhost:9092 --create --if-not-exists --topic telemetria --partitions 12 --config retention.ms=3600000
docker compose exec -T kafka $kafka --bootstrap-server localhost:9092 --create --if-not-exists --topic ultima-posicion --partitions 12 --config cleanup.policy=compact
