# 03 · Contrato v2 compatible — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preparar consumidores y Flink para el contexto de viaje manteniendo clientes actuales.

**Architecture:** Cada feature copia el contrato Kafka; AutoEvento incorpora el sufijo v2 y Posicion lo retransmite. El simulador aún publica legado.

**Tech Stack:** Java 17, Quarkus 3.40.1, JDBC PostgreSQL 17, Flyway; Kafka y Flink 2.2.1 existentes.

**Spec:** [persistencia-posiciones-viajes.md](../../specs/persistencia-posiciones-viajes.md).

**Depende de:** 02.

## Global Constraints

- Aplican las [reglas comunes y contratos](README.md); leerlos antes de ejecutar.
- «Una carrera agrupa los viajes de los autos que salen juntos por una ruta».
- «Los consumidores JDBC ejecutan el trabajo fuera del event loop, por lotes ordenados».
- «No se borra historial automáticamente en esta primera versión».

## Review Focus

- V2 incompleto no se clasifica como legado: ContratoV2Test.
- Flink no pierde UUID/contexto al serializar: PosicionJsonTest.
- JSON público no incorpora campos internos: AutosResourceTest.
- Datos no finitos y versión desconocida fallan: AutoDeserializerTest.
- Mensajes antiguos válidos siguen llegando a BD: ContratoV2Test.

---

### Task 1: Compatibilidad de entrada y transporte

**Files:** modificar `telemetry-api/src/main/java/dev/bryan/flink/Posicion.java` y PosicionJson; modificar autos/AutoEvento, AutoEventoDeserializer y AutosStore; crear `telemetry-api/src/test/java/dev/bryan/autos/ContratoV2Test.java`; actualizar PosicionJsonTest, UltimaPosicionJobTest, AutoDeserializerTest y fixtures afectados.

**Interfaces:** AutoEvento y Posicion agregan exactamente el sufijo del README. `AutoEvento.auto(): Auto` no expone contexto. AutosStore persiste columnas contextuales del esquema 01. No hay dependencia Java entre autos y flink.

- [ ] **Step 1: Tests rojos.** Crear una fixture JSON legada y una v2 fija en `telemetry-api/src/test/resources/eventos/` (legacy.json y v2.json), usadas por tests de contrato. PosicionJsonTest, dentro del paquete flink, comprueba deserialización y reserialización sin perder los campos v2. ContratoV2Test, dentro de autos, consume la misma fixture y comprueba `assertEquals(viajeId, salida.viajeId())`, eventId/carreraId, ruta, inicio, tipo y motivo; confirma nueve campos al serializar salida.auto(). Así no se hacen públicos codecs ni modelos internos solo para probarlos; el transporte real completo se verifica en 08. V2 sin eventId y versión 3 deben lanzar excepción; legado válido mantiene contexto null y se persiste. Probar campos numéricos ausentes, NaN/coordenadas fuera de rango y enums inválidos. Conservar tests de filtrado estricto por ts del job.
- [ ] **Step 2: Ejecutar** `.\mvnw.cmd test "-Dtest=ContratoV2Test,PosicionJsonTest,UltimaPosicionJobTest,AutoDeserializerTest"`. Esperado: FAIL por contexto perdido/validación ausente.
- [ ] **Step 3: Implementar.** Aplicar contrato y validación del README antes de crear valores con primitivos, usando inspección del JSON para distinguir número ausente de cero. La validación es local a cada feature; no crear DTO compartido. En Flink sustituir el descarte silencioso de JSON inválido por IOException para que falle el procesamiento y no aparente éxito; conservar reinicio, classloaders y filtro por ts. La readiness de los consumidores PostgreSQL se completa en 08. Posicion sigue siendo record público serializable sin CDI.
- [ ] **Step 4: Verificar.** Tests focales y suite Maven: PASS. Confirmar que no se modificó el comportamiento de posiciones viejas/iguales ni se activó el productor v2.
- [ ] **Step 5: Commit.** Solo modelos, codecs y tests relacionados: `feat(eventos): preservar contexto v2 con compatibilidad legada`; actualizar Graphify.

**Hecho cuando:** un evento v2 puede recorrer Flink y autos sin pérdida de contexto ni cambio del JSON REST/WS.
