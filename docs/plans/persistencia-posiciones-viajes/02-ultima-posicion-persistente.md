# 02 · Última posición persistente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Servir autos desde PostgreSQL y notificar únicamente cambios confirmados.

**Architecture:** AutosStore pasa a JDBC; AutosCambios conserva solo pendientes WS. Se separa la entrada Kafka del record público Auto.

**Tech Stack:** Java 17, Quarkus 3.40.1, JDBC PostgreSQL 17, Flyway; Kafka y Flink 2.2.1 existentes.

**Spec:** [persistencia-posiciones-viajes.md](../../specs/persistencia-posiciones-viajes.md).

**Depende de:** 01.

## Global Constraints

- Aplican las [reglas comunes y contratos](README.md); leerlos antes de ejecutar.
- «Una carrera agrupa los viajes de los autos que salen juntos por una ruta».
- «Los consumidores JDBC ejecutan el trabajo fuera del event loop, por lotes ordenados».
- «No se borra historial automáticamente en esta primera versión».

## Review Focus

- Rollback no deja notificaciones: AutosConsumerTest.
- Concurrencia conserva el mayor ts: AutosStoreTest.
- Drenar mientras se actualiza no pierde la muestra nueva: AutosCambiosTest.
- BDD caída devuelve error sanitizado: AutosResourceTest.
- JSON REST/WS conserva exactamente nueve campos: tests existentes adaptados.

---

### Task 1: Reemplazar almacenamiento y conectar REST/WS

**Files:** crear `telemetry-api/src/main/java/dev/bryan/autos/AutoEvento.java`, `AutosCambios.java` y `AutoEventoDeserializer.java` en el mismo paquete; modificar AutosStore, AutosConsumer, AutosResource, AutosBroadcaster y application.properties; retirar ReconstruirEstadoListener y su configuración. Tests en `telemetry-api/src/test/java/dev/bryan/autos/{AutosStoreTest,AutosCambiosTest,AutosConsumerTest,AutosResourceTest,AutosWsTest}.java`; adaptar AutoDeserializerTest.

**Interfaces:** produce `AutosStore.guardarLote(List<AutoEvento>): List<Auto>`, lecturas y `AutosCambios` del README. Aquí AutoEvento recibe los nueve campos legados; el sufijo v2 se añade en 03. Mantener `Auto` intacto.

- [ ] **Step 1: Tests rojos.** Cambiar AutosStoreTest a Quarkus con PostgreSQL real y limpieza explícita solo de datos del test. Definir fixtures locales `evento(String carId,long ts)`. Asertar:
  ```java
  assertEquals(1, store.guardarLote(List.of(evento("a", 200))).size());
  assertTrue(store.guardarLote(List.of(evento("a", 100), evento("a", 200))).isEmpty());
  assertEquals(200L, store.todos().get(0).ts());
  ```
  Añadir dos escritores concurrentes 100/300 y comprobar ts=300. Tests de consumidor fuerzan SQLException después de una escritura dentro del lote: tabla sin cambios y `cambios.drenar().isEmpty()`. Tests de búfer registran 200 y luego 100: drenar devuelve 200 una vez; actualización concurrente debe aparecer en este drenado o el siguiente. REST prueba bbox inclusivo, SQL parametrizado y error 500 con requestId sin URL ni SQL; WS verifica los nueve campos y silencio ante duplicados.
- [ ] **Step 2: Ejecutar** `.\mvnw.cmd test "-Dtest=AutosStoreTest,AutosCambiosTest,AutosConsumerTest,AutosResourceTest,AutosWsTest"`. Esperado: FAIL por nuevas interfaces/comportamiento.
- [ ] **Step 3: Implementar.** Inyectar AgroalDataSource; guardarLote usa conexión con autoCommit=false, deduplica por carId al mayor ts, ordena claves para bloquear consistentemente, ejecuta upsert `WHERE excluded.ts > tb_ultima_posicion.ts RETURNING ...` y confirma antes de retornar. Ante fallo, rollback y propagación. `todos/enBbox/tamanio` consultan SQL. Reemplazar llamadas a actualizar y eliminar consultas del broadcaster a BD.
  `AutosConsumer.recibir(List<AutoEvento>)` persiste y luego llama a cambios.registrar. Activar configuración común de acknowledgments; grupo quarkus-dash-postgres. REST síncrono JDBC se ejecuta en worker, explícitamente @Blocking. Búfer ConcurrentHashMap solo de pendientes, merge al mayor ts y drenado mediante remove condicional del valor observado. Adaptar fuentes in-memory de tests al nuevo tipo. AutoEventoDeserializer falla ante JSON inválido; no convierte errores en null.
- [ ] **Step 4: Verificar.** Tests focales y suite Maven: PASS, sin mapa de estado completo en producción; cambios solo tras commit. Ejecutar diff check.
- [ ] **Step 5: Commit.** Solo archivos de este incremento: `feat(autos): persistir ultima posicion y emitir cambios confirmados`; actualizar Graphify.

**Hecho cuando:** GET y bbox leen BD y WS no depende de consultas JDBC en su timer.
