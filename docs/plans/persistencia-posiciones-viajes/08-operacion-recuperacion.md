# 08 · Operación, recuperación y validación integral — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Demostrar recuperación real y dejar señales operativas y documentación de la migración.

**Architecture:** Readiness combina datasource y canales; Micrometer expone señales de ingesta. Un stack E2E separado valida Kafka, PostgreSQL y la aplicación empaquetada.

**Tech Stack:** Java 17, Quarkus 3.40.1, JDBC PostgreSQL 17, Flyway; Kafka y Flink 2.2.1 existentes.

**Spec:** [persistencia-posiciones-viajes.md](../../specs/persistencia-posiciones-viajes.md).

**Depende de:** 02–07.

## Global Constraints

- Aplican las [reglas comunes y contratos](README.md); leerlos antes de ejecutar.
- «Una carrera agrupa los viajes de los autos que salen juntos por una ruta».
- «Los consumidores JDBC ejecutan el trabajo fuera del event loop, por lotes ordenados».
- «No se borra historial automáticamente en esta primera versión».

## Review Focus

- Readiness DOWN no equivale a reinicio automático: RecuperacionTest y guía operativa.
- Reentrega después de commit no duplica historial: PersistenciaRecuperacionTest.
- Historial consume atrasados aunque Flink los descarte: PersistenciaRecuperacionTest.
- Reinicio conserva consultas sin carrera nueva: PersistenciaRecuperacionTest.
- Pruebas E2E no borran datos del entorno del usuario: revisar compose y scripts.

---

### Task 1: Salud y señales operativas

**Files:** modificar `telemetry-api/pom.xml`, application.properties, docker-compose.yml y consumers de autos/viajes; crear `telemetry-api/src/main/java/dev/bryan/viajes/ViajesMetricas.java` y `EventoViajeFailureHandler.java`; crear tests `telemetry-api/src/test/java/dev/bryan/viajes/{ViajesMetricasTest,RecuperacionTest}.java`.

**Interfaces:** /q/health/ready y /q/metrics; `ViajesMetricas.registrar(ResultadoIngesta): void`, `invalido(): void`, `falloPersistencia(): void`. Contadores viajes.eventos.insertados/duplicados/legados/invalidos y viajes.persistencia.fallos; equivalente autos.persistencia.fallos. No etiquetas por vehículo/evento/viaje. EventoViajeFailureHandler implementa DeserializationFailureHandler<EventoViaje>, se selecciona mediante @Identifier y configuración del canal; incrementa inválidos y propaga el error, sin devolver null como recuperación.

- [ ] **Step 1: Tests rojos.** ViajesMetricasTest comprueba incrementos exactos tras commit y ausencia de incrementos insertados cuando revierte el lote. RecuperacionTest comprueba readiness 503 ante conexión fallida y canal que recibe nack; error HTTP 500 no expone JDBC URL, SQL ni password. Un SIN_CIERRE normal no cambia readiness.
- [ ] **Step 2: Ejecutar** `.\mvnw.cmd test "-Dtest=ViajesMetricasTest,RecuperacionTest"`. Esperado: FAIL por salud/métricas ausentes.
- [ ] **Step 3: Implementar.** Agregar quarkus-smallrye-health y quarkus-micrometer-registry-prometheus del BOM. Usar health de datasource y Kafka, sin falsear UP para canales fallidos. Activar métrica de lag nativa del cliente Kafka con Micrometer y verificar que expone lag por grupo/topic/partición; conservar un comando kafka-consumer-groups de respaldo documentado. Registrar conteo de SIN_CIERRE mediante consulta de diagnóstico, sin medirlo en cada mensaje ni inferir alarma por un viaje abierto. Errores clasificados y logs con eventId/viajeId cuando disponibles; no imprimir payloads ni credenciales. API healthcheck Compose consulta /q/health/ready en lugar de /rutas.
- [ ] **Step 4: Verificar.** Tests focales y suite Maven: PASS, endpoints de salud y métricas responden con contratos esperados.
- [ ] **Step 5: Commit.** `feat(operacion): exponer salud y metricas de persistencia`, solo archivos de esta tarea; actualizar Graphify.

### Task 2: Escenarios reales y documentación de activación

**Files:** crear `scripts/probar-persistencia.ps1`, `telemetry-api/src/test/resources/compose-persistencia.yml` y `docs/test-cases/persistencia-posiciones-viajes.md`; actualizar README.md, CLAUDE.md, docs/specs/telemetria.md, knowledge/README.md y documentación C4 afectada. Crear nuevo ADR de persistencia con el siguiente número libre, sin editar ADRs aceptados.

**Interfaces:** `scripts/probar-persistencia.ps1` termina en exit 0 solo si todos los casos de PersistenciaRecuperacionTest pasan. Ese nombre identifica el conjunto de casos E2E documentado, no un test Java que sustituya Kafka por memoria. Variables y credenciales son exclusivas del stack E2E.

- [ ] **Step 1: Definir escenarios de aceptación.** Script y casos documentados deben afirmar: tres viajes por carrera; nueva carrera con identidades nuevas; FIN apropiado al detener/reemplazar; evento 3000 seguido de 2000 queda actual=3000 e historial con ambos; repetir JSON con igual eventId no aumenta filas; evento conflictivo falla el canal sin sobrescribir; después de recuperar y reiniciar, los offsets pendientes se reprocesan. Verificar offsets con kafka-consumer-groups y contenido con psql del contenedor de prueba. Comparar respuestas de GET /autos y /viajes antes/después de reiniciar API y PostgreSQL sin carrera nueva. Si el fallo de canal afecta a toda la API, no exigir que la otra feature continúe en ese mismo proceso.
- [ ] **Step 2: Ejecutar escenarios.** `powershell -NoProfile -File scripts/probar-persistencia.ps1`. Esperado: PASS cuando los incrementos previos satisfacen el comportamiento; una aserción funcional fallida debe reproducirse antes de corregir el código correspondiente. Este cierre integral no exige fabricar un fallo en funciones ya implementadas.
- [ ] **Step 3: Completar arnés y runbook.** Compose E2E propio con proyecto de nombre aleatorio, sin container_name, imagen API construida desde el repo, Kafka 4.2.1 y PostgreSQL 17, topics creados solo en su broker; API publica puerto aleatorio. No usar InMemoryKafkaResource, Kafka de desarrollo ni volúmenes existentes. Consultar puertos con docker compose port. Para inyectar eventos usar kafka-console-producer dentro del broker E2E, preservando key=carId.
  Pruebas de fallo usan detener PostgreSQL, publicar lote, comprobar falta de commit, recuperar PostgreSQL y reiniciar API. Para duplicados, republicar el mismo payload ya confirmado. Conflicto de eventId provoca fallo esperado; reparar únicamente el stack desechable y usar otro grupo de prueba para los escenarios siguientes. Separar escenario de legado antes de activar v2 y comprobar contador de exclusión. Fallar con timeout diagnóstico acotado, no esperas ilimitadas.
  El script captura logs y resultados, y detiene su proyecto en finally. Solo los recursos identificados como creados por esa ejecución son limpiables; jamás usar down -v contra el Compose principal. No probar pérdida por retención esperando una hora: documentarla y verificar retention.ms por Admin CLI.
  Documentar activación 01–04 antes de 05, nuevos grupos y offsets earliest iniciales, exclusión de legado, reinicio manual de canales fallidos, límite de una hora, latest sin checkpoints de Flink, pérdida posible entre commit/WS y ausencia de outbox. No recomendar recrear topics ni borrar BD para migrar.
- [ ] **Step 4: Verificar.** Suite Maven y script E2E: PASS. Validar Compose, enlaces locales y diff. Al final deben quedar solo recursos E2E identificados o eliminados por su propia ejecución, con evidencia guardada fuera de secretos.
- [ ] **Step 5: Commit.** `test(persistencia): validar recuperacion y documentar activacion`, solo arnés/documentación; actualizar Graphify.

**Hecho cuando:** los 12 criterios de spec §9 tienen evidencia automatizada o un límite operativo explícito, sin atribuir garantías nuevas a Flink.
