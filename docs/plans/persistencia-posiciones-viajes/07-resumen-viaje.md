# 07 · Detalle y resumen observado del viaje — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exponer detalle con métricas reproducibles sobre todas las muestras confirmadas.

**Architecture:** Un cálculo de la feature viajes recorre muestras ordenadas desde JDBC sin cargar el historial completo. El detalle usa una transacción de lectura con snapshot consistente.

**Tech Stack:** Java 17, Quarkus 3.40.1, JDBC PostgreSQL 17, Flyway; Kafka y Flink 2.2.1 existentes.

**Spec:** [persistencia-posiciones-viajes.md](../../specs/persistencia-posiciones-viajes.md).

**Depende de:** 06.

## Global Constraints

- Aplican las [reglas comunes y contratos](README.md); leerlos antes de ejecutar.
- «Una carrera agrupa los viajes de los autos que salen juntos por una ruta».
- «Los consumidores JDBC ejecutan el trabajo fuera del event loop, por lotes ordenados».
- «No se borra historial automáticamente en esta primera versión».

## Review Focus

- UUID con bit alto mantiene el mismo desempate que PostgreSQL: ResumenViajeTest.
- Una sola muestra no divide por cero: ResumenViajeTest.
- Dos timestamps iguales cuentan dos muestras pero un punto: ResumenViajeTest.
- FIN no congela el resumen ante tardíos: ViajeDetalleTest.
- Metadatos y resumen pertenecen a la misma lectura consistente: ViajeDetalleTest.

---

### Task 1: Cálculo y endpoint de detalle

**Files:** crear `telemetry-api/src/main/java/dev/bryan/viajes/{ResumenViaje,ResumenViajeCalculador,ViajeDetalle}.java`; modificar ViajesConsulta y ViajesResource; tests `telemetry-api/src/test/java/dev/bryan/viajes/{ResumenViajeTest,ViajeDetalleTest}.java`.

**Interfaces:** `ResumenViaje(long cantidadMuestras,long ultimoTs,long duracionObservadaMs,Long duracionViajeMs,double distanciaObservadaM,Double velocidadMediaObservadaKmh,long maxIntervaloMuestrasMs)`; `ViajeDetalle(ViajeVista viaje,ResumenViaje resumen)`; `ViajesConsulta.detalle(UUID): ViajeDetalle`. Endpoint GET /viajes/{viajeId}. `ResumenViajeCalculador.calcular(ViajeVista,Iterator<PosicionVista>): ResumenViaje` consume posiciones ordenadas por SQL y no conserva el conjunto completo.

- [ ] **Step 1: Tests rojos.** Crear fixtures locales de ViajeVista y PosicionVista según README. Caso A=(0°,0°,1000), B=(0°,1°,2000) con radio 6371000:
  ```java
  assertEquals(111194.9266, resumen.distanciaObservadaM(), 0.01);
  assertEquals(400301.7359, resumen.velocidadMediaObservadaKmh(), 0.1);
  assertEquals(1000L, resumen.duracionObservadaMs());
  ```
  El valor alto es deliberado para probar fórmula, no velocidad física. Una muestra: distancia/duración/maxIntervalo=0 y velocidad null. Dos muestras mismo ts cuentan 2, seleccionan menor UUID canónico y no crean duración. SIN_CIERRE devuelve duracionViajeMs null; FIN=4000/inicio=1000 devuelve 3000 aunque la última muestra recibida llegue tarde. Insertar tardío que cambie geometría: recalcular, sin usar caché ni primera página. Probar antimeridiano, coordenadas idénticas, pares casi antípodas, UUID que comienza con f frente a 0 y huecos largos.
  ViajeDetalleTest prueba 404, campos del detalle y snapshot: otra conexión confirma una muestra entre lecturas internas; la respuesta no debe mezclar metadatos antiguos con agregado nuevo.
- [ ] **Step 2: Ejecutar** `.\mvnw.cmd test "-Dtest=ResumenViajeTest,ViajeDetalleTest"`. Esperado: FAIL por cálculo/endpoint inexistentes.
- [ ] **Step 3: Implementar.** Un solo punto por timestamp para distancia/velocidad, el primero del orden SQL; contar todos los eventos distintos. Haversine con resultado intermedio acotado a [0,1]; sumar metros, dividir por duracionObservadaMs y multiplicar por 3600 para km/h. No redondear internamente ni interpretar OFF como parada/cierre.
  detalle abre conexión con transacción read-only REPEATABLE READ; lee ViajeVista y recorre ResultSet ordenado (fetchSize=1000) en el mismo snapshot. Manejar cierre de recursos y rollback de lectura ante error. No calcular un resumen por cada item del listado. Sin muestras por corrupción de datos, fallar con error interno en vez de fabricar un resultado válido; todo viaje normal se crea junto con su primera muestra.
- [ ] **Step 4: Verificar.** Tests focales y suite Maven: PASS; comparación numérica con tolerancias declaradas. Actualizar documentación del endpoint para aclarar aproximación, huecos y mutabilidad por tardíos.
- [ ] **Step 5: Commit.** Solo cálculo, recurso, tests y documentación afectada: `feat(viajes): exponer resumen observado y detalle consistente`; actualizar Graphify.

**Hecho cuando:** el detalle calcula el recorrido completo con memoria acotada y conserva diferencias entre duración observada y duración del viaje.
