# 09 · Simulador con empresas y flotas

**Objetivo:** reemplazar la nube uniforme de autos por un modelo realista de empresas, flotas y particulares que se mueven por Lima.
**Depende de:** 02 · **Spec:** §4, §5, §7

## Alcance
- **Incluye:** campos `companyId`, `fleetId` y `heading` en el evento; reparto de empresas y flotas; hubs en distritos reales; movimiento con rumbo y velocidad; `--semilla`.
- **No incluye:** cambios en Flink, Quarkus o el frontend (10 a 12); catálogo de nombres de empresas.

## Tareas
- [x] Parámetros `--empresas` (12), `--particulares` (0.2) y `--semilla`.
- [x] Tamaños de empresa sesgados (lognormal) y flotas de 5 a 300 autos log-uniformes (abundan las de 10 a 30).
- [x] Hub por flota en uno de 15 distritos de Lima y Callao (ponderados); particulares dispersos por distritos.
- [x] Movimiento: velocidad de 20 a 50 km/h y giros suaves; detenido con motor OFF; regreso al hub si la flota se dispersa; ningún auto sale de Lima.
- [x] Evento con los 9 campos de §4 en JSON compacto.

## Archivos
`simulador/simulador.py` · `docs/specs/telemetria.md` (§4, §5, §7)

## Verificación
```bash
python simulador/simulador.py --bench --duracion 5                       # > 100.000 ev/s
python simulador/simulador.py --autos 1000 --duracion 6 --semilla 7      # ~500 ev/s, 0 errores
kafka-console-consumer.sh --topic telemetria ...                         # eventos con companyId/fleetId/heading
```
Resultado: 170.000–198.000 ev/s en bench, semilla reproducible, 20 % particulares, eventos de ~145 B. Tras 1 h simulada: todos los autos dentro de Lima, cambio de rumbo mediano de 10° por evento y distancia al hub con mediana de 1,8 km.

## Rama y commit
`feature/inc-09-simulador-flotas` · `feat(simulador): modela empresas, flotas y particulares en Lima`

## Hecho cuando
El simulador publica eventos con el contrato nuevo, con una distribución realista y reproducible.
