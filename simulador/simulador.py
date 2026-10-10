"""Simulador de flota (spec §7).

Publica en el topic `telemetria` un evento por auto cada `--intervalo` segundos,
repartido en `--rebanadas` envíos para evitar ráfagas. Key = carId, value = JSON compacto.

La flota se compone de empresas (cada una con varias flotas que operan alrededor de un
distrito de Lima) y de autos particulares dispersos por la ciudad.

    python simulador.py --autos 10000 --intervalo 2
    python simulador.py --autos 10000 --empresas 12 --particulares 0.2 --semilla 7
    python simulador.py --bench --duracion 5      # solo generación, sin Kafka
"""
import argparse
import json
import math
import random
import sys
import time

# Centros aproximados de distritos de Lima y Callao, con un peso relativo de tráfico
DISTRITOS = [
    ("Cercado de Lima", -12.0464, -77.0428, 3),
    ("Miraflores", -12.1211, -77.0297, 3),
    ("San Isidro", -12.0977, -77.0365, 3),
    ("Santiago de Surco", -12.1446, -76.9933, 3),
    ("San Juan de Lurigancho", -11.9790, -77.0020, 3),
    ("Jesús María", -12.0780, -77.0480, 2),
    ("San Miguel", -12.0770, -77.0900, 2),
    ("Callao", -12.0566, -77.1181, 2),
    ("Los Olivos", -11.9690, -77.0700, 2),
    ("Comas", -11.9330, -77.0530, 2),
    ("Ate", -12.0258, -76.9178, 2),
    ("La Molina", -12.0866, -76.9365, 1),
    ("Chorrillos", -12.1700, -77.0150, 2),
    ("San Juan de Miraflores", -12.1570, -76.9730, 2),
    ("Villa El Salvador", -12.2130, -76.9370, 2),
]
PESOS_DISTRITOS = [d[3] for d in DISTRITOS]
LIMA_CENTRO = (-12.0700, -77.0300)
LIMA_LIMITES = (-12.26, -11.88, -77.20, -76.84)  # lat mín, lat máx, lon mín, lon máx

KM_POR_GRADO = 111.32
TAMANIO_FLOTA = (5, 300)
SIGMA_FLOTA = (0.008, 0.018)      # dispersión de una flota alrededor de su hub (~1-2 km)
SIGMA_PARTICULAR = 0.025          # dispersión de los particulares alrededor de su distrito (~3 km)
VELOCIDAD_KMH = (20.0, 50.0)
GIRO_SIGMA = 15.0                 # grados de cambio de rumbo por evento
PROB_CAMBIO_MOTOR = 0.01
CONSUMO_BATERIA = (0.01, 0.05)


def _distrito_al_azar(rng: random.Random) -> tuple[float, float]:
    _, lat, lon, _ = rng.choices(DISTRITOS, weights=PESOS_DISTRITOS)[0]
    return lat, lon


def _rumbo_hacia(lat: float, lon: float, lat_obj: float, lon_obj: float) -> float:
    """Rumbo en grados (0 = norte, sentido horario) desde un punto hacia otro."""
    dy = lat_obj - lat
    dx = (lon_obj - lon) * math.cos(math.radians(lat))
    return math.degrees(math.atan2(dx, dy)) % 360


def _tamanio_flota(rng: random.Random) -> int:
    """Log-uniforme entre los límites: abundan las flotas chicas (10-30) y hay pocas de 100+."""
    lo, hi = TAMANIO_FLOTA
    return int(math.exp(rng.uniform(math.log(lo), math.log(hi + 1))))


def _repartir(total: int, partes: int, rng: random.Random) -> list[int]:
    """Reparte `total` en `partes` tamaños sesgados (pocas grandes, muchas chicas)."""
    pesos = [rng.lognormvariate(0, 1.3) for _ in range(partes)]
    suma = sum(pesos)
    tamanios = [max(1, int(total * p / suma)) for p in pesos]
    tamanios[tamanios.index(max(tamanios))] += total - sum(tamanios)  # el resto a la más grande
    return tamanios


class Flota:
    """Estado en memoria de todos los autos: de empresa (con flota) y particulares."""

    def __init__(self, n: int, empresas: int = 12, particulares: float = 0.2, semilla: int | None = None):
        rng = random.Random(semilla)
        self.rng = rng
        n_particulares = round(n * particulares) if empresas > 0 else n
        n_empresa = n - n_particulares

        self.ids: list[str] = []
        self.empresa: list[str | None] = []
        self.flota: list[str | None] = []
        self.hub: list[tuple[float, float] | None] = []
        self.radio: list[float] = []     # distancia (grados) a partir de la cual vuelve a su zona
        lats: list[float] = []
        lons: list[float] = []

        def agregar(empresa, flota, lat, lon, hub, radio):
            self.ids.append(f"auto-{len(self.ids) + 1}")
            self.empresa.append(empresa)
            self.flota.append(flota)
            lats.append(lat)
            lons.append(lon)
            self.hub.append(hub)
            self.radio.append(radio)

        # Autos de empresa: cada empresa se parte en flotas, y cada flota opera alrededor de un hub
        self.resumen_empresas: list[tuple[str, int, int]] = []   # (empresa, autos, flotas)
        if n_empresa > 0:
            for e, autos_empresa in enumerate(_repartir(n_empresa, empresas, rng), start=1):
                empresa = f"emp-{e:02d}"
                restantes, f = autos_empresa, 0
                while restantes > 0:
                    f += 1
                    tamanio = min(restantes, _tamanio_flota(rng))
                    restantes -= tamanio
                    hub_lat, hub_lon = _distrito_al_azar(rng)
                    hub = (hub_lat + rng.uniform(-0.01, 0.01), hub_lon + rng.uniform(-0.01, 0.01))
                    sigma = rng.uniform(*SIGMA_FLOTA)
                    for _ in range(tamanio):
                        agregar(empresa, f"{empresa}-f{f}", rng.gauss(hub[0], sigma), rng.gauss(hub[1], sigma),
                                hub, 2.5 * sigma)
                self.resumen_empresas.append((empresa, autos_empresa, f))

        # Particulares: repartidos por los distritos con más dispersión, sin hub propio
        for _ in range(n_particulares):
            lat, lon = _distrito_al_azar(rng)
            agregar(None, None, rng.gauss(lat, SIGMA_PARTICULAR), rng.gauss(lon, SIGMA_PARTICULAR), None, 0.0)

        self.lat = lats
        self.lon = lons
        total = len(self.ids)
        self.rumbo = [rng.uniform(0, 360) for _ in range(total)]
        self.velocidad = [rng.uniform(*VELOCIDAD_KMH) for _ in range(total)]
        self.motor_on = [rng.random() < 0.7 for _ in range(total)]
        self.bateria = [rng.uniform(20.0, 100.0) for _ in range(total)]
        self.intervalo = 2.0  # lo ajusta quien envía; define cuánto avanza cada auto por evento

    @property
    def particulares(self) -> int:
        return sum(1 for e in self.empresa if e is None)

    def evento(self, i: int, ts: int) -> tuple[str, bytes]:
        """Avanza el auto `i` un intervalo y devuelve (carId, JSON compacto)."""
        rng = self.rng
        if rng.random() < PROB_CAMBIO_MOTOR:
            self.motor_on[i] = not self.motor_on[i]

        lat, lon, rumbo = self.lat[i], self.lon[i], self.rumbo[i]
        if self.motor_on[i]:
            hub = self.hub[i]
            if hub is not None and abs(lat - hub[0]) + abs(lon - hub[1]) > self.radio[i]:
                rumbo = _rumbo_hacia(lat, lon, hub[0], hub[1]) + rng.gauss(0, 20)   # vuelve a su zona
            elif not (LIMA_LIMITES[0] < lat < LIMA_LIMITES[1] and LIMA_LIMITES[2] < lon < LIMA_LIMITES[3]):
                rumbo = _rumbo_hacia(lat, lon, *LIMA_CENTRO) + rng.gauss(0, 20)     # no salir de Lima
            else:
                rumbo += rng.gauss(0, GIRO_SIGMA)
            rumbo %= 360
            km = self.velocidad[i] * self.intervalo / 3600
            rad = math.radians(rumbo)
            lat += km * math.cos(rad) / KM_POR_GRADO
            lon += km * math.sin(rad) / (KM_POR_GRADO * math.cos(math.radians(lat)))
            self.lat[i], self.lon[i], self.rumbo[i] = lat, lon, rumbo
            bateria = self.bateria[i] - rng.uniform(*CONSUMO_BATERIA)
            self.bateria[i] = bateria if bateria > 0 else 100.0  # recarga al agotarse

        car_id = self.ids[i]
        valor = json.dumps(
            {
                "carId": car_id,
                "companyId": self.empresa[i],
                "fleetId": self.flota[i],
                "lat": round(lat, 6),
                "lon": round(lon, 6),
                "heading": int(rumbo) % 360,
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

    flota.intervalo = args.intervalo
    tam_rebanada = -(-n // args.rebanadas)  # techo
    paso = args.intervalo / args.rebanadas
    print(f"{n} autos ({len(flota.resumen_empresas)} empresas, {flota.particulares} particulares) · "
          f"cada {args.intervalo} s · {args.rebanadas} rebanadas de {tam_rebanada} "
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
    p.add_argument("--empresas", type=int, default=12, help="empresas con flotas (0 = solo particulares)")
    p.add_argument("--particulares", type=float, default=0.2, help="fracción de autos particulares (0 a 1)")
    p.add_argument("--semilla", type=int, default=None, help="semilla para repetir las mismas empresas y flotas")
    p.add_argument("--bench", action="store_true", help="solo generar y serializar, sin Kafka")
    p.add_argument("--duracion", type=float, default=None,
                   help="segundos; con --bench vale 5 por defecto, sin --bench corre hasta Ctrl+C")
    p.add_argument("--bootstrap", default="localhost:9092")
    p.add_argument("--topic", default="telemetria")
    args = p.parse_args()

    if args.autos < 1 or args.intervalo <= 0 or args.rebanadas < 1:
        p.error("--autos, --intervalo y --rebanadas deben ser positivos")
    if args.empresas < 0 or not 0 <= args.particulares <= 1:
        p.error("--empresas debe ser >= 0 y --particulares estar entre 0 y 1")

    flota = Flota(args.autos, args.empresas, args.particulares, args.semilla)
    if args.bench:
        bench(flota, args.duracion or 5.0)
    else:
        enviar(flota, args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
