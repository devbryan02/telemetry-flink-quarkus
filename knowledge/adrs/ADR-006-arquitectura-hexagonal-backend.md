# ADR-006: Arquitectura hexagonal en el backend

**Estado:** Aceptado · **Fecha:** 2026-11-15 · **Reemplaza:** la sección «Backend (Quarkus)» de `STD-ARCH-001` (la sección Frontend sigue vigente)

El backend (`telemetry-api`) pasa de organizarse por feature a **capas hexagonales** (puertos y adaptadores) en la raíz de `dev.bryan`:

```text
dev.bryan
├── domain/           modelo y reglas puras (records, cálculos, excepciones de negocio)
├── application/
│   ├── port/in/      casos de uso que ofrece el núcleo
│   ├── port/out/     lo que el núcleo necesita del exterior (repositorios, publicación, catálogo, reloj)
│   └── service/      implementación de los casos de uso
└── infrastructure/
    ├── in/           rest, ws, messaging (adaptadores de entrada)
    ├── out/          persistence, kafka, ws, classpath, metrics, vertx (adaptadores de salida)
    └── flink/        job Flink embebido (operadores serializables)
```

Reglas:

- **Dependencias hacia adentro:** `infrastructure` → `application` → `domain`. `domain` y `application` no importan `jakarta.*`, `io.quarkus.*`, `io.vertx.*`, `org.apache.flink.*`, `java.sql.*` ni `javax.sql.*`.
- **Los puertos nacen de una necesidad real** (aislar I/O o probar el núcleo sin infraestructura), no «por si acaso».
- **Los adaptadores son package-private** salvo lo que Quarkus necesite ver (recursos REST, `AutosWs`, deserializadores referenciados por nombre).
- **Las features siguen sin llamarse por dentro:** `simulacion`, `flink`, `autos` y `viajes` se comunican por los topics `telemetria` y `ultima-posicion`. Cada una conserva su propio record del evento y su copia de `EventoJson`, ahora en `infrastructure/in/messaging` (o `infrastructure/flink`).
- **Flink sigue siendo un adaptador autocontenido:** `Posicion` y sus (de)serializadores viven en `infrastructure/flink`, sin CDI ni referencias a clases no serializables.
- **El contrato HTTP no cambia:** `NegocioException` usa un `Tipo` independiente de JAX-RS y `GlobalExceptionMapper` lo traduce al mismo cuerpo de error (`STD-ERR-001`).
- **Transacciones en el adaptador:** la ingesta de `viajes` (bloqueos `FOR UPDATE`, detección de conflictos, `eventId` idempotente) y el commit previo al ack de Kafka siguen dentro del adaptador de persistencia; el puerto solo expone `guardarLote`.
- **Se verifica con una prueba:** `ArquitecturaHexagonalTest` (ArchUnit) falla si se rompe la dirección de las dependencias.

Sin cambios: contrato JSON de `/autos`, WebSocket y `/viajes`, nombres de topics y canales, propiedades de configuración, migraciones Flyway y tablas (`ADR-002`, `ADR-004`).

Decisiones que se mantienen del estándar anterior:

- **Los DTOs son `record` escritos a mano.** No se instala **Lombok**: los records ya aportan constructor, accesores, `equals` y `toString`, y las herramientas de generación de DTOs siguen prohibidas.
- **Prohibido** organizar por capas dentro de una feature del frontend, acceder a internos de otra feature, poner credenciales en el repositorio y exponer excepciones internas al cliente.

Costes que se aceptan:

- Más ficheros y más indirección (puertos e interfaces) que con el diseño anterior; se compensa con núcleo probable sin Quarkus ni base de datos.
- Un refactor grande de paquetes: los tests se mueven a paquetes espejo y varios tipos pasan de package-private a `public` en `domain/` y `application/port`.
