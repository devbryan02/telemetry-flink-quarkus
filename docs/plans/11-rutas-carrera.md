# 11 · Rutas establecidas y modo carrera (backend)

**Objetivo:** que el backend ofrezca varias rutas grandes y corra en ellas una carrera de los 3 autos, con salida común, un solo sentido, meta y velocidad ajustable por auto.
**Depende de:** 09 · **Spec:** §5, §7

## Alcance
- **Incluye:**
  - 4 rutas (Av. Brasil, Panamericana Sur, Panamericana Norte y Vía Los Libertadores);
  - catálogo `GET /rutas`;
  - carrera con estados y clasificación;
  - cambio de velocidad por auto.
- **No incluye:** el dashboard (12).

## Tareas
- [x] Geometrías de OpenStreetMap vía OSRM, recortadas a su carretera (PE-1S, PE-1N y PE-28A, esta última con puntos de paso reales de la vía) y simplificadas a 10 m. Más el índice `rutas/indice.json`.
- [x] `CatalogoRutas`: `listar`, `ruta(id)` (una sola polilínea) y `geojson(id)`.
- [x] `AutoCorredor`: avanza a su velocidad (10–500 km/h, ajustable) y en la meta se detiene con motor OFF y tiempo de llegada interpolado.
- [x] `Simulador`:
  - carrera `LISTA` → `EN_CURSO` → `TERMINADA`;
  - salida común;
  - publica los autos en pista y el evento final de cada uno;
  - clasificación (los que llegaron por tiempo, el resto por distancia);
  - las velocidades se conservan entre carreras.
- [x] REST: `GET /rutas`, `POST /simulacion/iniciar {"ruta"}` y `PUT /simulacion/autos/{carId}/velocidad {"kmh"}`, con errores `RUTA_REQUERIDA`, `RUTA_NO_ENCONTRADA`, `VELOCIDAD_INVALIDA` y `AUTO_NO_ENCONTRADO`.
- [x] Tests de `AutoCorredor` y del recurso, incluida una carrera completa en la Av. Brasil a 500 km/h.

## Archivos
`telemetry-api/src/main/java/dev/bryan/simulacion/*` · `src/main/resources/rutas/*` · `src/main/resources/escenarios/carrera.json` · `src/test/java/dev/bryan/simulacion/*`

## Verificación
```bash
cd telemetry-api && ./mvnw test
curl -s localhost:8080/rutas
curl -s -H 'Content-Type: application/json' -d '{"ruta":"panamericana-sur"}' localhost:8080/simulacion/iniciar
curl -s -X PUT -H 'Content-Type: application/json' -d '{"kmh":300}' localhost:8080/simulacion/autos/auto-1/velocidad
curl -s localhost:8080/simulacion        # clasificación en vivo
```
Resultado: con los 3 autos a 500/500/450 km/h en la Av. Brasil, llegan a los 37,6, 37,6 y 41,7 s, coherente con 5.218 m. Al llegar quedan en la meta con motor OFF.

## Rama y commit
`feature/inc-16-rutas-carrera` · `feat(simulacion): rutas establecidas y modo carrera con velocidad por auto`

## Hecho cuando
Se puede correr una carrera en cualquiera de las 4 rutas, cambiar la velocidad de cada auto en plena carrera y obtener la clasificación con los tiempos de llegada.
