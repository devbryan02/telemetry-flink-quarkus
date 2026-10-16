# Persistencia de posiciones y viajes: incrementos

**Spec:** [últimas posiciones e historial de viajes](../../specs/persistencia-posiciones-viajes.md). Este índice y la especificación deben leerse antes del incremento elegido. Los ocho incrementos están implementados; la evidencia está en [casos de prueba y operación](../../test-cases/persistencia-posiciones-viajes.md).

## Secuencia y entregables

| # | Plan | Depende de | Entregable verificable |
|---|---|---|---|
| 01 | [PostgreSQL y migraciones](01-postgresql-migraciones.md) | — | Esquema versionado y BD aislada para pruebas |
| 02 | [Última posición persistente](02-ultima-posicion-persistente.md) | 01 | REST desde BD y WebSocket después del commit |
| 03 | [Contrato v2 compatible](03-contrato-eventos-v2.md) | 02 | Flink y autos preservan contexto sin cambiar el JSON público |
| 04 | [Ingesta histórica](04-ingesta-historica.md) | 01, 03 | Eventos crudos y metadatos idempotentes por viaje |
| 05 | [Viajes desde el simulador](05-simulador-viajes.md) | 04 | Un viaje por auto y cierres explícitos |
| 06 | [Consultas paginadas](06-consultas-paginadas.md) | 04 | Listado de viajes y muestras por cursor |
| 07 | [Resumen del viaje](07-resumen-viaje.md) | 06 | Detalle con distancia, duración y velocidad observadas |
| 08 | [Operación y recuperación](08-operacion-recuperacion.md) | 02–07 | Readiness, métricas y evidencia con Kafka y PostgreSQL reales |

Orden recomendado: 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08. Los planes 05 y 06 no comparten cambios de producción. No activar el productor v2 antes de desplegar los consumidores de 03 y 04.

## Reglas comunes y decisiones de implementación

- Conservar Java 17, Quarkus 3.40.1, Flink 2.2.1 y el conector Kafka 5.0.0-2.2. PostgreSQL: imagen `postgres:17`; no actualizar otras versiones.
- JDBC con Agroal y Flyway; sin ORM, Redis, PostGIS, pantalla histórica ni checkpoints nuevos. Cada feature conserva sus modelos y sus tablas.
- Rutas de archivos relativas a la raíz del repositorio. Comandos Maven desde `telemetry-api/`, usando `.\mvnw.cmd` en PowerShell; Docker debe estar disponible para tests de BD.
- Ejecutar primero el test nuevo y observar su fallo funcional (o de compilación por interfaz todavía inexistente); después implementar y repetirlo. Al terminar cada incremento, ejecutar `.\mvnw.cmd test`, con cero fallos, y `git diff --check`.
- Los tests Quarkus usan PostgreSQL Dev Services con imagen `postgres:17`, sin URL de producción ni reutilización de volúmenes. El canal Kafka en memoria sirve solo para tests funcionales; no prueba offsets. Desactivar Flink en esos tests como ya hace el proyecto.
- Trabajar en rama de feature desde `develop`, con los incrementos anteriores disponibles. No cambiar ramas ni incorporar eliminaciones ajenas sin comprobar el estado. Los nombres de commit son por incremento; el ticket real lo determina el flujo del equipo.
- En cada commit incluir solo los archivos del incremento, nunca `git add .`. Actualizar el grafo con `graphify update .` al terminar. No recrear topics ni borrar volúmenes.
- El commit JDBC ocurre dentro de `AutosStore.guardarLote` o `ViajesStore.guardarLote` antes de devolver. El consumidor no tiene una transacción exterior: así el búfer WS recibe únicamente filas confirmadas.
- Los dos canales usan `@Blocking` ordenado, `@Acknowledgment(POST_PROCESSING)`, `enable.auto.commit=false`, `commit-strategy=throttled`, `failure-strategy=fail`, `batch=true` y `auto.offset.reset=earliest`. Grupos: `quarkus-dash-postgres` y `quarkus-viajes-postgres`. Errores no se capturan como éxito.
- Los 9 campos públicos de `Auto` permanecen intactos. Un nuevo record de entrada `autos.AutoEvento` distingue almacenamiento de representación pública.
- En esta versión los cierres y sus posiciones están dentro del intervalo inclusivo `[inicioViajeTs, finTs]`. Los filtros HTTP continúan siendo `[desde,hasta)`. Un cierre con `ts` menor que una muestra ya guardada es conflicto y revierte el lote.
- JSON legado: `schemaVersion` ausente o `1`, sin contexto nuevo. V2: `schemaVersion=2`, todos los campos nuevos obligatorios excepto `motivoFin` fuera de FIN. Versiones distintas y contexto parcial son inválidos.
- Validar carId no vacío, coordenadas finitas y en rango, heading 0–359, battery 0–100, engine ON/OFF, timestamps no negativos; los campos numéricos originales deben existir en el JSON. V2 añade UUID válidos, ruta no vacía, `ts >= inicioViajeTs`, INICIO con `ts=inicioViajeTs` y motivo solo en FIN.
- No hay atomicidad entre las dos proyecciones ni entrega WS durable. Readiness DOWN no reinicia por sí misma Docker: recuperar la causa y reiniciar la API para reabrir canales fallidos.

## Contratos entre incrementos

Los records de entrada tienen los nueve campos originales, en el mismo orden y con sus tipos actuales, seguidos de `Integer schemaVersion, UUID eventId, UUID carreraId, UUID viajeId, String rutaId, Long inicioViajeTs, String tipoEvento, String motivoFin`. Cada feature declara su copia: `autos.AutoEvento`, `flink.Posicion`, `viajes.EventoViaje` y `simulacion.TelemetriaEvento`. No introducir un DTO compartido de producción.

`autos.AutoEvento.auto(): Auto` proyecta los nueve campos. `AutosStore.guardarLote(List<AutoEvento>): List<Auto>` devuelve solo cambios aceptados y confirmados; `todos(): List<Auto>`, `enBbox(Bbox): List<Auto>`, `tamanio(): int` consultan BD. `AutosCambios.registrar(List<Auto>): void` y `drenar(): List<Auto>` operan solo sobre el búfer temporal.

En `viajes/`: `ViajesStore.guardarLote(List<EventoViaje>): ResultadoIngesta`, con record `ResultadoIngesta(int insertados, int duplicados, int legados)`; `EstadoViaje` enum SIN_CIERRE, FINALIZADO, DETENIDO, REEMPLAZADO. El resultado existe solo después del commit.

La API de viajes define `Pagina<T>(List<T> items, String nextCursor)`, `FiltroViajes(String carId, UUID carreraId, Long desde, Long hasta)`, `FiltroPosiciones(Long desde, Long hasta)` y `ConsultaPagina(int limit, String cursor)`. `ViajeVista` contiene UUID viajeId/carreraId, String carId/rutaId/companyId/fleetId, long inicioViajeTs, Long finTs, EstadoViaje estado, String motivoFin, long ultimoTs. `PosicionVista` contiene UUID eventId/viajeId, String tipoEvento, Instant receivedAt y los nueve campos originales de telemetría.

## Mapa de cobertura de la especificación

| Requisitos | Incrementos y prueba principal |
|---|---|
| §9.1, §9.5: identidades, cierre por auto | 05: SimuladorViajesTest |
| §9.2, §9.11: última posición, REST/WS | 02–03: AutosStoreTest, AutosResourceTest, AutosWsTest |
| §9.3–4, §9.6: tardíos, duplicados, integridad | 04: ViajesStoreTest |
| §9.7–8: persistencia y reentrega | 08: PersistenciaRecuperacionTest |
| §9.9: consultas y límites | 06: ViajesResourceTest |
| §9.10: análisis | 07: ResumenViajeTest |
| §9.12: legado y grupos independientes | 03–04, 08: ContratoV2Test, PersistenciaRecuperacionTest |

## Fuentes técnicas consultadas

- [Quarkus 3.40: Kafka](https://quarkus.io/version/3.40/guides/kafka/): confirmaciones, procesamiento bloqueante y estrategia de commit.
- [Quarkus: Flyway](https://quarkus.io/guides/flyway/): extensiones y migraciones.
- [PostgreSQL: INSERT](https://www.postgresql.org/docs/17/sql-insert.html): upsert condicional y RETURNING.

Los planes concretan interfaces y pruebas; no autorizan desplegar ni implementan código de producto.
