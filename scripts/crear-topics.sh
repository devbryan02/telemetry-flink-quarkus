#!/usr/bin/env bash
# Crea los topics del MVP (spec §6). Idempotente.
# Uso: ./scripts/crear-topics.sh [--recrear]
#   --recrear borra antes ambos topics (y con ellos los offsets de los grupos): útil cuando cambia el
#   contrato del evento, porque ultima-posicion está compactado y conserva el último evento de cada auto.
set -euo pipefail
export MSYS_NO_PATHCONV=1   # evita que Git Bash convierta la ruta /opt/... en Windows

KAFKA="docker exec telemetria-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092"

if [ "${1:-}" = "--recrear" ]; then
  $KAFKA --delete --if-exists --topic telemetria
  $KAFKA --delete --if-exists --topic ultima-posicion
  # el borrado es asíncrono: esperar a que desaparezcan antes de crearlos otra vez
  while $KAFKA --list | grep -qxE "telemetria|ultima-posicion"; do sleep 1; done
fi

$KAFKA --create --if-not-exists --topic telemetria --partitions 12 --config retention.ms=3600000
$KAFKA --create --if-not-exists --topic ultima-posicion --partitions 12 --config cleanup.policy=compact
