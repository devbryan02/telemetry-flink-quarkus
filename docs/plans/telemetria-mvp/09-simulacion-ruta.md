# 09 · Simulación de 3 autos por la Av. Brasil

**Objetivo:** que el backend simule autos que recorren una ruta real de Lima y que se pueda iniciar y detener por REST.
**Depende de:** 04, 07 · **Spec:** §5, §7

## Alcance
- **Incluye:**
  - feature `simulacion` en Quarkus;
  - geometría real de la Av. Brasil;
  - escenario con 3 autos (2 de Empresa 01 · Flota 1 y 1 de Empresa 02 · Flota 1);
  - publicación en `telemetria`;
  - endpoints de control y de la ruta.
- **No incluye:** varios escenarios a la vez ni un editor de rutas.

## Tareas
- [x] Ruta de OpenStreetMap (Overpass): 65 tramos `highway=primary` de "Avenida Brasil" unidos en las calzadas `ida` y `vuelta` (~5,2 km cada una), guardadas en `resources/rutas/av-brasil.geojson`.
- [x] Escenario `resources/escenarios/av-brasil.json` con `carId`, empresa, flota, posición inicial, calzada y velocidad.
- [x] `Ruta`: polilínea con distancias acumuladas; posición y rumbo a una distancia dada.
- [x] `AutoSimulado`: avanza a su velocidad (±3 km/h), da media vuelta al final de cada calzada, para en semáforos (cada 500 m) y a veces apaga el motor.
- [x] `Simulador`: temporizador de Vert.x de 1 s que publica un evento por auto en `telemetria` (canal `telemetria-out`, key `carId`). Arranca detenido; iniciar y detener son idempotentes.
- [x] REST: `POST /simulacion/iniciar`, `POST /simulacion/detener`, `GET /simulacion` y `GET /rutas/{nombre}` (404 `RUTA_NO_ENCONTRADA`).
- [x] Tests de `Ruta`, `AutoSimulado` y del recurso, con el canal Kafka en memoria.

## Archivos
`telemetry-api/src/main/java/dev/bryan/simulacion/*` · `src/main/resources/{rutas,escenarios}/*` · `src/test/java/dev/bryan/simulacion/*` · `application.properties`

## Verificación
```bash
cd telemetry-api && ./mvnw test
curl -s -X POST localhost:8080/simulacion/iniciar     # {"enCurso":true,"autos":3,...}
curl -s localhost:8080/autos                          # 3 autos sobre la Av. Brasil; repetir: avanzan
curl -s -X POST localhost:8080/simulacion/detener     # deja de publicar
```

## Rama y commit
`feature/inc-13-simulacion-ruta` · `feat(simulacion): simula 3 autos por la Av. Brasil desde el backend`

## Hecho cuando
Los 3 autos circulan por sus calzadas con rumbo coherente, se pueden iniciar y detener por REST y los tests pasan.
