# ADR-007: Persistencia con Hibernate ORM y Panache (patrón repository)

**Estado:** Aceptado · **Fecha:** 2026-11-16 · **Reemplaza:** el punto «Acceso: JDBC con el pool Agroal… Sin ORM» de `ADR-004` (todo lo demás de ADR-004 sigue vigente)

Los adaptadores de salida de persistencia pasan de JDBC escrito a mano a **Hibernate ORM con Panache** (`quarkus-hibernate-orm-panache`), con el **patrón repository** (`PanacheRepositoryBase`), no el active record.

- **Dónde vive:** `infrastructure/out/persistence/{autos,viajes}/`. Las entities y los repositories son detalle del adaptador; `domain` y `application` no los ven (`ADR-006`). Los puertos de salida (`AutosRepositorio`, `ViajesRepositorio`, `ViajesConsultaRepositorio`) no cambian: el adaptador mapea entity ↔ record de `domain`.
- **Esquema:** lo sigue creando Flyway (`ADR-004`). Hibernate **valida** (`quarkus.hibernate-orm.schema-management.strategy=validate`): la API no arranca si una entity no coincide con las tablas. Nunca genera ni modifica el esquema.
- **Nomenclatura (`ADR-002`):** cada entity declara `@Table(name = "tb_...")`; ahora esa regla sí aplica. Las tablas siguen siendo de cada feature: `autos` usa `tb_ultima_posicion`; `viajes` usa `tb_viaje` y `tb_posicion_historial`.
- **SQL que se conserva nativo** (vía `EntityManager`), porque HQL no lo expresa o perdería garantías:
  - el upsert de `tb_ultima_posicion` con `ON CONFLICT … WHERE excluded.ts > …` y `RETURNING` (solo gana el `ts` mayor, de forma atómica);
  - `INSERT … ON CONFLICT DO NOTHING` de viajes y muestras (idempotencia por `eventId`, con detección de duplicado por filas afectadas);
  - `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY` como primera sentencia del detalle de un viaje: la configuración vale solo para esa transacción y no se filtra al pool.
- **Con Panache/HQL:** lecturas de `autos`, bloqueo del viaje (`LockModeType.PESSIMISTIC_WRITE`, equivale a `FOR UPDATE`), actualización del viaje por entity, y las consultas paginadas de viajes y muestras (proyección directa a los records de `domain`, sin cargar entities).
- **Transacciones:** `@Transactional` en el adaptador. El commit ocurre al salir del método, antes de que el consumidor confirme el offset (`POST_PROCESSING`), igual que antes.
- **Errores:** las excepciones de persistencia se traducen en el adaptador a las mismas `IllegalStateException` con los mismos mensajes (solo `eventId`/`viajeId`, sin SQL ni credenciales). Los servicios, las métricas y `STD-ERR-001` no cambian.
- **Las entities son clases escritas a mano** (Hibernate no admite `record` como entity), sin Lombok. Los DTOs de `domain` siguen siendo `record`.

Costes que se aceptan:

- Más dependencias (Hibernate, JTA) y más tiempo de arranque que con JDBC puro.
- Una entity gestionada queda obsoleta frente a SQL nativo en la misma transacción: la ingesta de viajes hace `flush` y `clear` del contexto antes de bloquear cada viaje.
- Parte del SQL sigue siendo nativo; Panache no lo elimina, solo lo reduce.
