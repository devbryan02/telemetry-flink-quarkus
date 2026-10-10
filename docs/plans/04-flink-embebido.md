# 04 · Flink embebido en Quarkus

**Objetivo:** job que lee `telemetria`, conserva la última posición por auto y escribe en `ultima-posicion`, ejecutado dentro de la JVM de Quarkus.
**Depende de:** 01, 02 · **Spec:** §8, §9 (dependencias) · **Estándares:** `STD-ARCH-001`

## Alcance
- **Incluye:** dependencias Flink, feature `flink`, arranque/parada con Quarkus, classloaders de Flink, UI `:8081`.
- **No incluye:** checkpoints, clúster Flink, múltiples jobs.

## Tareas
- [ ] Añadir al `pom.xml` `flink-streaming-java`, `flink-clients`, `flink-runtime-web`, `flink-connector-base` (2.2.1) y `flink-connector-kafka` (5.0.0-2.2). Excluir `kafka-clients` del conector si choca con el BOM de Quarkus.
- [ ] `flink/UltimaPosicionFunction`: `KeyedProcessFunction` con `ValueState<Long>`; emite solo si `ts` es mayor al guardado. Sin CDI dentro.
- [ ] `flink/UltimaPosicionJob`: `KafkaSource` (grupo `flink-ultima-pos`, offsets `latest`) → `keyBy(carId)` → función → `KafkaSink` (`ultima-posicion`, key `carId`).
- [ ] `flink/FlinkJobRunner`: `@Observes StartupEvent` con `createLocalEnvironmentWithWebUI` (puerto y paralelismo desde `flink.*`) y `executeAsync`; `ShutdownEvent` cancela el job.
- [ ] Propiedades `flink.*` en `application.properties` (spec §9).
- [ ] `pipeline.classpaths` con las clases de la app y orden `parent-first` para que el MiniCluster no use el classloader del sistema (spec §8). Los `--add-opens` solo si aparece `InaccessibleObjectException`.
- [ ] `enable.auto.commit` en el `KafkaSource` para medir el lag de `flink-ultima-pos`.
- [ ] Test unitario de `UltimaPosicionFunction` con un harness de Flink: evento viejo descartado, nuevo emitido.

## Archivos
`telemetry-api/pom.xml` · `.../flink/{FlinkJobRunner,UltimaPosicionJob,UltimaPosicionFunction}.java` · `application.properties` · `README.md` (flags).

## Verificación
```bash
./mvnw test
./mvnw quarkus:dev
curl -s -X POST localhost:8080/simulacion/iniciar
curl -s localhost:8080/autos | jq length          # ≈ 1000
# abrir http://localhost:8081
```
Esperado: la UI de Flink muestra el job en `RUNNING` sin backpressure; `GET /autos` crece hasta 1000; un evento con `ts` antiguo no reemplaza al reciente.

## Rama y commit
`feature/inc-05-flink-embebido` · `feat(flink): agrega job de ultima posicion embebido en Quarkus`

## Hecho cuando
Con la simulación en curso el flujo completo `telemetria → Flink → ultima-posicion → GET /autos` funciona, y al detener Quarkus el job se cancela limpiamente.
