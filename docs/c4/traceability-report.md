---
okf_version: 0.2
generated: 2026-10-15
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../specs/telemetria.md
  - ../specs/persistencia-posiciones-viajes.md
  - ../../telemetry-api/src/main/java/dev/bryan/
  - ../../telemetry-api/src/test/java/dev/bryan/
  - ../../scripts/probar-persistencia.ps1
  - ../../dashboard-next/features/autos/
c4_level: Code
focus_id: telemetry-api.simulacion.Simulador
focus_name: Simulador
focus_kind: code
focus_highlight: dark-red-700-border
component_path: .
---

# Reporte de trazabilidad

Del requisito (spec v3.1 y spec de persistencia) al código, a las pruebas y a la vista C4 que lo muestra. El foco de las vistas sigue la regla del pack (borde dark red 700). Este reporte no tiene diagramas.

## Criterios de aceptación (spec §13)

| # | Criterio | Código | Pruebas | Vistas |
|---|---|---|---|---|
| 1 | El selector ofrece las 4 rutas y dibuja la elegida con Salida y Meta | `RutasResource`, `CatalogoRutas`, `carrera-panel.tsx`, `ruta-layer.tsx`, `salida-meta.tsx` | `SimulacionResourceTest` | [get-rutas](sequences/get-rutas.md), [get-rutas-id](sequences/get-rutas-id.md) |
| 2 | Salida conjunta en un solo sentido, llegada con tiempo y fin de carrera | `Simulador.iniciar/avanzar`, `AutoCorredor.avanzar` | `AutoCorredorTest`, `SimulacionResourceTest` | [post-simulacion-iniciar](sequences/post-simulacion-iniciar.md), J1 en [sequence-e2e](sequence-e2e.md) |
| 3 | Clasificación en vivo; el slider cambia el ritmo y el orden | `Simulador.estado/velocidad`, `ordenDeCarrera`, `carrera-panel.tsx` | `SimulacionResourceTest` | [get-simulacion](sequences/get-simulacion.md), [put-…-velocidad](sequences/put-simulacion-autos-carid-velocidad.md) |
| 4 | "Seguir al líder" mantiene en pantalla al primero | `autos-map.tsx` (efecto `seguirLider`, `Animador.posicionDe`) | Verificación manual con Edge headless (plan 12) | [component.md](component.md) · detalle dashboard |
| 5 | Filtro empresa → flota (Empresa 01: 2, Empresa 02: 1, todas: 3) | `filtros.ts`, `autos-layer.tsx` (`setFilter`) | Verificación manual (plan 10) | [component.md](component.md) · detalle dashboard |
| 6 | Latencia extremo a extremo p95 < 2 s | `AutosConsumer` por lotes (`@Blocking`, JDBC en un hilo worker), `AutosCambios`, `AutosBroadcaster` 500 ms, `metricas.ts` | Medición en el panel (0,1–0,6 s observados antes de la persistencia; **no se volvió a medir con PostgreSQL**) | [ws-autos](sequences/ws-autos.md), J1 |
| 7 | Un evento con `ts` antiguo no reemplaza a uno más reciente | `UltimaPosicionFunction`, `AutosStore.guardarLote` (upsert `WHERE excluded.ts > tb_ultima_posicion.ts`), `AutosCambios.registrar`, `fusionar` en `autos-map.tsx` | `UltimaPosicionJobTest`, `AutosStoreTest`, `AutosCambiosTest` | [component.md](component.md) · flink y autos |

## Criterios de aceptación de la persistencia (spec de persistencia §9)

La prueba E2E [`scripts/probar-persistencia.ps1`](../../scripts/probar-persistencia.ps1) levanta Kafka, PostgreSQL y la API reales en un proyecto Compose aislado (`telemetry-api/src/test/resources/compose-persistencia.yml`) y cubre los escenarios marcados con «E2E».

| # | Criterio | Código | Pruebas | Vistas |
|---|---|---|---|---|
| 1 | Tres viajes con un mismo `carreraId`; otra carrera crea identidades nuevas | `Simulador.iniciar`, `AutoCorredor.viajeId`, `ViajesStore` | `SimuladorViajesTest`, E2E «nueva identidad» | J3 en [sequence-e2e](sequence-e2e.md), [post-simulacion-iniciar](sequences/post-simulacion-iniciar.md) |
| 2 | Una sola última posición por auto; una muestra vieja o igual no la reemplaza | `AutosStore.guardarLote` | `AutosStoreTest` | [component.md](component.md) · autos, [get-autos](sequences/get-autos.md) |
| 3 | Una muestra atrasada aparece en el historial aunque Flink no la publique | `ViajesConsumer` sobre `telemetria`, `ViajesStore` | `ViajesStoreTest` (`guardaTardiosYReentregaSinDuplicar`) | J3, [get-viajes-viajeid-posiciones](sequences/get-viajes-viajeid-posiciones.md) |
| 4 | Reentregar no duplica; un conflicto de identidad se hace visible | `ViajesStore` (`ON CONFLICT(event_id)`, comparación del contenido, `conflicto`) | `ViajesStoreTest`, `RecuperacionTest`, E2E «sin duplicados», «receivedAt estable», «conflicto no sobrescribe» | J3 |
| 5 | Llegada, detención y reemplazo producen cierres distintos | `Simulador.avanzar/detener/iniciar` (`FIN` con `META`, `DETENIDO`, `REEMPLAZADO`), `EstadoViaje` | `SimuladorViajesTest` | [post-simulacion-detener](sequences/post-simulacion-detener.md), [code.md](code.md) · estados |
| 6 | Un inicio atrasado no reabre un viaje cerrado | `ViajesStore` (cierre no se revierte) | `ViajesStoreTest` (`inicioTardioNoReabreCierre`) | J3 |
| 7 | Reiniciar API y PostgreSQL conserva posiciones y viajes | Volumen `postgres-datos`, Flyway, `AutosStore.todos`, `ViajesConsulta` | `MigracionesTest` (`conservaDatosAlMigrarOtraVez`), E2E «historial persiste sin nueva carrera», «ultima posicion persiste» | J2, [container.md](container.md) |
| 8 | Un fallo de persistencia revierte el lote, no confirma offsets ni difunde cambios | `AutosConsumer`/`ViajesConsumer` (`POST_PROCESSING`, `failure-strategy=fail`), rollback en los stores | `AutosStoreTest` (`errorEnSegundaFilaReviertePrimera`), `AutosConsumerTest` (`rollbackNoPublicaCambios`), `ViajesStoreTest`, E2E «sin commit del lote fallido» | J1 y J3 (ramas `alt`) |
| 9 | Filtros, orden, límites y cursores | `ViajesResource`, `ViajesConsulta`, `CursorViajes` | `ViajesResourceTest`, `CursorViajesTest`, E2E «pagina acotada» | [get-viajes](sequences/get-viajes.md), [get-viajes-viajeid-posiciones](sequences/get-viajes-viajeid-posiciones.md) |
| 10 | Cálculos del resumen con casos conocidos | `ResumenViajeCalculador` | `ResumenViajeTest`, `ViajeDetalleTest` | [get-viajes-viajeid](sequences/get-viajes-viajeid.md) |
| 11 | REST de autos, `bbox`, errores y WebSocket conservan su comportamiento; JDBC fuera del event loop | `@Blocking` en `AutosResource`, `ViajesResource` y consumidores; `Auto` público de 9 campos | `AutosResourceTest`, `BboxTest`, `AutosWsTest`, `ContratoV2Test`, `RecuperacionTest` (`errorInternoNoExponeDetallesDeBd`) | [get-autos](sequences/get-autos.md), [ws-autos](sequences/ws-autos.md) |
| 12 | Legados sin viajes falsos; contrato v2 de extremo a extremo; grupos independientes | `EventoJson` (en `autos`, `flink` y `viajes`), `ViajesStore` (legados), grupos `quarkus-dash-postgres` y `quarkus-viajes-postgres` | `ContratoV2Test`, `PosicionV2Test`, `ViajesConsumerTest`, `ViajesMetricasTest`, E2E «legado sin viajes falsos» | [component.md](component.md) · autos, flink y viajes |

## Requisitos funcionales

| Requisito | Código | Pruebas | Vistas |
|---|---|---|---|
| RF-S1 a RF-S6 (carrera) | `simulacion/*` | `AutoCorredorTest`, `RutaTest`, `SimulacionResourceTest`, `SimuladorViajesTest` | [code.md](code.md), secuencias `/simulacion` |
| Contrato v2 y publicación (spec de persistencia §4) | `TelemetriaEvento`, `RelojEventos`, `PublicadorTelemetria` | `RelojEventosTest`, `PublicadorTelemetriaTest` (`nackSePropagaYNoSeFingeEntrega`), `SimuladorViajesTest` | [code.md](code.md), [post-simulacion-iniciar](sequences/post-simulacion-iniciar.md) |
| RF-F0 a RF-F4 (Flink) | `flink/*` | `UltimaPosicionJobTest`, `PosicionJsonTest`, `PosicionV2Test` | [component.md](component.md) · flink, J2 |
| RF-Q1 a RF-Q2 (consumo y store), sustituidos por spec de persistencia §5.1 | `AutosConsumer`, `AutosStore`, `AutosCambios` | `AutosStoreTest`, `AutosConsumerTest`, `AutosCambiosTest`, `ContratoV2Test`, `AutoDeserializerTest` | [component.md](component.md) · autos |
| RF-Q3 (WebSocket por lotes) | `AutosBroadcaster`, `AutosCambios`, `AutosWs` | `AutosWsTest`, `AutosCambiosTest` | [ws-autos](sequences/ws-autos.md) |
| RF-Q4 (`GET /autos` y `bbox`) | `AutosResource`, `AutosStore`, `Bbox` | `AutosResourceTest`, `BboxTest` | [get-autos](sequences/get-autos.md) |
| RF-Q5 (reconstrucción al arrancar), sustituido por spec de persistencia §8 | Estado en PostgreSQL; el grupo `quarkus-dash-postgres` retoma sus offsets confirmados (sin `seekToBeginning`) | `MigracionesTest`, E2E «ultima posicion persiste» | J2 en [sequence-e2e](sequence-e2e.md) |
| RF-Q6 (errores `STD-ERR-001`) | `shared/error/*`, `ConsultaViajesInvalidaException`, `ViajeNoEncontradoException` | `AutosResourceTest`, `SimulacionResourceTest`, `ViajesResourceTest`, `RecuperacionTest` | Ramas `alt` de cada secuencia |
| Historial y consulta de viajes (spec de persistencia §5.2, §6, §7) | `viajes/*` | `ViajesStoreTest`, `ViajesConsumerTest`, `ViajesResourceTest`, `CursorViajesTest`, `ResumenViajeTest`, `ViajeDetalleTest` | J3, secuencias `/viajes` |
| Operación (spec de persistencia §8): readiness y métricas | `quarkus-smallrye-health`, `ViajesMetricas`, contador `autos.persistencia.fallos`, `quarkus.micrometer.binder.kafka.enabled` | `RecuperacionTest` (`exponeReadinessYMetricasSinFallarPorViajesAbiertos`), `ViajesMetricasTest` | [documentation-review.md](documentation-review.md) · observabilidad |
| Esquema (spec de persistencia §5) | `V1__posiciones_y_viajes.sql` | `MigracionesTest` | [code.md](code.md) · esquema |
| RF-U1 a RF-U12 (dashboard) | `dashboard-next/features/autos/**`, `components/{theme-provider,selector-tema}.tsx` | `npm run lint && npm run build` y verificación con Edge headless (planes 05–13) | [component.md](component.md) · detalle dashboard |

## Requisitos no funcionales

| RNF | Cómo se cumple | Evidencia |
|---|---|---|
| RNF-1 latencia p95 < 2 s | Lotes de 500 ms; consumidor por lotes en un hilo worker (`@Blocking`) con una transacción por lote | Métrica del panel (no medida de nuevo con PostgreSQL) |
| RNF-2 orden por auto | Key `carId` en ambos topics; `keyBy(carId)` en Flink; `PublicadorTelemetria` encadena los envíos de cada auto; `RelojEventos` hace `ts` estrictamente creciente | `UltimaPosicionJob`, `PublicadorTelemetria`, `RelojEventos` |
| RNF-3 movimiento continuo | Interpolación en `animacion.ts` con `requestAnimationFrame` | `autos-map.tsx` |
| RNF-4 100 % local | `docker-compose.yml` (incluye `postgres`) | [container.md](container.md) |
| RNF-5 sin seguridad ni HA | Sin autenticación; CORS limitado a `localhost:3000`; credenciales de PostgreSQL por `.env`; una sola instancia de API | `application.properties`, `docker-compose.yml` |

## Endpoints → secuencias

10 operaciones REST y 1 WebSocket; cobertura del 100 %, detallada en [sequence-e2e.md](sequence-e2e.md#api-rest-una-secuencia-por-endpoint). Origen `INFERRED` (controllers), sin especificación OpenAPI.
