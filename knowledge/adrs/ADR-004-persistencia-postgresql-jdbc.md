# ADR-004: Persistencia de posiciones y viajes en PostgreSQL con JDBC

**Estado:** Aceptado · **Fecha:** 2026-10-15 · **Detalle:** `docs/specs/persistencia-posiciones-viajes.md` · **Reemplaza:** el punto «Persistencia: ninguna» de `ADR-003`

La última posición de cada auto y el historial de viajes se guardan en PostgreSQL:

- **Base de datos:** PostgreSQL 17 (imagen `postgres:17`) en Docker Compose, con volumen `postgres-datos` y credenciales por variables de entorno (`.env`, ver `.env.example`).
- **Acceso:** JDBC con el pool Agroal de Quarkus (`quarkus-jdbc-postgresql`). **Sin ORM**, sin Redis ni PostGIS.
- **Esquema:** versionado con Flyway (`db/migration/V<n>__*.sql`, `migrate-at-start`, `clean` deshabilitado). Las migraciones aplicadas no se editan: un cambio es una migración nueva.
- **Tablas:** cada feature es dueña de las suyas. `autos` usa `tb_ultima_posicion`; `viajes` usa `tb_viaje` y `tb_posicion_historial`. Aplica la nomenclatura de `ADR-002` (`tb_` y `snake_case`); su regla de `@Table(name)` no aplica porque no hay entities.
- **Ingesta:** dos consumidores Kafka independientes, `@Blocking` y por lotes, que confirman offsets solo después del commit JDBC (`POST_PROCESSING`, `enable.auto.commit=false`, `commit-strategy=throttled`, `failure-strategy=fail`):
  - `quarkus-dash-postgres` lee `ultima-posicion` y hace upsert solo si `ts` es mayor;
  - `quarkus-viajes-postgres` lee `telemetria` directamente, para conservar también las muestras atrasadas que Flink descarta. `eventId` hace idempotente la reentrega.
- **Fallos:** un error de BD o un evento inválido detiene el canal y pone la readiness (`/q/health/ready`) en DOWN. No se reinicia solo: se corrige la causa y se reinicia la API para retomar los offsets pendientes.
- **Contrato de eventos v2:** `telemetria` agrega `schemaVersion`, `eventId`, `carreraId`, `viajeId`, `rutaId`, `inicioViajeTs`, `tipoEvento` y `motivoFin`. Los eventos legados (sin versión o con versión 1) alimentan la última posición, pero no crean viajes.

Límites que se aceptan:

- No hay transacción conjunta entre Kafka, última posición e historial, ni outbox: las dos proyecciones son eventualmente consistentes.
- El WebSocket no es durable: un cambio confirmado puede no difundirse si la API cae entre el commit y el envío. El cliente se recupera con `GET /autos`.
- `telemetria` retiene una hora. Una parada del consumidor de historial más larga pierde muestras.
- Flink sigue arrancando en `latest` y sin checkpoints. Su recuperación no mejora con esta decisión.
- Una sola instancia de la API. No hay borrado automático del historial.
