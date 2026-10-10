# 03 · Quarkus: consumidor y `GET /autos`

**Objetivo:** backend que mantiene el último estado por auto desde `ultima-posicion` y lo sirve por REST.
**Depende de:** 01 · **Spec:** §9 · **Estándares:** `STD-ARCH-001`, `STD-ERR-001`

## Alcance
- **Incluye:** proyecto Quarkus, feature `autos` (modelo, store, consumidor, REST), manejo de errores, CORS y compresión.
- **No incluye:** WebSocket (04) ni Flink (05). Se prueba publicando a mano en `ultima-posicion`.

## Tareas
- [ ] Proyecto base ya creado en `telemetry-api/` (Quarkus 3.40.1, Java 17, `rest` + `arc`). Añadir las extensiones faltantes de spec §9: `rest-jackson`, `websockets-next`, `messaging-kafka`, `scheduler`; eliminar `GreetingResource` y sus tests.
- [ ] `application.properties` según §9 (Kafka, `auto.offset.reset=earliest`, CORS `http://localhost:3000`, compresión).
- [ ] `autos/Auto` como `record` con el esquema §4.
- [ ] `autos/AutosStore`: `ConcurrentHashMap<String, Auto>` + set concurrente de "sucios"; solo reemplaza si `ts` es mayor.
- [ ] `autos/AutosConsumer`: `@Incoming("ultima-posicion")` que actualiza el store y marca sucio.
- [ ] `autos/AutosResource`: `GET /autos` y filtro opcional `?bbox=minLon,minLat,maxLon,maxLat`; bbox mal formado → 400.
- [ ] `shared/error`: `ComsatelException`, `ErrorResponse`, `GlobalExceptionMapper` (`@ServerExceptionMapper`) con `requestId`.
- [ ] Tests: store (ts viejo no reemplaza), resource (lista y bbox).

## Archivos
`telemetry-api/pom.xml` · `telemetry-api/src/main/resources/application.properties` · `.../autos/{Auto,AutosStore,AutosConsumer,AutosResource}.java` · `.../shared/error/*.java` · tests en `src/test`.

## Verificación
```bash
cd telemetry-api && ./mvnw test
./mvnw quarkus:dev
# publicar 2 eventos del mismo auto con ts distinto en ultima-posicion
curl -s localhost:8080/autos | jq length
curl -si "localhost:8080/autos?bbox=abc"      # 400 sin stack trace
```
Esperado: un registro por `carId`, con el `ts` más reciente; `bbox` inválido → 400 con el contrato de `STD-ERR-001`.

## Rama y commit
`feature/inc-03-quarkus-rest` · `feat(autos): agrega consumidor Kafka y GET /autos`

## Hecho cuando
Los tests pasan y `GET /autos` devuelve exactamente un registro por auto tras reiniciar Quarkus (estado reconstruido desde el topic).
