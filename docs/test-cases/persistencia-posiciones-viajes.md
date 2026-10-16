# Casos de prueba y operación: últimas posiciones e historial de viajes

**Spec:** [persistencia-posiciones-viajes.md](../specs/persistencia-posiciones-viajes.md) · **Decisión:** [ADR-004](../../knowledge/adrs/ADR-004-persistencia-postgresql-jdbc.md) · **Plan:** [08 · Operación y recuperación](../plans/persistencia-posiciones-viajes/08-operacion-recuperacion.md)

## Cómo se ejecutan

| Nivel | Comando (desde la raíz) | Qué usa |
|---|---|---|
| Unitarios e integración | `cd telemetry-api; .\mvnw.cmd test` | PostgreSQL 17 de Dev Services (Docker) y canales Kafka en memoria. Flink desactivado. |
| E2E (`PersistenciaRecuperacionTest`) | `powershell -NoProfile -File scripts/probar-persistencia.ps1` | Kafka 4.2.1, PostgreSQL 17 y la API empaquetada, en un proyecto Compose propio. |

El E2E crea un proyecto `telemetria-persistencia-e2e-<8 hex>` desde `telemetry-api/src/test/resources/compose-persistencia.yml`:

- no usa `container_name`, la API publica puertos aleatorios en `127.0.0.1` y los topics se crean solo en su broker;
- no toca el Compose principal, sus volúmenes ni sus topics;
- al terminar ejecuta `down --volumes` **solo sobre su propio proyecto**;
- deja logs, offsets y resultado en `telemetry-api/target/<proyecto>/`.

Opciones: `-SkipBuild` reutiliza `target/quarkus-app` y `-KeepStack` conserva el stack para inspeccionarlo. Si se usa `-KeepStack`, el stack se borra a mano con `docker compose -p <proyecto> -f telemetry-api/src/test/resources/compose-persistencia.yml down --volumes`. El script termina con código 0 solo si pasan todos los casos.

## Criterios de aceptación (spec §9) y evidencia

| § | Criterio | Evidencia automatizada |
|---|---|---|
| 1 | Tres viajes por carrera; otra carrera crea identidades nuevas | `SimuladorViajesTest.tresViajesCompartenCarreraYReemplazoCierraAnteriores` · E2E «tres viajes por carrera», «nueva identidad» |
| 2 | Una última posición por auto; una vieja o igual no la reemplaza | `AutosStoreTest.conservaMayorTimestampYConsolidaLote`, `escritoresConcurrentesNoRetroceden` · E2E «tardios en historial sin retroceso actual» |
| 3 | Una muestra atrasada entra al historial aunque Flink no la publique | `ViajesStoreTest.guardaTardiosYReentregaSinDuplicar` · E2E: evento 3000 seguido de 2000 deja la actual en 3000 y el historial con ambos |
| 4 | La reentrega no duplica; un conflicto de identidad se hace visible | `ViajesStoreTest.conflictoDeIdentidadRevierteLoteCompleto`, `RecuperacionTest.conflictoIdentificaEventoYViaje` · E2E «sin duplicados», «receivedAt estable», «conflicto detiene canal», «conflicto no sobrescribe» |
| 5 | Llegada, detención y reemplazo producen cierres distintos | `SimuladorViajesTest.metaCierraCadaAutoSinDuplicarAlDetener`, `rutaInvalidaNoCierraYParadaSoloCierraUnaVez` · E2E «FIN META», «FIN DETENIDO», «FIN REEMPLAZADO» |
| 6 | Un inicio atrasado no reabre; una muestra tardía cambia el resumen | `ViajesStoreTest.inicioTardioNoReabreCierre`, `ViajeDetalleTest.tardioModificaResumenSinReabrirViaje` |
| 7 | Reiniciar API y BD conserva las consultas sin otra carrera | E2E «historial persiste sin nueva carrera», «ultima posicion persiste» · `MigracionesTest.conservaDatosAlMigrarOtraVez` |
| 8 | Un fallo revierte el lote, no confirma offsets ni difunde cambios; la recuperación reprocesa | `AutosConsumerTest.rollbackNoPublicaCambios`, `AutosStoreTest.errorEnSegundaFilaReviertePrimera`, `ViajesMetricasTest` · E2E «readiness DOWN por BD», «sin commit del lote fallido», «canales reiniciados», «reproceso de pendiente» |
| 9 | Filtros, orden, límites y cursores | `ViajesResourceTest.paginaEmpatesSinRepetirYVinculaCursorAFiltros`, `filtraBordesYValidaParametros`, `CursorViajesTest` · E2E «pagina acotada» |
| 10 | Cálculos del resumen | `ResumenViajeTest` (trayecto conocido, una muestra, empates, antimeridiano), `ViajeDetalleTest` |
| 11 | REST de autos, `bbox`, errores y WebSocket sin cambios públicos | `AutosResourceTest`, `BboxTest`, `AutosWsTest`, `ContratoV2Test.preservaContextoSinCambiarRepresentacionPublica`, `RecuperacionTest.errorInternoNoExponeDetallesDeBd` |
| 12 | Los legados no crean viajes; contrato v2 de punta a punta; grupos independientes | `ViajesConsumerTest.legadoSeExcluyeYV2IncompletoNoSeAcepta`, `ContratoV2Test`, `PosicionV2Test` · E2E «source Flink activo», «legado sin viajes falsos» |

Límites que no se prueban esperando el evento real:

- **Retención de una hora:** el E2E verifica `retention.ms=3600000` con `kafka-configs`, sin esperar una hora.
- **Pérdida entre el commit y el WebSocket:** es un límite aceptado (ADR-004). No se fuerza una caída para provocarla.

## Señales operativas

- `GET /q/health/ready`: datasource y canales `ultima-posicion`, `historial-telemetria` y `telemetria-out`. Pasa a 503 si la BD no responde o si un canal se detuvo.
- `GET /q/metrics` (formato Prometheus), sin etiquetas por auto, viaje ni evento:

  | Métrica | Significado |
  |---|---|
  | `viajes_eventos_insertados_total` · `viajes_eventos_duplicados_total` | Muestras nuevas y reentregas ignoradas, contadas tras el commit. |
  | `viajes_eventos_legados_total` | Eventos sin contexto de viaje excluidos del historial. |
  | `viajes_eventos_invalidos_total` | JSON o contrato inválido. El canal se detiene. |
  | `viajes_persistencia_fallos_total` · `autos_persistencia_fallos_total` | Lotes revertidos por error de BD o conflicto. |
  | `viajes_sin_cierre` | Viajes sin `FIN`. Se consulta solo al leer las métricas; un viaje abierto no es por sí solo un fallo. |
  | `kafka_consumer_fetch_manager_records_lag_max{client_id="kafka-consumer-<canal>"}` | Lag del cliente Kafka. |

- Lag por grupo como respaldo:

  ```bash
  docker exec telemetria-kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group quarkus-viajes-postgres
  ```

- Diagnóstico de viajes abiertos:

  ```sql
  SELECT car_id, viaje_id, ultimo_ts FROM tb_viaje WHERE estado = 'SIN_CIERRE' ORDER BY ultimo_ts;
  ```

## Activación sobre un entorno existente

1. **Orden:** desplegar primero los consumidores (incrementos 01–04: PostgreSQL, última posición persistente, contrato v2 compatible e ingesta histórica). Solo después activar el productor v2 (05). Los consumidores aceptan eventos legados y v2.
2. **Grupos nuevos:** `quarkus-dash-postgres` y `quarkus-viajes-postgres`. En su primera ejecución leen desde `earliest`: la última posición se reconstruye desde el topic compactado, y el historial empieza con lo que todavía retenga `telemetria` (una hora).
3. **Legados:** los eventos sin `schemaVersion`, o con versión 1, actualizan la última posición, pero no crean viajes. Se cuentan en `viajes_eventos_legados_total`. No se inventan carreras antiguas.
4. **Prohibido para migrar:** recrear topics (`crear-topics.sh --recrear`) y borrar volúmenes (`docker compose down -v`). Ambos destruyen datos y no hacen falta.

## Recuperación

- **Canal detenido** (readiness DOWN, `*_persistencia_fallos_total` o `viajes_eventos_invalidos_total` en aumento):
  1. Buscar la causa en los logs. Los conflictos indican `eventId` y `viajeId`, sin payload ni credenciales.
  2. Recuperar PostgreSQL, o resolver el evento conflictivo.
  3. Reiniciar la API: `docker compose restart telemetry-api`. La readiness DOWN no reinicia el contenedor por sí sola.
  4. Los offsets no confirmados se reprocesan, y la idempotencia por `eventId` evita duplicados.
- **Evento conflictivo permanente:** reiniciar no basta, porque el canal vuelve a fallar en el mismo offset. Hay que decidir manualmente qué hacer con ese evento. Este alcance no automatiza esa decisión ni incluye una cola de mensajes muertos.
- **Parada mayor a una hora:** el historial pierde lo que `telemetria` ya no retiene. Para garantizar más tiempo de recuperación, hay que ampliar la retención y el disco antes de necesitarlo.
- **Flink:** sigue en `latest` y sin checkpoints. Mientras esté caído, `ultima-posicion` no recibe eventos, aunque el historial sí los guarde. Un JSON inválido en `telemetria` hace fallar el job, que se reinicia con la estrategia `exponential-delay`.
- **Sin outbox:** un apagado abrupto del simulador puede impedir publicar un `INICIO` o un `FIN`. Ese viaje queda `SIN_CIERRE` y no se le inventa un fin.
