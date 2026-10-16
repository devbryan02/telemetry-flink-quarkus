---
okf_version: 0.2
generated: 2026-10-15
verified: false
human-reviewed: false
status: REQUIRES_REVIEW
provenance: agent-generated
sources:
  - ./README.md
  - ../specs/telemetria.md
  - ../specs/persistencia-posiciones-viajes.md
  - ../../knowledge/adrs/ADR-004-persistencia-postgresql-jdbc.md
  - ../../telemetry-api/src/main/java/dev/bryan/
  - ../../telemetry-api/src/main/resources/application.properties
  - ../../dashboard-next/features/autos/
c4_level: Context
focus_id: sistema-telemetria
focus_name: Sistema de telemetría de carreras
focus_kind: system
focus_highlight: dark-red-700-border
component_path: .
---

# Revisión de la documentación

**Estado del pack:** `REQUIRES_REVIEW`. No se emite `READY_FOR_DEV`: falta la especificación OpenAPI y la revisión humana (`human-reviewed: false`).

**Actualización 2026-10-15:** el pack se actualizó para reflejar la persistencia en PostgreSQL (spec de persistencia y [`ADR-004`](../../knowledge/adrs/ADR-004-persistencia-postgresql-jdbc.md)): contenedor `postgres`, feature `viajes`, `autos` sobre `tb_ultima_posicion`, contrato v2, journey J3 y tres secuencias nuevas de `/viajes`.

## Gates de calidad

| Gate | Resultado | Detalle |
|---|---|---|
| Un foco por vista, con borde dark red 700 | ✅ con observación | Los flowcharts usan `classDef focus`. En las secuencias, Mermaid 8.10.2 no aplica el `themeCSS` del `init` ni pone `name` en `rect.actor`, así que el borde rojo solo aparece con Mermaid moderno. Como respaldo, el participante foco lleva «· foco» en su etiqueta. |
| Validación Mermaid 8.10.2 (`check_mermaid.js`) | ⚠️ pendiente | 48 bloques (24 diagramas, en `.md` y `.mmd`). En esta actualización **no se volvió a ejecutar** `check_mermaid.js` ni un render: se revisó a mano que no haya `;` en los mensajes, que todos los `classDef` tengan `fill`, `stroke` y `color` y que cada flowchart tenga ≤ 12 nodos. Las secuencias J1 (12 participantes) y las de `/viajes` son las más cargadas. |
| Coherencia Context → Container → Component → Code | ✅ | Mismas entidades en todos los niveles: sistema → `telemetry-api` (+ `postgres`) → `simulacion` (+ `autos`, `viajes`, `flink`) → `Simulador`. |
| Code respaldado por código real | ✅ | Todas las clases y módulos enlazados existen, incluidos los de `viajes/` y la migración `V1__posiciones_y_viajes.sql`. |
| Secuencias E2E por las capas reales | ✅ | J1 recorre dashboard → REST → simulación → Kafka → Flink → Kafka → consumidor → PostgreSQL → búfer de cambios → WebSocket → mapa. J3 recorre simulación → `telemetria` → `ViajesConsumer` → PostgreSQL → `GET /viajes…`. |
| Una secuencia por endpoint REST | ⚠️ `REQUIRES_REVIEW` | 10/10 operaciones cubiertas más el WebSocket, pero derivadas de los controllers (`INFERRED`). No hay `openapi:` ni `swagger:` en `telemetry-api/src/**/*.y{a,}ml`. `/q/health/*` y `/q/metrics` son de las extensiones de Quarkus y no tienen secuencia. |
| Arquitectura con fuente | ✅ | Por features (`STD-ARCH-001`, `ADR-003`); persistencia JDBC sin ORM y tablas por feature (`ADR-004`, nomenclatura `ADR-002`). No hay ports explícitos; la tabla de equivalencia de capas es `INFERRED`. |
| Seguridad | ✅ documentada | Sin autenticación ni autorización por diseño (RNF-5); CORS solo para `http://localhost:3000`. Credenciales de PostgreSQL por `.env` (no versionado; `.env.example` con un valor de ejemplo). Los errores 500 y los conflictos de ingesta no exponen SQL ni datos de conexión (`RecuperacionTest`). |
| Observabilidad | ✅ con observación | Readiness `/q/health/ready` (datasource y canales Kafka; el healthcheck de Docker la usa) y métricas Prometheus en `/q/metrics`: `viajes_eventos_{insertados,duplicados,legados,invalidos}_total`, `viajes_persistencia_fallos_total`, `autos_persistencia_fallos_total`, gauge `viajes_sin_cierre` y lag `kafka_consumer_fetch_manager_records_lag_max`. Logs de JBoss Logging con `eventId`/`viajeId` en fallos de publicación y conflictos. Sigue sin haber correlation ID HTTP de extremo a extremo; `requestId` solo en respuestas de error. |
| Errores | ✅ | Ramas `alt` con los códigos reales: `RUTA_REQUERIDA`, `RUTA_NO_ENCONTRADA`, `VELOCIDAD_INVALIDA`, `AUTO_NO_ENCONTRADO`, `INVALID_BBOX`, `CONSULTA_VIAJES_INVALIDA`, `VIAJE_NO_ENCONTRADO`, `HTTP_<status>` e `INTERNAL_ERROR`. |
| Enlaces fuente válidos | ✅ | Comprobados con un script el 2026-10-15: todos los enlaces relativos de `docs/c4/**/*.md` resuelven. `validate_c4_pack.py` pasa en `docs/c4` (8 artefactos) y `docs/c4/sequences` (11). |
| Dependencias inventadas | ✅ ninguna | PostgreSQL sale de `docker-compose.yml` y `pom.xml`; CARTO, de `components/ui/map.tsx`; OSM/OSRM, de la spec §5, marcado como fuente no runtime. |
| Ubicación | ✅ | `docs/c4/` (PRODUCT_MODE, sin `component_path`, directorio de documentación del proyecto). |

## Divergencias encontradas

Las 1–3 se corrigieron al cerrar el incremento 08; las demás quedan abiertas.

1. ✅ *Corregida.* **Spec de persistencia desactualizada en su encabezado:** dice «propuesta para revisión; no implementada» y su §2 describe el estado anterior (`ConcurrentHashMap`, `ReconstruirEstadoListener`, `failure-strategy=ignore`). El código ya la implementa.
2. ✅ *Corregida.* **Spec base §12 (Ejecución) desactualizada:** el diagrama y la tabla no incluyen `postgres` ni el volumen `postgres-datos`; el healthcheck de la API ya no es `GET /rutas` sino `GET /q/health/ready`; la nota de persistencia dice que «la API reconstruye su estado al arrancar»; el árbol no tiene `viajes/`, `db/migration/` ni, en `autos/`, `Bbox`, `AutoEvento`, `AutosCambios` y `EventoJson`; en `flink/` faltan `PosicionJson` y `EventoJson`; en el dashboard, `geojson.ts`, `metricas.ts` y `autos-dashboard.tsx`.
3. ✅ *Corregida.* **`application.properties`:** en el canal `ultima-posicion` sigue `auto.commit.interval.ms=200` con un comentario sobre confirmar offsets cada 200 ms, pero `enable.auto.commit=false` lo deja sin efecto. El comentario «Simulación (feature simulacion): publica en telemetria» quedó encima de la configuración del canal `historial-telemetria`.
4. **Código que solo usan las pruebas:** `AutoDeserializer` (el canal usa `AutoEventoDeserializer`), `Bbox.contiene` (el filtro ahora es SQL) y `AutosStore.tamanio`.
5. **`EventoJson` triplicado:** la misma validación está copiada en `autos`, `flink` y `viajes`. Es coherente con la regla de no acoplar features, pero cualquier cambio del contrato hay que replicarlo en las tres.
6. **Javadoc de `Auto`** habla de "autos particulares" con `companyId` y `fleetId` `null`; el escenario actual (`carrera.json`) solo tiene autos de empresa. El tipo y las tablas lo admiten, pero no se ejerce.
7. **`CatalogoRutas`:** si falta `rutas/indice.json` responde 404 `RUTA_NO_ENCONTRADA` y no 500, porque reutiliza `noEncontrada`.
8. **Latencia p95 (criterio 6)** no se volvió a medir tras pasar el consumidor a `@Blocking` con JDBC.

## Pendiente para `READY_FOR_DEV`

- [ ] Revisión humana identificada del pack.
- [ ] Decidir si se publica una especificación OpenAPI (p. ej. con `quarkus-smallrye-openapi`) o se acepta formalmente la derivación desde los controllers.
- [ ] Volver a ejecutar la validación Mermaid 8.10.2 (`check_mermaid.js`) sobre el pack actualizado.
- [ ] Opcional: corregir las divergencias 1–6 y medir de nuevo la latencia p95.
