# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del repositorio

Por ahora es un repo **solo de especificación**: todavía no hay código. La fuente de verdad es `docs/specs/telemetria.md` (MVP v2.1). El usuario crea a mano los proyectos vacíos de Quarkus y Next.js. Cuando pida un proyecto, dale la lista de dependencias y comandos; no lo generes tú. Documenta en español, igual que la spec.

## Arquitectura (según la spec)

```
Simulador Python ──► Kafka "telemetria" (12 part., retención 1 h, key=carId)
                         │
          ┌──────────────┴─── Quarkus 3.40 LTS · Java 17 (una sola JVM) ───────────┐
          │  Flink 2.2.1 embebido (MiniCluster, UI :8081)                          │
          │     KafkaSource → keyBy(carId) → KeyedProcessFunction(ValueState<ts>)  │
          │     → KafkaSink "ultima-posicion" (compact)                            │
          │  @Incoming ultima-posicion → AutosStore (ConcurrentHashMap + "sucios") │
          │     → GET /autos   ·   @Scheduled 500 ms → WS /ws/autos (lotes)        │
          └────────────────────────────────────────────────────────────────────────┘
                         │
          Next.js 16 + shadcn/ui + mapcn (MapLibre): axios GET inicial + WebSocket nativo
```

Decisiones que no son obvias si no se lee toda la spec:
- **Flink corre dentro del proceso Quarkus, no en un clúster.** `FlinkJobRunner` lo lanza con `env.executeAsync()` en el `StartupEvent` y lo cancela en el `ShutdownEvent`. No existe un proyecto `flink-job` separado.
- **Se mantiene el topic `ultima-posicion`** entre Flink y Quarkus, aunque compartan JVM. Con su log compaction, Quarkus reconstruye el estado al reiniciar. No lo reemplaces por una llamada en memoria.
- **Versiones fijadas por compatibilidad, no por ser las últimas:**
  - Java 17, que es la versión que recomienda Flink 2.x.
  - Flink 2.2.1 con `flink-connector-kafka:5.0.0-2.2`. Flink 2.3 existe, pero el conector no está publicado para esa línea.
- **Flink embebido necesita flags `--add-opens` en la JVM**, tanto en `quarkus:dev` como al ejecutar el jar. La lista está en spec §8.
- **Los operadores de Flink se serializan.** No inyectes beans CDI dentro de ellos ni uses el `ObjectMapper` de Quarkus en ese código.
- **El cuello de botella es el navegador, no Kafka ni Flink.** El backend envía lotes cada 500 ms con solo los autos cambiados. En el frontend:
  - Una sola fuente GeoJSON con capa `circle` en WebGL, nunca un marcador DOM por auto.
  - El estado de los autos vive en `useRef`, fuera del estado de React.
  - Se aplica con un `setData()` por `requestAnimationFrame`.
  - El componente del mapa es `"use client"` y se carga con `dynamic(..., { ssr: false })`.
- El esquema JSON del evento es el mismo en ambos topics, en REST y en WebSocket (spec §4).

## Comandos (previstos en la spec)

```bash
docker compose up -d                                   # Kafka KRaft :9092
kafka-topics.sh --create --topic telemetria --partitions 12 --bootstrap-server localhost:9092 --config retention.ms=3600000
kafka-topics.sh --create --topic ultima-posicion --partitions 12 --bootstrap-server localhost:9092 --config cleanup.policy=compact
cd telemetry-api && ./mvnw quarkus:dev -Djvm.args="--add-opens=java.base/java.lang=ALL-UNNAMED ..."   # :8080 + Flink UI :8081
cd dashboard-next && npm run dev                       # :3000
python simulador/simulador.py --autos 10000 --intervalo 2   # --bench para medir solo generación
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group flink-ultima-pos   # lag (también quarkus-dash)
```

## Base de conocimiento (`knowledge/`)

`knowledge/` es una plantilla corporativa genérica de COMSATEL. El stack de este proyecto está fijado en `ADR-003` (Quarkus + Flink embebido, React/Next.js). Algunas reglas aplican aquí y otras no:
- **Aplican:**
  - `STD-ARCH-001`: organización **por features**, tanto en backend (`autos/`, `flink/`, `shared/`) como en frontend (`features/<x>/` con `index.ts` público). Los DTOs son `record` escritos a mano. El contrato JSON está en la spec §4 y §9.
  - `STD-GIT-001`: Conventional Commits; ramas `feature/<ticket>-<slug>` desde `develop`; sin PR/MR. **Todo cambio se versiona:** se trabaja en una rama de feature, nunca directo en `main` ni en `develop`, y cada tarea termina con su commit.
  - `STD-ERR-001`: contrato de error JSON con `requestId` y sin stack traces. Sus ejemplos ya están en Quarkus (`@ServerExceptionMapper`).
  - Los ADR aceptados son inmutables. Para cambiar una decisión se crea un ADR nuevo.
- **No aplica en v2:** `ADR-002` (nomenclatura de tablas BD), porque el MVP no usa base de datos.
- `ADR-001` pide usar `graphify`, pero `graphify-out/` todavía no existe.
