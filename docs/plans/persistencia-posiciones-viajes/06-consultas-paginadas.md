# 06 · Consultas paginadas de viajes y posiciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consultar viajes y recorrer muestras con límites y cursores estables.

**Architecture:** La feature viajes agrega consultas JDBC y recursos REST síncronos en worker. El detalle analítico se añade en 07.

**Tech Stack:** Java 17, Quarkus 3.40.1, JDBC PostgreSQL 17, Flyway; Kafka y Flink 2.2.1 existentes.

**Spec:** [persistencia-posiciones-viajes.md](../../specs/persistencia-posiciones-viajes.md).

**Depende de:** 04.

## Global Constraints

- Aplican las [reglas comunes y contratos](README.md); leerlos antes de ejecutar.
- «Una carrera agrupa los viajes de los autos que salen juntos por una ruta».
- «Los consumidores JDBC ejecutan el trabajo fuera del event loop, por lotes ordenados».
- «No se borra historial automáticamente en esta primera versión».

## Review Focus

- Empates temporales no repiten filas entre páginas: ViajesResourceTest.
- Cursor de otro viaje/filtro/endpoint se rechaza: ViajesResourceTest.
- Filtros desde/hasta respetan intervalo semiabierto: ViajesResourceTest.
- SQL malicioso en carId se trata como valor: ViajesResourceTest.
- Viaje inexistente y página vacía son respuestas distintas: ViajesResourceTest.

---

### Task 1: Listado y muestras con keyset pagination

**Files:** crear en `telemetry-api/src/main/java/dev/bryan/viajes/` los archivos `Pagina.java`, `FiltroViajes.java`, `FiltroPosiciones.java`, `ConsultaPagina.java`, `ViajeVista.java`, `PosicionVista.java`, `CursorViajes.java`, `ViajesConsulta.java`, `ViajesResource.java` y `ConsultaViajesInvalidaException.java`, `ViajeNoEncontradoException.java`; tests `telemetry-api/src/test/java/dev/bryan/viajes/{CursorViajesTest,ViajesResourceTest}.java`.

**Interfaces:** records exactos del README; `ViajesConsulta.listar(FiltroViajes,ConsultaPagina): Pagina<ViajeVista>`, `posiciones(UUID,FiltroPosiciones,ConsultaPagina): Pagina<PosicionVista>`. Recurso: GET /viajes y GET /viajes/{viajeId}/posiciones, JSON camelCase.

- [ ] **Step 1: Tests rojos.** Sembrar eventos a través de ViajesStore; definir fixtures locales con UUID canónicos fijos. Con tres posiciones (1000,id1), (1000,id2), (2000,id3), limit=1 recorrer nextCursor y comprobar `assertEquals(3, ids.size())`, `assertEquals(3, new HashSet<>(ids).size())`, último cursor null. Probar orden descendente en viajes, filtros carId/carreraId, desde inclusivo/hasta exclusivo y desde=hasta devuelve vacío. Parámetros limit=0/1001, UUID mal formado, rango invertido, cursor inválido o reutilizado con otro filtro/viaje/limit dan 400 con requestId. Valores omitidos limit=100, máximo aceptado 1000; viaje inexistente 404, viaje existente sin posiciones en rango devuelve items vacío. Incluir companyId/fleetId nulos y carId con comillas. CursorViajesTest verifica round-trip y validación de versión/tipo.
- [ ] **Step 2: Ejecutar** `.\mvnw.cmd test "-Dtest=CursorViajesTest,ViajesResourceTest"`. Esperado: FAIL con 404 para endpoints nuevos.
- [ ] **Step 3: Implementar.** Consultas parametrizadas con predicados por filtros y claves compuestas; ordenar UUID con orden PostgreSQL (bytes sin signo), consistente con texto canónico minúsculo, no UUID.compareTo de Java. Leer limit+1 para determinar nextCursor y no ejecutar COUNT total. Capturar received_at como Instant.
  Cursor opaco Base64URL de JSON versionado: tipo de consulta, filtros normalizados, viajeId cuando corresponda, limit y última clave (ts/UUID). Validar estructura, tipos, versión=1 y coincidencia completa; no es una autorización ni requiere secreto. Rechazar cursores mayores de 4096 caracteres y long fuera de rango. DTOs exponen solo items/nextCursor, sin contenido interno del cursor.
  Recurso @Blocking usa parámetros de texto para normalizar errores a 400; subclasses ComsatelException con códigos CONSULTA_VIAJES_INVALIDA y VIAJE_NO_ENCONTRADO. No crear otro mapper global. Ausencia de filtros es consulta válida; no permitir respuestas sin límite. Una muestra tardía detrás del cursor requiere reiniciar la consulta y no se promete snapshot de toda la paginación.
- [ ] **Step 4: Verificar.** Tests focales y suite Maven: PASS. Verificar JSON de PosicionVista con eventId/viajeId/tipoEvento/receivedAt y los nueve campos originales, sin excluir empates.
- [ ] **Step 5: Commit.** Solo feature y pruebas: `feat(viajes): consultar viajes y posiciones con cursores`; actualizar Graphify.

**Hecho cuando:** listado y recorrido se consultan de forma acotada; aún no se publica el endpoint de detalle incompleto.
