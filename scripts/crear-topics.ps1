# Crea los topics del MVP (spec §6). Idempotente.
# Uso: .\scripts\crear-topics.ps1 [-Recrear]
#   -Recrear borra antes ambos topics (y con ellos los offsets de los grupos): útil cuando cambia el
#   contrato del evento, porque ultima-posicion está compactado y conserva el último evento de cada auto.
param([switch]$Recrear)
$ErrorActionPreference = "Stop"

$kafka = "/opt/kafka/bin/kafka-topics.sh"
function Kafka { docker exec telemetria-kafka $kafka --bootstrap-server localhost:9092 @args }

if ($Recrear) {
    Kafka --delete --if-exists --topic telemetria
    Kafka --delete --if-exists --topic ultima-posicion
    # el borrado es asíncrono: esperar a que desaparezcan antes de crearlos otra vez
    while (Kafka --list | Where-Object { $_ -in @("telemetria", "ultima-posicion") }) { Start-Sleep 1 }
}

Kafka --create --if-not-exists --topic telemetria --partitions 12 --config retention.ms=3600000
Kafka --create --if-not-exists --topic ultima-posicion --partitions 12 --config cleanup.policy=compact
