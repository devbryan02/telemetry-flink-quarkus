---
okf_version: 0.2
generated: 2026-11-16
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ../../src/main/java/dev/bryan/
  - ../../src/test/java/dev/bryan/
  - ../../../knowledge/adrs/ADR-006-arquitectura-hexagonal-backend.md
  - ../../../knowledge/adrs/ADR-007-persistencia-hibernate-panache.md
c4_level: Sequence
focus_id: telemetry-api-trazabilidad
focus_name: telemetry-api
focus_kind: system
focus_highlight: dark-red-700-border
component_path: telemetry-api
---

# Reporte de trazabilidad

No hay specs ni criterios de aceptación formales (se eliminaron con `docs/`). La trazabilidad parte del **comportamiento observable en el código** y de las decisiones de [`CLAUDE.md`](../../../CLAUDE.md) y los ADR.

## Comportamiento → código → pruebas → vistas

| Comportamiento | Código | Pruebas | Vistas |
|---|---|---|---|
| Solo gana el `ts` mayor por auto; los escritores concurrentes no retroceden | `AutosStore` (upsert nativo) | AutosStoreTest | component, ws-autos |
| Un lote fallido no confirma offsets ni publica cambios | `IngestaAutosService`, `AutosConsumer` | AutosConsumerTest | ws-autos |
| El historial es idempotente por `eventId` y guarda las muestras atrasadas | `ViajesStore`, `IngestaViajesService` | ViajesStoreTest, ViajesConsumerTest | consumo-historial-viajes |
| Un evento inválido o un conflicto detiene el canal y deja la readiness en DOWN | `failure-strategy=fail`, `EventoViajeFailureHandler` | RecuperacionTest, ViajesMetricasTest | consumo-historial-viajes |
| Los errores de BD no exponen SQL ni credenciales y llevan `requestId` | `GlobalExceptionMapper`, adaptadores de persistencia | RecuperacionTest, AutosStoreTest | todas las secuencias REST |
| El detalle del viaje usa una vista consistente y no deja conexiones en solo lectura | `ViajesConsulta.detalle` | ViajeDetalleTest | get-viajes-viajeid |
| La paginación por cursor está ligada a filtros y límite | `CursorViajes`, `ViajesConsulta` | CursorViajesTest, ViajesResourceTest | get-viajes, get-viajes-viajeid-posiciones |
| La velocidad se acota a 10 a 500 km/h y el auto debe existir | `AutoCorredor`, `SimulacionService` | AutoCorredorTest, SimulacionResourceTest | put-simulacion-autos-carid-velocidad |
| La ruta se valida con un patrón y no admite `..` | `CatalogoRutasClasspath` | SimulacionResourceTest | get-rutas-id |
| La carrera abre, avanza y cierra viajes con `INICIO`, `POSICION` y `FIN` | `SimulacionService`, `RelojEventos` | SimuladorViajesTest, RelojEventosTest | post-simulacion-iniciar, sequence-e2e |
| Las dependencias apuntan hacia adentro y Hibernate solo vive en `out.persistence` | todo el backend | ArquitecturaHexagonalTest (7 reglas) | component |
| El esquema de las entities coincide con Flyway | entities + `V1__posiciones_y_viajes.sql` | MigracionesTest y el arranque con `validate` | container |

## Evidencia disponible

- Suite de `telemetry-api`: 79 pruebas, 0 fallos ni errores, ejecutada sobre un clon limpio de la rama `inc-26` el 2026-11-16 (`./mvnw test`, PostgreSQL de Dev Services). No se volvió a ejecutar sobre el estado final de este pack, que no cambia código.
- Sin pruebas de carga ni medición de latencia en este pack.

## Endpoints → secuencias

Ver el índice de cobertura en [sequence-e2e.md](sequence-e2e.md).
