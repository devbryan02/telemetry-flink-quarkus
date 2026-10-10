"""Simulador de flota (spec §7).

Publica en el topic `telemetria` un evento por auto cada `--intervalo` segundos,
repartido en `--rebanadas` envíos para evitar ráfagas. Key = carId, value = JSON compacto.

    python simulador.py --autos 10000 --intervalo 2
    python simulador.py --bench --duracion 5      # solo generación, sin Kafka
"""
import argparse
import json
import random
import sys
import time

LIMA_LAT, LIMA_LON = -12.0464, -77.0428
RADIO_INICIAL = 0.1      # ± grados alrededor de Lima
PASO_MAX = 0.0005        # ± grados por evento
PROB_CAMBIO_MOTOR = 0.01
CONSUMO_BATERIA = (0.01, 0.05)


class Flota:
    """Estado en memoria de los `n` autos de la flota."""

    def __init__(self, n: int):
        self.ids = [f"auto-{i + 1}" for i in range(n)]
        self.lat = [LIMA_LAT + random.uniform(-RADIO_INICIAL, RADIO_INICIAL) for _ in range(n)]
        self.lon = [LIMA_LON + random.uniform(-RADIO_INICIAL, RADIO_INICIAL) for _ in range(n)]
        self.motor_on = [random.random() < 0.5 for _ in range(n)]
        self.bateria = [random.uniform(20.0, 100.0) for _ in range(n)]

    def evento(self, i: int, ts: int) -> tuple[str, bytes]:
        """Avanza el auto `i` un paso y devuelve (carId, JSON compacto)."""
        lat = min(90.0, max(-90.0, self.lat[i] + random.uniform(-PASO_MAX, PASO_MAX)))
        lon = min(180.0, max(-180.0, self.lon[i] + random.uniform(-PASO_MAX, PASO_MAX)))
        self.lat[i], self.lon[i] = lat, lon

        if random.random() < PROB_CAMBIO_MOTOR:
            self.motor_on[i] = not self.motor_on[i]

        bateria = self.bateria[i] - random.uniform(*CONSUMO_BATERIA)
        self.bateria[i] = bateria if bateria > 0 else 100.0  # recarga al agotarse

        car_id = self.ids[i]
        valor = json.dumps(
            {
                "carId": car_id,
                "lat": round(lat, 6),
                "lon": round(lon, 6),
                "engine": "ON" if self.motor_on[i] else "OFF",
                "battery": int(self.bateria[i]),
                "ts": ts,
            },
            separators=(",", ":"),
        )
        return car_id, valor.encode()


def bench(flota: Flota, duracion: float) -> None:
    n = len(flota.ids)
    total = 0
    inicio = time.perf_counter()
    while time.perf_counter() - inicio < duracion:
        ts = int(time.time() * 1000)
        for i in range(n):
            flota.evento(i, ts)
        total += n
    transcurrido = time.perf_counter() - inicio
    print(f"bench: {total} eventos en {transcurrido:.2f} s = {total / transcurrido:,.0f} ev/s")


def crear_productor(bootstrap: str):
    from confluent_kafka import Producer

    return Producer(
        {
            "bootstrap.servers": bootstrap,
            "linger.ms": 20,
            "batch.size": 131072,
            "acks": 1,
            "compression.type": "gzip",
            "queue.buffering.max.kbytes": 131072,  # 128 MB
            "queue.buffering.max.messages": 1_000_000,
        }
    )


def enviar(flota: Flota, args) -> None:
    n = len(flota.ids)
    productor = crear_productor(args.bootstrap)
    contadores = {"entregados": 0, "errores": 0}

    def al_entregar(err, _msg):
        contadores["errores" if err else "entregados"] += 1

    tam_rebanada = -(-n // args.rebanadas)  # techo
    paso = args.intervalo / args.rebanadas
    print(f"{n} autos · cada {args.intervalo} s · {args.rebanadas} rebanadas de {tam_rebanada} "
          f"cada {paso * 1000:.0f} ms · topic {args.topic}")

    proximo = time.monotonic()
    fin = proximo + args.duracion if args.duracion else None
    log_en = proximo + 5
    entregados_log = 0
    t_log = proximo
    rebanada = 0
    try:
        while fin is None or time.monotonic() < fin:
            desde = rebanada * tam_rebanada
            hasta = min(desde + tam_rebanada, n)
            ts = int(time.time() * 1000)
            for i in range(desde, hasta):
                clave, valor = flota.evento(i, ts)
                while True:
                    try:
                        productor.produce(args.topic, key=clave, value=valor, on_delivery=al_entregar)
                        break
                    except BufferError:
                        productor.poll(0.1)
                productor.poll(0)
            rebanada = (rebanada + 1) % args.rebanadas

            proximo += paso
            ahora = time.monotonic()
            if ahora >= log_en:
                ritmo = (contadores["entregados"] - entregados_log) / (ahora - t_log)
                print(f"{ritmo:,.0f} ev/s · entregados {contadores['entregados']} · "
                      f"errores {contadores['errores']}")
                entregados_log, t_log, log_en = contadores["entregados"], ahora, ahora + 5
            # poll() retorna en cuanto llega un callback: hay que repetirlo hasta la hora programada
            while (espera := proximo - time.monotonic()) > 0:
                productor.poll(espera)
            if espera < -1:
                proximo = time.monotonic()  # nos atrasamos: no acumular deuda
    except KeyboardInterrupt:
        print("\ndeteniendo…")
    finally:
        productor.flush(10)
        print(f"entregados {contadores['entregados']} · errores {contadores['errores']}")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Simulador de flota para Kafka")
    p.add_argument("--autos", type=int, default=10_000)
    p.add_argument("--intervalo", type=float, default=2.0, help="segundos entre reportes de cada auto")
    p.add_argument("--rebanadas", type=int, default=100, help="envíos por intervalo")
    p.add_argument("--bench", action="store_true", help="solo generar y serializar, sin Kafka")
    p.add_argument("--duracion", type=float, default=None,
                   help="segundos; con --bench vale 5 por defecto, sin --bench corre hasta Ctrl+C")
    p.add_argument("--bootstrap", default="localhost:9092")
    p.add_argument("--topic", default="telemetria")
    args = p.parse_args()

    if args.autos < 1 or args.intervalo <= 0 or args.rebanadas < 1:
        p.error("--autos, --intervalo y --rebanadas deben ser positivos")

    flota = Flota(args.autos)
    if args.bench:
        bench(flota, args.duracion or 5.0)
    else:
        enviar(flota, args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
