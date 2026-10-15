# 05 · Ciclo de vida de viajes desde el simulador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emitir un viaje identificable por auto y cierres explícitos sin romper las carreras.

**Architecture:** El simulador produce v2 una vez preparados los consumidores. Un publicador observa acknowledgments y un reloj por auto evita timestamps regresivos.

**Tech Stack:** Java 17, Quarkus 3.40.1, JDBC PostgreSQL 17, Flyway; Kafka y Flink 2.2.1 existentes.

**Spec:** [persistencia-posiciones-viajes.md](../../specs/persistencia-posiciones-viajes.md).

**Depende de:** 04.

## Global Constraints

- Aplican las [reglas comunes y contratos](README.md); leerlos antes de ejecutar.
- «Una carrera agrupa los viajes de los autos que salen juntos por una ruta».
- «Los consumidores JDBC ejecutan el trabajo fuera del event loop, por lotes ordenados».
- «No se borra historial automáticamente en esta primera versión».

## Review Focus

- Tres viajes distintos comparten una carrera: SimuladorViajesTest.
- Detener/reemplazar no vuelve a cerrar autos que llegaron: SimuladorViajesTest.
- Reemplazar con ruta inválida conserva la carrera actual: SimuladorViajesTest.
- Publicación fallida conserva eventId y registra fallo: PublicadorTelemetriaTest.
- Reloj igual o regresivo no elimina la posición final: RelojEventosTest.

---

### Task 1: Identidades, eventos y confirmaciones de publicación

**Files:** modificar `telemetry-api/src/main/java/dev/bryan/simulacion/{Simulador,AutoCorredor,TelemetriaEvento}.java`; crear `PublicadorTelemetria.java` y `RelojEventos.java` en ese paquete; tests `telemetry-api/src/test/java/dev/bryan/simulacion/{SimuladorViajesTest,PublicadorTelemetriaTest,RelojEventosTest}.java`; adaptar SimulacionResourceTest y AutoCorredorTest.

**Interfaces:** TelemetriaEvento incorpora el sufijo del README; `PublicadorTelemetria.publicar(TelemetriaEvento): CompletionStage<Void>`; `RelojEventos(Clock)`, `siguiente(String carId): long`. Estado de simulación agrega UUID carreraId y cada Clasificado agrega UUID viajeId (null antes de la primera carrera). AutoCorredor conserva una identidad de viaje durante su vida y sigue calculando la posición como hoy.

- [ ] **Step 1: Tests rojos.** SimuladorViajesTest usa canales en memoria y parsing JSON, sin llamar features autos/viajes. Asertar `assertEquals(3, viajesDistintos.size())`, `assertEquals(1, carrerasDistintas.size())`, tres INICIO y nueve campos actuales presentes. Repetir carrera: nuevos UUID. Probar META por auto una sola vez, DETENIDO solo en abiertos, REEMPLAZADO antes de nuevos INICIO, y llegada previa sin segundo FIN. Iniciar una ruta inexistente no debe publicar cierres. Extraer avance a un método package-private invocable en tests para comprobar llegada sin esperar 38 s.
  PublicadorTelemetriaTest obtiene el ack/nack del mensaje con InMemorySink: un nack completa la etapa excepcionalmente, deja evidencia con eventId y no se convierte en ack. RelojEventosTest usa Clock fijo y regresivo: `assertTrue(segundo > primero)`; salida, parada inmediata y nueva salida tienen ts creciente por auto.
- [ ] **Step 2: Ejecutar** `.\mvnw.cmd test "-Dtest=SimuladorViajesTest,PublicadorTelemetriaTest,RelojEventosTest,AutoCorredorTest,SimulacionResourceTest"`. Esperado: FAIL por identidades y eventos ausentes.
- [ ] **Step 3: Implementar.** Validar ruta antes de reemplazar el viaje anterior. Generar carreraId y viajeId al iniciar; construir cada evento con UUID eventId estable, schemaVersion=2, tipo y contexto. Un INICIO usa inicioViajeTs=ts. Cada llegada publica FIN/META en la posición final; detener y reemplazar publican FIN en su ubicación actual y marcan cerrado. La duración analítica usa ts del evento, no el tiempo interpolado de clasificación.
  RelojEventos devuelve max(clock.millis(),ultimo+1) por carId y se conserva entre carreras del proceso. El publicador serializa una sola vez por evento y observa la CompletionStage de Emitter.send; encadena envíos por carId en orden, sin bloquear Vert.x ni sostener un monitor esperando I/O. Los reintentos del productor Kafka reutilizan ese payload; no generar UUID al reintentar. Registrar los fallos terminales con identidades, sin afirmar entrega. La pérdida por caída del proceso continúa siendo posible sin outbox. Apagado ordenado intenta cierre DETENIDO y espera publicaciones pendientes con límite de 5 s fuera del event loop; agotarlo se registra, nunca se inventa confirmación.
- [ ] **Step 4: Verificar.** Tests focales y suite Maven: PASS; REST de simulación conserva los campos existentes y añade identidades. Verificar clasificación y cambios de velocidad existentes.
- [ ] **Step 5: Commit.** Solo simulación y pruebas: `feat(simulacion): emitir viajes y cierres identificados en telemetria`; actualizar Graphify.

**Hecho cuando:** una nueva carrera produce contratos v2 y cada auto tiene a lo sumo un FIN lógico.
