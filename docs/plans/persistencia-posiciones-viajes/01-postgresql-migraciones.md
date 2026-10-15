# 01 · PostgreSQL y esquema versionado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disponer de BD persistente y esquema comprobado antes de cambiar los consumidores.

**Architecture:** Compose administra PostgreSQL; Flyway crea las tablas. Los tests usan una BD efímera independiente.

**Tech Stack:** Java 17, Quarkus 3.40.1, JDBC PostgreSQL 17, Flyway; Kafka y Flink 2.2.1 existentes.

**Spec:** [persistencia-posiciones-viajes.md](../../specs/persistencia-posiciones-viajes.md).

**Depende de:** ninguna.

## Global Constraints

- Aplican las [reglas comunes y contratos](README.md); leerlos antes de ejecutar.
- «Una carrera agrupa los viajes de los autos que salen juntos por una ruta».
- «Los consumidores JDBC ejecutan el trabajo fuera del event loop, por lotes ordenados».
- «No se borra historial automáticamente en esta primera versión».

## Review Focus

- Migraciones repetidas no destruyen datos: MigracionesTest.
- Test y aplicación no comparten BD: MigracionesTest.
- FK, claves y nulabilidad rechazan datos inconsistentes: MigracionesTest.

---

### Task 1: Infraestructura y contrato SQL

**Files:** modificar `docker-compose.yml`, `.gitignore`, `telemetry-api/pom.xml`, `telemetry-api/src/main/resources/application.properties`; crear `.env.example`, `telemetry-api/src/main/resources/db/migration/V1__posiciones_y_viajes.sql` y `telemetry-api/src/test/java/dev/bryan/MigracionesTest.java`.

**Interfaces:** consume las tablas de spec §5; produce las tres tablas y el datasource JDBC por defecto. Los consumidores actuales todavía funcionan en memoria.

- [ ] **Step 1: Escribir tests rojos.** Crear `@QuarkusTest MigracionesTest` con Kafka en memoria. En `creaEsquemaYConservaDatosAlMigrarOtraVez`, consultar catálogo SQL: existen las tres tablas, insertar una última posición, ejecutar otra migración con Flyway y comprobar `assertEquals(1, filas)`. En `validaClavesYRelacion`, probar event_id duplicado, viaje inexistente y metadatos obligatorios nulos: `assertThrows(SQLException.class, ...)`. `usaBaseEfimera` verifica que la URL del test no es la del servicio Compose.
- [ ] **Step 2: Ejecutar** `.\mvnw.cmd test "-Dtest=MigracionesTest"`. Esperado: FAIL porque faltan tablas/configuración.
- [ ] **Step 3: Implementar esquema y conexión.** Añadir `quarkus-jdbc-postgresql`, `quarkus-flyway`, `org.flywaydb:flyway-database-postgresql`, con versiones del BOM. Activar migrate-at-start; en test dejar que Dev Services genere conexión, con imagen postgres:17. No permitir Flyway clean automático.
  - `tb_ultima_posicion`: PK car_id text; nueve columnas públicas, company_id/fleet_id nullable; schema_version integer y los otros siete campos del sufijo según README, nullable para legado. Campos numéricos originales NOT NULL.
  - `tb_viaje`: viaje_id UUID PK; carrera_id UUID, car_id/ruta_id text, inicio_viaje_ts/ultimo_ts bigint y estado text NOT NULL; company_id/fleet_id, fin_ts y motivo_fin nullable.
  - `tb_posicion_historial`: event_id UUID PK, viaje_id UUID FK, contexto completo v2, nueve campos originales, received_at timestamptz NOT NULL DEFAULT now(). Añadir checks para estados, intervalo y valores de telemetría definidos en README.
  - Índices `idx_tb_posicion_historial_viaje_ts_event` sobre (viaje_id,ts,event_id), `idx_tb_viaje_auto_inicio` sobre (car_id,inicio_viaje_ts DESC,viaje_id DESC), `idx_tb_viaje_carrera_inicio` sobre (carrera_id,inicio_viaje_ts DESC,viaje_id DESC) e índice global de listado (inicio_viaje_ts DESC,viaje_id DESC).
  - Compose: servicio postgres, volumen postgres-datos, pg_isready, puerto host 5432, API depende de service_healthy. Usar POSTGRES_DB/USER/PASSWORD requeridos desde entorno y QUARKUS_DATASOURCE_JDBC_URL/USERNAME/PASSWORD. `.env.example` contiene valores de ejemplo explícitos; ignorar `.env`. No agregar secretos reales.
- [ ] **Step 4: Verificar.** Repetir MigracionesTest y suite Maven: PASS. `docker compose --env-file .env.example config --quiet`: exit 0; no iniciar servicios ni ejecutar down -v como parte del test.
- [ ] **Step 5: Commit.** Agregar solo archivos listados, revisar staged y crear `feat(db): agregar PostgreSQL y migraciones de posiciones y viajes`. Actualizar Graphify.

**Hecho cuando:** migraciones son repetibles, tests quedan aislados y ninguna API existente cambia.
