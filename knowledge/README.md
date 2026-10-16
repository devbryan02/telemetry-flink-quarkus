# knowledge/ — índice de conocimiento del proyecto

Este directorio es la fuente de verdad versionada sobre cómo debe construirse y mantenerse el proyecto: reglas transversales obligatorias (`standards/`) y decisiones puntuales ya tomadas (`adrs/`). El grafo de conocimiento estructural (`graphify`, ver `ADR-001`) se genera en `graphify-out/` en la raíz del repo, no aquí — consultarlo en vez de leer todo el código.

Cualquier agente de IA o persona nueva en el equipo debe revisar este índice antes de proponer un cambio de arquitectura, una nueva dependencia entre módulos o una nueva herramienta de infraestructura.

## Stack del proyecto

Definido en [`ADR-003`](adrs/ADR-003-stack-quarkus-flink-embebido-nextjs.md), con la persistencia de [`ADR-004`](adrs/ADR-004-persistencia-postgresql-jdbc.md), y detallado en [`docs/specs/telemetria.md`](../docs/specs/telemetria.md):

| Capa | Tecnología |
|---|---|
| Backend | Java 17 + Quarkus 3.40 LTS (sin Spring) |
| Procesamiento | Apache Flink 2.2.1 embebido en Quarkus (sin clúster) |
| Mensajería | Apache Kafka en Docker (KRaft) |
| Frontend | React 19 + Next.js 16 + shadcn/ui + mapcn (MapLibre), axios + WebSocket |
| Simulación | Quarkus (feature `simulacion`), controlada desde el dashboard |
| Persistencia | PostgreSQL 17 con JDBC (Agroal) y Flyway, sin ORM ([`ADR-004`](adrs/ADR-004-persistencia-postgresql-jdbc.md)) |

Donde un standard muestre ejemplos de otro framework, se aplica su equivalente en Quarkus.

## Standards (`knowledge/standards/`)

Reglas obligatorias, transversales a todo el proyecto. No son opcionales salvo excepción documentada en un ADR.

| Archivo | Tema |
|---|---|
| [`STD-ARCH-001-arquitectura-por-features.md`](standards/STD-ARCH-001-arquitectura-por-features.md) | Organización por feature (backend Quarkus y frontend Next.js), `shared/` mínimo, DTOs `record` escritos a mano, prohibiciones. |
| [`STD-GIT-001-git-flow-ramas-features.md`](standards/STD-GIT-001-git-flow-ramas-features.md) | Ramas y commits (sin Pull Request/Merge Request), Definition of Done. |
| [`STD-ERR-001-manejo-de-errores-http.md`](standards/STD-ERR-001-manejo-de-errores-http.md) | Contrato de error HTTP, códigos 400/500, sanitización de logs. |

## ADRs (`knowledge/adrs/`)

Decisiones de arquitectura puntuales, declaradas de forma directa (sin opciones consideradas ni justificación extensa). Un ADR aceptado es inmutable: para cambiar una decisión se crea un ADR nuevo que reemplaza al anterior, nunca se edita retroactivamente.

| ADR | Decisión | Estado |
|---|---|---|
| [`ADR-001-graphify-knowledge-graph-memory.md`](adrs/ADR-001-graphify-knowledge-graph-memory.md) | Grafo de conocimiento local con `graphify`, para ahorrar tokens al consultar código. | Aceptado |
| [`ADR-002-nomenclatura-tablas-bd.md`](adrs/ADR-002-nomenclatura-tablas-bd.md) | Tablas de BD con prefijo `tb_` y `snake_case`; `@Table(name)` explícito en las entities. | Aceptado |
| [`ADR-003-stack-quarkus-flink-embebido-nextjs.md`](adrs/ADR-003-stack-quarkus-flink-embebido-nextjs.md) | Stack del MVP: Java 17 + Quarkus 3.40 LTS con Flink 2.2.1 embebido, Kafka en Docker, React 19 + Next.js 16 + shadcn/ui + mapcn. | Aceptado (su punto «sin persistencia» lo reemplaza ADR-004) |
| [`ADR-004-persistencia-postgresql-jdbc.md`](adrs/ADR-004-persistencia-postgresql-jdbc.md) | Última posición e historial de viajes en PostgreSQL 17 con JDBC y Flyway; consumidores que confirman offsets después del commit. | Aceptado |

## Grafo de conocimiento (`graphify-out/`, raíz del repo)

Generado por `graphify` (ver `ADR-001`). No se versiona. Un agente de IA debe consultarlo (`graphify query/path/explain`) en vez de leer todo el código, y tratarlo como más confiable que su propia inferencia sobre la estructura real del proyecto.

## Cómo agregar una nueva decisión

1. Crear `adrs/ADR-<NNN>-<slug-corto>.md` con el siguiente número correlativo, siguiendo el formato de los ADR existentes.
2. Completar todas las secciones del ADR.
3. Agregar una fila a la tabla de ADRs de este archivo.
4. Ejecutar `graphify update .` para sincronizar el grafo con la nueva decisión.
