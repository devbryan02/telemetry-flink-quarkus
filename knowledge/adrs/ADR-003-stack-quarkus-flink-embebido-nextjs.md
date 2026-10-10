# ADR-003: Stack del MVP de telemetría (Quarkus + Flink embebido, React/Next.js)

**Estado:** Aceptado · **Fecha:** 2026-10-10 · **Detalle:** `docs/specs/telemetria.md` v2.1

El MVP de telemetría usa este stack:

- **Backend:** Java 17 + **Quarkus 3.40 LTS** (Maven). Usa REST (`quarkus-rest`), WebSocket (`quarkus-websockets-next`), Kafka (`quarkus-messaging-kafka`) y `quarkus-scheduler`. **No usa Spring.**
- **Procesamiento:** **Apache Flink 2.2.1 embebido en el proceso Quarkus** (MiniCluster local, UI en `:8081`), con `flink-connector-kafka:5.0.0-2.2`. No hay clúster Flink ni proyecto `flink-job` separado.
- **Mensajería:** Apache Kafka 4.2.1 en Docker (KRaft, un broker, `:9092`; 4.0.x tiene el bug KAFKA-19888), con los topics `telemetria` (retención 1 h) y `ultima-posicion` (compact), 12 particiones cada uno y key `carId`.
- **Frontend:** **React 19 + Next.js 16** (App Router, TypeScript, Tailwind v4) + **shadcn/ui** + **mapcn** (MapLibre GL). Usa **axios** para la carga inicial y `WebSocket` nativo para las actualizaciones.
- **Simulador:** Python.
- **Persistencia:** ninguna en v2. `ADR-002` (nomenclatura de tablas) no aplica a este MVP.

Por qué se fijan estas versiones:

- **Java 17:** es la versión recomendada por Flink 2.x (Java 21 es experimental).
- **Flink 2.2.1 y no 2.3:** el conector Kafka 5.0.0 está publicado solo para la línea 2.2.
