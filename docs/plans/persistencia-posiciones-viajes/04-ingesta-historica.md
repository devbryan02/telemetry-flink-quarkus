# 04 · Ingesta histórica idempotente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir eventos crudos y viajes sin depender del filtro de Flink.

**Architecture:** Una feature viajes consume telemetria en grupo propio. Cada lote guarda muestras y metadatos en una transacción JDBC.

**Tech Stack:** Java 17, Quarkus 3.40.1, JDBC PostgreSQL 17, Flyway; Kafka y Flink 2.2.1 existentes.

**Spec:** [persistencia-posiciones-viajes.md](../../specs/persistencia-posiciones-viajes.md).

**Depende de:** 01, 03.

## Global Constraints

- Aplican las [reglas comunes y contratos](README.md); leerlos antes de ejecutar.
- «Una carrera agrupa los viajes de los autos que salen juntos por una ruta».
- «Los consumidores JDBC ejecutan el trabajo fuera del event loop, por lotes ordenados».
- «No se borra historial automáticamente en esta primera versión».

## Review Focus

- Mismo eventId con contenido diferente no sobrescribe: ViajesStoreTest.
- FIN recibido antes de INICIO no se revierte: ViajesStoreTest.
- FIN anterior a una muestra ya guardada es conflicto: ViajesStoreTest.
- Tardíos se conservan sin consolidar por auto: ViajesStoreTest.
- Legado válido se excluye con resultado explícito: ViajesConsumerTest.

---

### Task 1: Almacenamiento transaccional y consumidor histórico

**Files:** crear `telemetry-api/src/main/java/dev/bryan/viajes/{EventoViaje,EventoViajeDeserializer,EstadoViaje,ResultadoIngesta,ViajesStore,ViajesConsumer}.java`; crear tests `telemetry-api/src/test/java/dev/bryan/viajes/{ViajesStoreTest,ViajesConsumerTest}.java`; modificar application.properties e InMemoryKafkaResource.

**Interfaces:** records y `ViajesStore.guardarLote(List<EventoViaje>): ResultadoIngesta` del README; `ViajesConsumer.recibir(List<EventoViaje>): void`. Canal entrante `historial-telemetria`, topic telemetria, grupo quarkus-viajes-postgres. Se aceptan payloads legados únicamente para excluirlos del historial; el productor todavía es legado.

- [ ] **Step 1: Tests rojos.** En ViajesStoreTest definir fixture local `evento(UUID eventId, UUID viajeId, long inicio, long ts, String tipo, String motivo)`, con contexto y posición válidos constantes. Insertar inicio=1000, posición=3000 y tardío=2000; comprobar conteo 3 y orden SQL 1000/2000/3000. Reentregar el mismo record:
  ```java
  assertEquals(0, repetido.insertados());
  assertEquals(1, repetido.duplicados());
  assertEquals(receivedAtOriginal, receivedAtReleido);
  ```
  Cambiar lat con igual eventId: excepción de integridad y fila original intacta. Probar dos eventId a igual ts (ambos existen), FIN=4000 antes del INICIO (queda FINALIZADO), identidad de auto/carrera/ruta/inicio/empresa/flota contradictoria, cierre distinto, muestra fuera de intervalo y cierre anterior al máximo almacenado. Un lote válido seguido de conflicto debe dejar cero escrituras del lote. Dos conexiones con eventos del mismo viaje deben conservar ambas muestras y estado consistente.
  ViajesConsumerTest prueba legado válido: legados=1, sin tb_viaje; v2 parcial y JSON inválido fallan sin confirmar. Extender fixtures de 03; no depender de modelos internos de autos.
- [ ] **Step 2: Ejecutar** `.\mvnw.cmd test "-Dtest=ViajesStoreTest,ViajesConsumerTest"`. Esperado: FAIL por feature inexistente.
- [ ] **Step 3: Implementar.** Validar contrato del README. Dentro de la transacción, ordenar los viajes por UUID canónico, crear su fila si falta y bloquearla con SELECT FOR UPDATE antes de comprobar el contexto y modificarla. Para eventId existente comparar todos los campos del contrato persistidos, excluyendo receivedAt; solo una igualdad completa es duplicado. Resolver colisiones de PK sin sobrescribir datos de otra transacción. Insertar todas las muestras distintas; actualizar ultimo_ts con máximo. FIN fija fin_ts y motivo, META → FINALIZADO; otros motivos → su estado. Datos previos/posteriores al intervalo explícito o un FIN incompatible revierten el lote; INICIO tardío nunca borra el cierre.
  Consumer recibe el resultado después del commit, registra fallos y contadores mediante logs estructurados hasta incorporar métricas en 08. Configurar canal según README. InMemoryKafkaResource sustituye también historial-telemetria para todos los tests funcionales; no toca los grupos reales.
- [ ] **Step 4: Verificar.** Tests focales y suite Maven: PASS, con PostgreSQL real y sin Kafka externo. Demostrar que el historial contiene la muestra que el test Flink descarta por ts.
- [ ] **Step 5: Commit.** Solo archivos de la feature, configuración y pruebas: `feat(viajes): persistir historial y cierres de forma idempotente`; actualizar Graphify.

**Hecho cuando:** el consumidor está listo para eventos v2 y legado no fabrica viajes.
