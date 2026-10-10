# 02 · Simulador Python

**Objetivo:** generar la flota y publicar telemetría en `telemetria` a ~5.000 ev/s.
**Depende de:** 01 · **Spec:** §4, §7

## Alcance
- **Incluye:** generación de eventos, envío por rebanadas, productor Kafka, modo `--bench`.
- **No incluye:** múltiples procesos (`--desde/--hasta`) salvo que el productor no llegue a 5.000 ev/s.

## Tareas
- [ ] `simulador/requirements.txt` con el cliente Kafka de Python elegido (p. ej. `confluent-kafka`).
- [ ] Modelo de auto: posición inicial aleatoria en torno a Lima (−12.0464, −77.0428) ±0.1°; movimiento ±0.0005° por evento; `engine` cambia con 1 % de probabilidad; batería baja gradualmente.
- [ ] Bucle que reparte el envío en `--rebanadas` (por defecto 100) cada `intervalo/rebanadas` s.
- [ ] Productor con `linger.ms=20`, `batch.size=131072`, `acks=1`, `compression.type=gzip`, buffer 128 MB; key=`carId`, value=JSON compacto (esquema §4).
- [ ] CLI: `--autos 10000 --intervalo 2 --rebanadas 100 --bench --duracion 5`.
- [ ] Log del ritmo real (ev/s) cada 5 s.
- [ ] `--bench`: genera y serializa sin Kafka e imprime ev/s.

## Archivos
`simulador/simulador.py` · `simulador/requirements.txt`

## Verificación
```bash
python simulador/simulador.py --bench --duracion 5          # ≈ 100.000+ ev/s
python simulador/simulador.py --autos 1000 --intervalo 2    # ≈ 500 ev/s en el log
docker compose exec kafka kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic telemetria --from-beginning --max-messages 5 --property print.key=true
```
Esperado: mensajes con key `auto-N` y JSON con los 6 campos de §4; `lat`/`lon`/`battery` dentro de rango.

## Rama y commit
`feature/inc-02-simulador` · `feat(simulador): agrega simulador de flota con modo bench`

## Hecho cuando
Con 10.000 autos el log muestra ≥ 4.900 ev/s sostenidos y el consumidor de consola recibe eventos válidos.
