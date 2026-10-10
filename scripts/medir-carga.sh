#!/usr/bin/env bash
# Prueba de carga (spec §11): corre el simulador y muestrea lag de los grupos, CPU y memoria.
# Uso: ./scripts/medir-carga.sh <autos> <segundos>      (MUESTRA=20 segundos entre muestras)
# Requiere: Kafka en docker compose, telemetry-api corriendo y el venv del simulador.
set -euo pipefail
export MSYS_NO_PATHCONV=1   # evita que Git Bash convierta la ruta /opt/... en Windows

AUTOS=${1:?uso: medir-carga.sh <autos> <segundos>}
DURACION=${2:?uso: medir-carga.sh <autos> <segundos>}
MUESTRA=${MUESTRA:-20}
RAIZ=$(cd "$(dirname "$0")/.." && pwd)
if [ -f "$RAIZ/simulador/.venv/Scripts/python.exe" ]; then
  PY="$RAIZ/simulador/.venv/Scripts/python.exe"   # Windows
else
  PY="$RAIZ/simulador/.venv/bin/python"
fi
[ -f "$PY" ] || { echo "No se encontró el venv del simulador ($PY)"; exit 1; }
LOG=$(mktemp)

lag() {
  docker exec telemetria-kafka /opt/kafka/bin/kafka-consumer-groups.sh \
    --bootstrap-server localhost:9092 --describe --group "$1" 2>/dev/null \
    | awk 'NR>1 && $6 ~ /^[0-9]+$/ {s+=$6; n++} END {print (n ? s : "sin-datos")}'
}
kafka_stats() { docker stats --no-stream --format '{{.CPUPerc}} {{.MemUsage}}' telemetria-kafka | awk '{print $1, $2}'; }
jvm_stats() {
  if command -v powershell >/dev/null; then
    local ps1="$RAIZ/scripts/jvm-stats.ps1"
    command -v cygpath >/dev/null && ps1=$(cygpath -w "$ps1")   # PowerShell no entiende /c/...
    powershell -NoProfile -ExecutionPolicy Bypass -File "$ps1" | tr -d '\r'
  else
    echo "- -"
  fi
}

# Desde su carpeta y con ruta relativa: con MSYS_NO_PATHCONV, Python en Windows no entiende /c/...
(cd "$RAIZ/simulador" && exec "$PY" -u simulador.py --autos "$AUTOS" --intervalo 2 --duracion "$DURACION") > "$LOG" 2>&1 &
SIM=$!
inicio=$(date +%s)

echo "### $AUTOS autos durante $DURACION s"
echo
echo "| t (s) | lag flink-ultima-pos | lag quarkus-dash | CPU Kafka | Mem Kafka | CPU JVM (% equipo) | Mem JVM (MB) |"
echo "|---|---|---|---|---|---|---|"
max_flink=0; max_quarkus=0
while kill -0 "$SIM" 2>/dev/null; do
  sleep "$MUESTRA"
  kill -0 "$SIM" 2>/dev/null || break
  t=$(( $(date +%s) - inicio ))
  lf=$(lag flink-ultima-pos); lq=$(lag quarkus-dash)
  read -r kcpu kmem < <(kafka_stats)
  read -r jcpu jmem < <(jvm_stats)
  echo "| $t | $lf | $lq | $kcpu | $kmem | $jcpu | $jmem |"
  [[ $lf =~ ^[0-9]+$ ]] && (( lf > max_flink )) && max_flink=$lf
  [[ $lq =~ ^[0-9]+$ ]] && (( lq > max_quarkus )) && max_quarkus=$lq
done
wait "$SIM" || true

# Ritmo real del productor: mediana y mínimo de las muestras del log (cada 5 s), sin la primera
ritmos=$(grep -oE '^[0-9,]+ ev/s' "$LOG" | tr -d ',' | awk '{print $1}' | tail -n +2 | sort -n || true)
n=$(echo "$ritmos" | grep -c . || true)
if (( n > 0 )); then
  minimo=$(echo "$ritmos" | head -1)
  mediana=$(echo "$ritmos" | sed -n "$(( (n + 1) / 2 ))p")
else
  minimo="-"; mediana="-"
fi
errores=$(grep -oE 'errores [0-9]+' "$LOG" | tail -1 | awk '{print $2}' || true)
if ! grep -q "ev/s" "$LOG"; then echo; echo "El simulador no produjo datos:"; cat "$LOG"; fi
registros=$(curl -s localhost:8080/autos | python -c 'import json,sys; print(len(json.load(sys.stdin)))' 2>/dev/null || echo "-")

echo
echo "- Ritmo del productor: mediana **$mediana ev/s**, mínimo $minimo ev/s, errores de entrega ${errores:-?}"
echo "- Lag máximo muestreado: flink-ultima-pos **$max_flink**, quarkus-dash **$max_quarkus**"
echo "- \`GET /autos\` al terminar: **$registros** registros"
rm -f "$LOG"
