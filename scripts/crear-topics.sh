#!/usr/bin/env bash
# Crea los topics del MVP (spec §6). Idempotente.
set -euo pipefail
export MSYS_NO_PATHCONV=1   # evita que Git Bash convierta la ruta /opt/... en Windows

KAFKA="docker compose exec -T kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092"

$KAFKA --create --if-not-exists --topic telemetria --partitions 12 --config retention.ms=3600000
$KAFKA --create --if-not-exists --topic ultima-posicion --partitions 12 --config cleanup.policy=compact
